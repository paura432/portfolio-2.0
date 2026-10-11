"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ExtrudeGeometry, Object3D, Shape, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { WATER_LEVEL } from "@/data/archipelago";
import { inputState } from "@/game/controls/input";
import { heightAt, oceanClock, shoreDamp } from "@/game/ocean/waves";
import { boatWake, wakeStrength } from "@/game/ocean/wake";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { BOAT_CONFIG, boatSpeed, createBoatState, forwardSpeed, stepBoat } from "@/game/vehicle/boatPhysics";
import { liveBoat } from "@/game/vehicle/boatState";
import { dampTo as floatDamp, FLOAT_VISUAL, floatPose, planingPitch, turnRoll } from "@/game/vehicle/buoyancy";
import { createCarState, stepCar, type Constrain } from "@/game/vehicle/carPhysics";
import { liveCar } from "@/game/vehicle/carState";
import { dampTo, isBraking, targetPitch, targetRoll, VISUAL_CONFIG } from "@/game/vehicle/carVisual";
import { liveVehicle } from "@/game/vehicle/liveVehicle";
import { stepPlane } from "@/game/vehicle/planePhysics";
import { terrainAt } from "@/game/vehicle/landing";
import { rampStep } from "@/game/vehicle/rampRun";
import { livePlane } from "@/game/vehicle/planeState";
import { transformStages } from "@/game/vehicle/transform";
import {
  authorityOf,
  BOAT_ENTER_DEPTH,
  boatVelocityFromCar,
  carSpeedFromBoat,
  hopVelocity,
  LANDING_ROLL_SPEED,
  launchPose,
  partsProgress,
  shoreDecision,
  stepHop,
  TAKEOFF_SPEED,
} from "@/game/vehicle/transformer";
import { canControl } from "@/game/vehicle/vehicleManager";
import { sampleGround, seawardSpeedAt, shoreDistanceAt } from "@/game/world/ground";
import { impactBus } from "@/game/world/impactBus";
import { constrainCar } from "@/game/world/obstacles";
import { constrainRampBodies } from "@/game/world/rampColliders";
import { constrainBoat, openWaterDirection } from "@/game/world/seaObstacles";
import { treeWorld } from "@/game/world/treeWorld";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "./materials";
import { StaticBatch } from "./StaticBatch";

const WHEEL_RADIUS = 0.38;
const WHEEL_X = 0.98;
const WHEEL_FRONT_Z = 1.32;
const WHEEL_REAR_Z = -1.3;
const BODY_WIDTH = 1.86;
const CABIN_WIDTH = 1.62;

/** AERO-X flight parts (V7). The wing root sits on the belt line; folded, the wing lies along the flank pointing aft. */
const WING_SPAN = 3.4;
const WING_CHORD = 1.1;
const WING_ROOT = { x: BODY_WIDTH / 2 - 0.02, y: 0.92, z: 0.35 };
const WING_FOLDED = Math.PI / 2 - 0.1;
const WING_SWEEP = 0.22;
const WHEEL_TUCK = 0.3;

/** Side profile (x = length along the car, +x is the front; y = height). Extruded along the car width. */
function profile(points: [number, number][]): Shape {
  const s = new Shape();
  const [first, ...rest] = points;
  if (!first) return s;
  s.moveTo(first[0], first[1]);
  for (const [x, y] of rest) s.lineTo(x, y);
  s.closePath();
  return s;
}

function extrude(shape: Shape, width: number, bevel: number): ExtrudeGeometry {
  const g = new ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // Centre on the width axis; the mesh is rotated so this axis becomes world X.
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

/** Lower body shell: bumpers, belt line, sloped hood, short rear deck. */
const BODY_PROFILE: [number, number][] = [
  [-2.0, 0.34],
  [-2.1, 0.5],
  [-2.08, 0.86],
  [-1.85, 0.98],
  [-0.9, 1.0],
  [0.55, 0.98],
  [1.7, 0.8],
  [2.06, 0.72],
  [2.12, 0.5],
  [2.0, 0.34],
];

/** Greenhouse: fast windshield, short roof, rear glass. Sits on the belt line. */
const CABIN_PROFILE: [number, number][] = [
  [-1.55, 0.96],
  [-0.95, 1.38],
  [0.3, 1.42],
  [1.0, 0.97],
];

/** Wing plan (x = span outward from the root, y = chord along the car): tapered, swept trailing edge. */
const WING_PLAN: [number, number][] = [
  [0, WING_CHORD / 2],
  [WING_SPAN, WING_CHORD * 0.22],
  [WING_SPAN, -WING_CHORD * 0.28],
  [0, -WING_CHORD / 2],
];

function wingGeometry(mirror: boolean): ExtrudeGeometry {
  const shape = profile(WING_PLAN.map(([x, y]) => [mirror ? -x : x, y] as [number, number]));
  const g = new ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 1 });
  // Shape lies in XY with the chord along Y; rotate so the chord runs along the car (Z) and the thickness is up (Y).
  g.rotateX(-Math.PI / 2);
  g.translate(0, -0.035, 0);
  g.computeVertexNormals();
  return g;
}

/** How far the car body sinks when it floats (the wheels tuck, the floats take the waterline). */
const BOAT_SINK = 0.5;
const IDLE = { throttle: 0, steer: 0, brake: false } as const;

/** Car constraint: buildings, drive areas, trees, plus the bodies of the ramps that are not being climbed. */
const constrainVehicle: Constrain = (x, z, step) => {
  const c = constrainCar(x, z, step);
  const r = constrainRampBodies(c.x, c.z, step?.prevX ?? c.x, step?.prevZ ?? c.z);
  return r.blocked ? { x: r.x, z: r.z, blocked: true } : c;
};

/**
 * PAU TRANSFORMER-X (V8): one orange car that becomes an aircraft off a ramp
 * and a boat off a beach. One mesh: the car body with the AERO-X flight parts
 * (wings, stabiliser, fins, thruster, lights) and the marine parts (side
 * floats, keel plate, jet) folded into it, animated from the state's parts
 * progress. One frame loop: the physics model named by the state owns the
 * position (car, boat or flight), and the ramp / shore / landing rules move
 * the state machine through the store.
 */
export function Vehicle() {
  const m = getMaterials();
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const frontLeft = useRef<Group>(null);
  const frontRight = useRef<Group>(null);
  const rearLeft = useRef<Group>(null);
  const rearRight = useRef<Group>(null);
  const wheels = useRef<Mesh[]>([]);
  const tail = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const wingL = useRef<Group>(null);
  const wingR = useRef<Group>(null);
  const panelL = useRef<Mesh>(null);
  const panelR = useRef<Mesh>(null);
  const stabiliser = useRef<Mesh>(null);
  const finL = useRef<Group>(null);
  const finR = useRef<Group>(null);
  const thruster = useRef<Group>(null);
  const thrusterCore = useRef<Mesh>(null);
  const navLights = useRef<Group>(null);
  const floatL = useRef<Group>(null);
  const floatR = useRef<Group>(null);
  const keel = useRef<Group>(null);
  const jet = useRef<Group>(null);
  const jetCore = useRef<Mesh>(null);
  const prevSpeed = useRef(0);
  const accelSmooth = useRef(0);
  const pose = useRef({ roll: 0, pitch: 0 });
  const floatY = useRef(0);
  const stuck = useRef(0);
  const jolt = useRef(0);
  const noticeAt = useRef(-10);
  const landingT = useRef(0);
  const quality = useGameStore((s) => s.quality);
  const profileQ = QUALITY_PROFILES[quality];

  const headlightTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(0, 0, 14);
    return o;
  }, []);
  const bodyGeometry = useMemo(() => extrude(profile(BODY_PROFILE), BODY_WIDTH, 0.06), []);
  const cabinGeometry = useMemo(() => extrude(profile(CABIN_PROFILE), CABIN_WIDTH, 0.04), []);
  const wingGeoR = useMemo(() => wingGeometry(false), []);
  const wingGeoL = useMemo(() => wingGeometry(true), []);
  const coreMaterial = useMemo(() => m.lightCyanSoft.clone(), [m]);
  const jetMaterial = useMemo(() => m.lightCyan.clone(), [m]);

  useFrame(({ clock }, delta) => {
    const store = useGameStore.getState();
    const dt = Math.min(delta, 0.1);
    const state = store.vehicleState;
    const authority = authorityOf(state);
    const driving = canControl(store.phase, store);
    const input = driving ? inputState.drive : IDLE;
    const t = oceanClock.time;
    const g = group.current;
    const notice = (text: string, gap = 3) => {
      if (clock.elapsedTime - noticeAt.current > gap) {
        noticeAt.current = clock.elapsedTime;
        store.noteVehicle(text);
      }
    };
    if (store.phase === "playing") liveVehicle.sinceTransform += dt;

    let px = 0;
    let py = 0;
    let pz = 0;
    let heading = 0;
    let bodyPitch = 0;
    let bodyRoll = 0;
    let wheelSpin = 0;
    let steerAngle = 0;
    let braking = false;

    if (authority === "car") {
      // ---- Ground body: the arcade car on a height field (ramps, beaches), with a vertical model for hops.
      const next = driving
        ? stepCar(liveCar.state, input, delta, undefined, constrainVehicle)
        : liveCar.state.speed === 0 && liveCar.state.steerAngle === 0
          ? liveCar.state
          : { ...liveCar.state, speed: 0, steerAngle: 0 };
      liveCar.state = next;
      const gs = sampleGround(next.x, next.z, next.heading);
      // Ramp logic (shared with the per-ramp unit tests): slope under the car, lip crossing, the ramp rule.
      const parts = partsProgress(state, liveVehicle.clock.t, liveVehicle.clock.duration);
      const rs = rampStep({ x: next.x, z: next.z, heading: next.heading, speed: next.speed, state, onRamp: liveVehicle.onRamp, wings: parts.wings, sinceLast: liveVehicle.sinceTransform });
      liveVehicle.onRamp = rs.onRamp;
      const { pastLip, lipSlope, corridor } = rs;
      // Vertical model: follow the ground; when it drops away (a lip, an edge) the body is airborne until it lands.
      if (!liveVehicle.airborne) {
        if (pastLip || liveVehicle.y > gs.y + 0.6) {
          liveVehicle.airborne = true;
          liveVehicle.vy = hopVelocity(next.speed, pastLip ? lipSlope : Math.max(0, liveVehicle.groundPitch));
        } else {
          liveVehicle.y = gs.y;
          liveVehicle.groundPitch = dampTo(liveVehicle.groundPitch, gs.slope, 14, dt);
        }
      }
      if (liveVehicle.airborne && store.phase === "playing") {
        const h = stepHop(liveVehicle.y, liveVehicle.vy, gs.y, dt);
        liveVehicle.y = h.y;
        liveVehicle.vy = h.vy;
        liveVehicle.groundPitch = dampTo(liveVehicle.groundPitch, Math.max(-0.3, Math.min(0.25, liveVehicle.vy * 0.05)), 4, dt);
        if (h.landed) {
          liveVehicle.airborne = false;
          jolt.current = Math.min(1, jolt.current + 0.4);
        }
      }

      // Ramp rule.
      const decision = store.phase === "playing" ? rs.decision : null;
      if (decision === "prepare") store.setVehicleState("preparing-flight");
      else if (decision === "clear") store.setVehicleState("car");
      else if (decision === "deploy") store.setVehicleState("transforming-to-plane");
      else if (decision === "abort") {
        if (store.setVehicleState("transforming-to-car")) notice(pastLip ? (next.speed < TAKEOFF_SPEED ? "Too slow to take off" : "Wings were not out in time") : "Takeoff aborted: keep speed up the ramp");
      } else if (decision === "launch") {
        const lp = launchPose(next.speed, lipSlope);
        livePlane.state = { x: next.x, y: liveVehicle.y, z: next.z, heading: next.heading, pitch: lp.pitch, roll: 0, speed: lp.speed, onGround: false, throttle: 1, stalled: false };
        liveVehicle.airborne = false;
        liveVehicle.vy = 0;
        liveVehicle.sinceTransform = 0;
        store.setVehicleState("flying");
        notice("Airborne");
      } else if (decision === "hop" && state === "car" && next.speed > 3) notice("Too slow to take off");
      store.setNearbyRamp(corridor?.id ?? null);

      // Landing roll-out: the wings fold once the roll has slowed (or after a short while).
      if (state === "landing") {
        landingT.current += dt;
        if (Math.abs(next.speed) < LANDING_ROLL_SPEED || landingT.current > 1.4) store.setVehicleState("transforming-to-car");
      } else landingT.current = 0;

      // Shore rule (V9: from the slope under the car, not from a beach list): a car driving into the sea becomes a boat.
      const beach = gs.beach;
      const seawardSpeed = gs.shore ? seawardSpeedAt(next.x, next.z, Math.sin(next.heading) * next.speed, Math.cos(next.heading) * next.speed) : 0;
      const sd = store.phase === "playing" && !liveVehicle.airborne ? shoreDecision({ state, depth: gs.depth, seawardSpeed, onShore: gs.shore, sinceLast: liveVehicle.sinceTransform }) : null;
      if (sd === "to-boat") {
        liveBoat.state = { ...createBoatState(next.x, next.z, next.heading), ...boatVelocityFromCar(next.speed, next.heading), throttle: Math.max(0, input.throttle) };
        liveBoat.visual.y = liveVehicle.y - WATER_LEVEL + BOAT_SINK;
        floatY.current = liveVehicle.y;
        if (store.setVehicleState("transforming-to-boat")) notice("Setting sail");
      }
      store.setNearbyBeach(beach?.id ?? null);

      // Pose.
      px = next.x;
      pz = next.z;
      heading = next.heading;
      wheelSpin = liveVehicle.airborne ? (next.speed * dt) / WHEEL_RADIUS * 0.3 : (next.speed * dt) / WHEEL_RADIUS;
      steerAngle = next.steerAngle;
      const accel = dt > 0 ? (next.speed - prevSpeed.current) / dt : 0;
      prevSpeed.current = next.speed;
      accelSmooth.current = dampTo(accelSmooth.current, accel, 10, dt);
      pose.current.roll = dampTo(pose.current.roll, targetRoll(next), VISUAL_CONFIG.rollLambda, dt);
      pose.current.pitch = dampTo(pose.current.pitch, targetPitch(accelSmooth.current), VISUAL_CONFIG.pitchLambda, dt);
      // Leaving the water: the body rises from the float height to the sand over the sequence.
      if (state === "exiting-water") {
        const u = liveVehicle.progress();
        py = floatY.current + (liveVehicle.y - floatY.current) * u;
      } else py = liveVehicle.y;
      bodyPitch = pose.current.pitch - liveVehicle.groundPitch;
      bodyRoll = pose.current.roll;
      braking = driving && !liveVehicle.airborne && isBraking(next, accelSmooth.current, input.brake);
      if (shadow.current) shadow.current.visible = !liveVehicle.airborne && state !== "exiting-water";
    } else if (authority === "boat") {
      // ---- Hull: the V6 boat model (velocity, drag, drift), the sea colliders, buoyancy on the shared wave function.
      if (!driving && store.mooredAt && store.phase === "playing" && !store.transition && inputState.drive.throttle !== 0) store.castOff();
      const prev = liveBoat.state;
      let next = prev;
      if (driving) {
        next = stepBoat(prev, input, delta, undefined, constrainBoat);
        if (next.bump > 0 && boatSpeed(next) < 0.6) stuck.current += dt;
        else if (boatSpeed(next) > 1) stuck.current = 0;
        if (stuck.current > 2) {
          const [dx, dz] = openWaterDirection(next.x, next.z);
          next = { ...next, x: next.x + dx * 0.8, z: next.z + dz * 0.8, vx: 0, vz: 0 };
          stuck.current = 0;
        }
        if (next.bump > 0.5) jolt.current = Math.min(1, jolt.current + next.bump * 0.12);
      } else if (!store.transition && (prev.vx !== 0 || prev.vz !== 0 || prev.yawRate !== 0)) {
        next = { ...prev, vx: 0, vz: 0, yawRate: 0, throttle: 0, bump: 0 };
      }
      liveBoat.state = next;
      const fp = floatPose(next.x, next.z, next.heading, (x, z) => heightAt(x, z, t, shoreDamp(shoreDistanceAt(x, z))));
      const vf = forwardSpeed(next);
      const v = liveBoat.visual;
      v.y = floatDamp(v.y, fp.y + FLOAT_VISUAL.freeboard, FLOAT_VISUAL.heightLambda, dt);
      v.pitch = floatDamp(v.pitch, fp.pitch + planingPitch(vf, next.throttle, BOAT_CONFIG.maxSpeed), FLOAT_VISUAL.angleLambda, dt);
      v.roll = floatDamp(v.roll, fp.roll + turnRoll(vf, next.rudder, BOAT_CONFIG.maxSpeed), FLOAT_VISUAL.angleLambda, dt);
      // Wake from the stern once the hull is out.
      const parts = partsProgress(state, liveVehicle.clock.t, liveVehicle.clock.duration);
      const sx = next.x - Math.sin(next.heading) * 2.4;
      const sz = next.z - Math.cos(next.heading) * 2.4;
      boatWake.record(sx, sz, t, (driving || store.transition) && parts.floats > 0.4 ? wakeStrength(vf, next.throttle, BOAT_CONFIG.maxSpeed) : 0);

      // Shore rule: sailing up any shore brings the wheels down.
      const gs = sampleGround(next.x, next.z, next.heading);
      const beach = gs.beach;
      const seawardSpeed = gs.shore ? seawardSpeedAt(next.x, next.z, next.vx, next.vz) : 0;
      const sd = store.phase === "playing" && !store.mooredAt && !store.transition ? shoreDecision({ state, depth: gs.depth, seawardSpeed, onShore: gs.shore, sinceLast: liveVehicle.sinceTransform }) : null;
      const waterY = WATER_LEVEL + v.y - BOAT_SINK;
      if (sd === "to-car") {
        liveCar.state = { ...createCarState(next.x, next.z, next.heading), speed: carSpeedFromBoat(next.vx, next.vz, next.heading) };
        liveVehicle.y = gs.y;
        liveVehicle.airborne = false;
        liveVehicle.vy = 0;
        liveVehicle.groundPitch = 0;
        floatY.current = waterY;
        if (store.setVehicleState("exiting-water")) notice("Wheels down");
      }
      store.setNearbyBeach(beach?.id ?? null);
      store.setNearbyRamp(null);

      // Pose: entering the sea the body sinks from the sand to the waterline over the sequence.
      px = next.x;
      pz = next.z;
      heading = next.heading;
      if (state === "transforming-to-boat") {
        const u = liveVehicle.progress();
        py = floatY.current + (waterY - floatY.current) * u;
      } else py = waterY;
      bodyPitch = -v.pitch;
      bodyRoll = v.roll;
      wheelSpin = 0;
      steerAngle = next.rudder * 0.35;
      prevSpeed.current = vf;
      if (shadow.current) shadow.current.visible = false;
    } else {
      // ---- Aircraft: the V7 flight model; the ground under it decides between a landing roll and a splashdown.
      if (driving) {
        const r = stepPlane(livePlane.state, inputState.drive, delta, terrainAt);
        livePlane.state = r.state;
        if (r.touchedDown) {
          const p = r.state;
          const gs = sampleGround(p.x, p.z, p.heading);
          if (gs.depth > BOAT_ENTER_DEPTH) {
            liveBoat.state = { ...createBoatState(p.x, p.z, p.heading), ...boatVelocityFromCar(Math.min(p.speed, BOAT_CONFIG.maxSpeed), p.heading), throttle: 0 };
            liveBoat.visual.y = 0;
            floatY.current = p.y;
            liveVehicle.sinceTransform = 0;
            if (store.setVehicleState("transforming-to-boat")) notice("Splashdown: hull out");
          } else {
            liveCar.state = { ...createCarState(p.x, p.z, p.heading), speed: Math.min(p.speed, 20) };
            liveVehicle.y = gs.y;
            liveVehicle.airborne = false;
            liveVehicle.vy = 0;
            liveVehicle.groundPitch = gs.slope;
            liveVehicle.sinceTransform = 0;
            jolt.current = Math.min(1, jolt.current + 0.5);
            if (store.setVehicleState("landing")) notice("Touchdown");
          }
        }
        if (r.floorHit) notice("Too low here: find open ground or water", 4);
      }
      const p = livePlane.state;
      px = p.x;
      py = p.y;
      pz = p.z;
      heading = p.heading;
      pose.current.roll = dampTo(pose.current.roll, -p.roll, 6, dt);
      pose.current.pitch = dampTo(pose.current.pitch, -p.pitch, 6, dt);
      bodyPitch = pose.current.pitch;
      bodyRoll = pose.current.roll;
      wheelSpin = 0;
      prevSpeed.current = p.speed;
      store.setNearbyRamp(null);
      if (shadow.current) shadow.current.visible = false;
    }

    jolt.current = Math.max(0, jolt.current - dt * 2.2);
    if (!g) return;
    g.position.set(px, py, pz);
    g.rotation.set(0, heading, 0);
    for (const w of wheels.current) w.rotation.x += wheelSpin;
    if (frontLeft.current) frontLeft.current.rotation.y = steerAngle;
    if (frontRight.current) frontRight.current.rotation.y = steerAngle;
    if (body.current) {
      const j = treeWorld.reducedMotion ? 0 : Math.max(impactBus.jolt.strength, jolt.current);
      const ct = clock.elapsedTime;
      body.current.rotation.z = bodyRoll + j * 0.07 * Math.sin(ct * 46);
      body.current.rotation.x = bodyPitch + j * 0.04 * (1 + Math.sin(ct * 31));
      body.current.position.y = j * 0.03 * Math.abs(Math.sin(ct * 40));
    }
    if (tail.current) (tail.current.material as MeshStandardMaterial).emissiveIntensity = braking ? 2.4 : 0.9;

    // ---- Parts: one progress per body, staged.
    const parts = partsProgress(state, liveVehicle.clock.t, liveVehicle.clock.duration);
    const st = transformStages(parts.wings);
    if (wingR.current) wingR.current.rotation.y = WING_FOLDED + (WING_SWEEP - WING_FOLDED) * st.wings;
    if (wingL.current) wingL.current.rotation.y = -(WING_FOLDED + (WING_SWEEP - WING_FOLDED) * st.wings);
    const panelOut = Math.max(st.panels, parts.floats);
    if (panelR.current) panelR.current.position.set(BODY_WIDTH / 2 + 0.03 + 0.12 * panelOut, 0.62 - 0.18 * panelOut, 0.35);
    if (panelL.current) panelL.current.position.set(-(BODY_WIDTH / 2 + 0.03 + 0.12 * panelOut), 0.62 - 0.18 * panelOut, 0.35);
    if (stabiliser.current) {
      stabiliser.current.scale.set(0.55 + 0.45 * st.tail, 1, 1);
      stabiliser.current.position.y = 1.0 + 0.42 * st.tail;
    }
    const finAngle = (Math.PI / 2) * (1 - st.tail);
    if (finL.current) finL.current.rotation.x = finAngle;
    if (finR.current) finR.current.rotation.x = finAngle;
    const tuck = -WHEEL_TUCK * Math.max(st.wheels, parts.floats * 0.8);
    for (const w of [frontLeft, frontRight, rearLeft, rearRight]) if (w.current) w.current.position.y = WHEEL_RADIUS + tuck;
    if (thruster.current) {
      thruster.current.visible = st.thruster > 0.02;
      const s = 0.2 + 0.8 * st.thruster;
      thruster.current.scale.set(s, s, s);
    }
    if (thrusterCore.current) {
      const throttle = authority === "plane" ? livePlane.state.throttle : 0;
      (thrusterCore.current.material as MeshStandardMaterial).emissiveIntensity = 0.6 + 1.6 * throttle + 0.3 * Math.sin(clock.elapsedTime * 18) * throttle;
    }
    if (navLights.current) navLights.current.visible = st.thruster > 0.5;
    // Marine parts: floats swing down and out from the sills, the keel plate drops, the jet ring appears.
    const fl = parts.floats;
    const floatEase = fl * fl * (3 - 2 * fl);
    if (floatR.current) {
      floatR.current.rotation.z = -1.25 * floatEase;
      floatR.current.position.set(BODY_WIDTH / 2 + 0.02 + 0.08 * floatEase, 0.78, -0.15);
    }
    if (floatL.current) {
      floatL.current.rotation.z = 1.25 * floatEase;
      floatL.current.position.set(-(BODY_WIDTH / 2 + 0.02 + 0.08 * floatEase), 0.78, -0.15);
    }
    if (keel.current) keel.current.position.y = 0.3 - 0.32 * floatEase;
    if (jet.current) {
      jet.current.visible = fl > 0.02;
      const s = 0.3 + 0.7 * floatEase;
      jet.current.scale.set(s, s, s);
    }
    if (jetCore.current) {
      const throttle = authority === "boat" ? liveBoat.state.throttle : 0;
      (jetCore.current.material as MeshStandardMaterial).emissiveIntensity = 0.5 + 1.8 * throttle;
    }
    const inTransform = state === "transforming-to-plane" || state === "transforming-to-car" || state === "transforming-to-boat" || state === "exiting-water";
    if (inTransform && body.current && !treeWorld.reducedMotion) {
      const u = liveVehicle.progress();
      body.current.position.y += 0.012 * Math.sin(clock.elapsedTime * 50) * Math.sin(u * Math.PI);
    }
  }, -3);

  const addWheel = (mesh: Mesh | null) => {
    if (mesh && !wheels.current.includes(mesh)) wheels.current.push(mesh);
  };

  const wheel = (side: 1 | -1) => (
    <group rotation={[0, 0, Math.PI / 2]}>
      {/* Tyre */}
      <mesh ref={addWheel} material={m.tire} castShadow>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.3, 16]} />
        {/* Rim: a pentagon so rotation is readable; hub cap in the centre */}
        <mesh material={m.carRim} position={[0, -side * 0.03, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.26, 5]} />
        </mesh>
        <mesh material={m.carUnder} position={[0, -side * 0.1, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.14, 8]} />
        </mesh>
      </mesh>
    </group>
  );

  const arch = (x: number, z: number) => (
    <mesh material={m.carUnder} position={[x, WHEEL_RADIUS + 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.52, 0.52, 0.12, 12]} />
    </mesh>
  );

  /** One wing: tapered plank, cyan leading strip, winglet and navigation light at the tip. */
  const wing = (side: 1 | -1) => (
    <group ref={side > 0 ? wingR : wingL} position={[side * WING_ROOT.x, WING_ROOT.y, WING_ROOT.z]} rotation={[0, side * WING_FOLDED, 0]} userData={{ dynamic: true }}>
      <mesh geometry={side > 0 ? wingGeoR : wingGeoL} material={m.carBody} castShadow userData={{ dynamic: true }} />
      <mesh material={m.lightCyanSoft} position={[side * (WING_SPAN / 2), 0.01, WING_CHORD * 0.42]} rotation={[0, side * -0.06, 0]} userData={{ dynamic: true }}>
        <boxGeometry args={[WING_SPAN * 0.92, 0.03, 0.05]} />
      </mesh>
      <mesh material={m.carBodyDark} position={[side * (WING_SPAN - 0.05), 0.22, -0.1]} rotation={[0, 0, side * -0.25]} userData={{ dynamic: true }}>
        <boxGeometry args={[0.05, 0.48, 0.5]} />
      </mesh>
    </group>
  );

  return (
    <group ref={group} position={[liveCar.state.x, 0, liveCar.state.z]} rotation={[0, liveCar.state.heading, 0]}>
      <group ref={body}>
        <StaticBatch>
          {/* Body shell and greenhouse (extruded side profiles) */}
          <mesh geometry={bodyGeometry} material={m.carBody} rotation={[0, -Math.PI / 2, 0]} castShadow />
          <mesh geometry={cabinGeometry} material={m.carGlass} rotation={[0, -Math.PI / 2, 0]} castShadow />
          {/* Roof panel and pillars in body colour so the glass reads as windows */}
          <mesh material={m.carBody} position={[0, 1.43, -0.33]}>
            <boxGeometry args={[CABIN_WIDTH - 0.1, 0.05, 1.18]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh material={m.carBodyDark} position={[s * (CABIN_WIDTH / 2 - 0.01), 1.19, 0.65]} rotation={[-1.0, 0, 0]}>
                <boxGeometry args={[0.04, 0.8, 0.05]} />
              </mesh>
              <mesh material={m.carBodyDark} position={[s * (CABIN_WIDTH / 2 - 0.01), 1.16, -1.25]} rotation={[0.96, 0, 0]}>
                <boxGeometry args={[0.04, 0.7, 0.05]} />
              </mesh>
              {/* Belt-line trim */}
              <mesh material={m.carTrim} position={[s * (BODY_WIDTH / 2 + 0.005), 0.97, -0.2]}>
                <boxGeometry args={[0.02, 0.03, 2.5]} />
              </mesh>
              {/* Mirrors */}
              <mesh material={m.carBody} position={[s * 1.0, 1.05, 0.9]}>
                <boxGeometry args={[0.18, 0.04, 0.07]} />
              </mesh>
              <mesh material={m.carBodyDark} position={[s * 1.1, 1.08, 0.88]}>
                <boxGeometry args={[0.1, 0.12, 0.2]} />
              </mesh>
              {/* Wheel arches */}
              {arch(s * (BODY_WIDTH / 2 - 0.02), WHEEL_FRONT_Z)}
              {arch(s * (BODY_WIDTH / 2 - 0.02), WHEEL_REAR_Z)}
            </group>
          ))}
          {/* Underbody, side skirts and bumpers (dark) */}
          <mesh material={m.carUnder} position={[0, 0.33, 0]}>
            <boxGeometry args={[BODY_WIDTH - 0.1, 0.1, 3.9]} />
          </mesh>
          <mesh material={m.carUnder} position={[0, 0.46, 2.02]}>
            <boxGeometry args={[BODY_WIDTH - 0.06, 0.2, 0.3]} />
          </mesh>
          <mesh material={m.carUnder} position={[0, 0.46, -2.02]}>
            <boxGeometry args={[BODY_WIDTH - 0.06, 0.2, 0.3]} />
          </mesh>
          {/* Grille and headlights */}
          <mesh material={m.grille} position={[0, 0.6, 2.12]}>
            <boxGeometry args={[0.9, 0.14, 0.06]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh material={m.headlight} position={[s * 0.6, 0.76, 2.07]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.42, 0.12, 0.12]} />
              </mesh>
              <mesh material={m.drl} position={[s * 0.6, 0.67, 2.1]}>
                <boxGeometry args={[0.46, 0.025, 0.04]} />
              </mesh>
              <mesh material={m.tailLight} position={[s * 0.64, 0.9, -2.11]} userData={{ dynamic: true }}>
                <boxGeometry args={[0.34, 0.12, 0.06]} />
              </mesh>
              {/* Exhausts */}
              <mesh material={m.carTrim} position={[s * 0.5, 0.42, -2.1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
              </mesh>
            </group>
          ))}
          {/* Full-width light bar */}
          <mesh ref={tail} material={m.tailLight} position={[0, 0.9, -2.11]} userData={{ dynamic: true }}>
            <boxGeometry args={[1.2, 0.05, 0.05]} />
          </mesh>
          <mesh material={m.carBodyDark} position={[0, 1.46, -0.78]}>
            <boxGeometry args={[0.05, 0.06, 0.2]} />
          </mesh>
        </StaticBatch>

        {/* ---- AERO-X flight parts (animated, outside the static batch) ---- */}
        {/* Side panels that unlock the wing roots */}
        <mesh ref={panelR} material={m.carBodyDark} position={[BODY_WIDTH / 2 + 0.03, 0.62, 0.35]} userData={{ dynamic: true }}>
          <boxGeometry args={[0.04, 0.3, 2.3]} />
        </mesh>
        <mesh ref={panelL} material={m.carBodyDark} position={[-(BODY_WIDTH / 2 + 0.03), 0.62, 0.35]} userData={{ dynamic: true }}>
          <boxGeometry args={[0.04, 0.3, 2.3]} />
        </mesh>
        {wing(1)}
        {wing(-1)}
        {/* Spoiler lip that rises and widens into the horizontal stabiliser */}
        <mesh ref={stabiliser} material={m.carBodyDark} position={[0, 1.0, -2.0]} rotation={[0.12, 0, 0]} userData={{ dynamic: true }}>
          <boxGeometry args={[2.7, 0.04, 0.5]} />
        </mesh>
        {/* Twin fins hinged on the rear deck */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s > 0 ? finR : finL} position={[s * 0.62, 1.02, -1.75]} rotation={[Math.PI / 2, 0, 0]} userData={{ dynamic: true }}>
            <mesh material={m.carBody} position={[0, 0.34, -0.1]} rotation={[0.35, 0, 0]} userData={{ dynamic: true }}>
              <boxGeometry args={[0.05, 0.68, 0.46]} />
            </mesh>
            <mesh material={m.lightCyanSoft} position={[0, 0.66, -0.2]} rotation={[0.35, 0, 0]} userData={{ dynamic: true }}>
              <boxGeometry args={[0.06, 0.04, 0.3]} />
            </mesh>
          </group>
        ))}
        {/* Thruster: ring and glowing core at the rear */}
        <group ref={thruster} position={[0, 0.7, -2.3]} visible={false} userData={{ dynamic: true }}>
          <mesh material={m.carTrim} rotation={[Math.PI / 2, 0, 0]} userData={{ dynamic: true }}>
            <torusGeometry args={[0.3, 0.05, 8, 20]} />
          </mesh>
          <mesh ref={thrusterCore} material={coreMaterial} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]} userData={{ dynamic: true }}>
            <cylinderGeometry args={[0.24, 0.2, 0.18, 12]} />
          </mesh>
        </group>
        {/* Flight navigation lights: red port (+X is the left side), green starboard, white tail */}
        <group ref={navLights} visible={false} userData={{ dynamic: true }}>
          <mesh material={m.lightRed} position={[WING_ROOT.x + WING_SPAN * 0.98, WING_ROOT.y + 0.05, WING_ROOT.z - 0.55]} userData={{ dynamic: true }}>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
          </mesh>
          <mesh material={m.navGreen} position={[-(WING_ROOT.x + WING_SPAN * 0.98), WING_ROOT.y + 0.05, WING_ROOT.z - 0.55]} userData={{ dynamic: true }}>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
          </mesh>
          <mesh material={m.lightWarm} position={[0, 1.46, -2.2]} userData={{ dynamic: true }}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
          </mesh>
        </group>
      </group>

      {/* ---- Marine parts (animated): side floats hinged on the sills, keel plate, stern jet ---- */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s > 0 ? floatR : floatL} position={[s * (BODY_WIDTH / 2 + 0.02), 0.78, -0.15]} userData={{ dynamic: true }}>
            {/* Hinge arm then the pontoon: folded it lies flat against the flank under the belt line */}
            <mesh material={m.carBodyDark} position={[s * 0.22, -0.02, 0]} userData={{ dynamic: true }}>
              <boxGeometry args={[0.44, 0.06, 2.6]} />
            </mesh>
            <mesh material={m.hullNavy} position={[s * 0.5, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow userData={{ dynamic: true }}>
              <cylinderGeometry args={[0.2, 0.2, 3.4, 10]} />
            </mesh>
            <mesh material={m.hullNavy} position={[s * 0.5, -0.1, 1.85]} rotation={[Math.PI / 2, 0, 0]} userData={{ dynamic: true }}>
              <coneGeometry args={[0.2, 0.5, 10]} />
            </mesh>
            <mesh material={m.lightCyanSoft} position={[s * 0.5, 0.11, 0]} userData={{ dynamic: true }}>
              <boxGeometry args={[0.06, 0.03, 2.6]} />
            </mesh>
          </group>
        ))}
        <group ref={keel} position={[0, 0.3, 0]} userData={{ dynamic: true }}>
          <mesh material={m.hullNavy} position={[0, 0, -0.1]} userData={{ dynamic: true }}>
            <boxGeometry args={[BODY_WIDTH - 0.3, 0.22, 3.6]} />
          </mesh>
          <mesh material={m.hullNavy} position={[0, 0.02, 1.95]} rotation={[0, Math.PI / 4, 0]} userData={{ dynamic: true }}>
            <boxGeometry args={[0.9, 0.2, 0.9]} />
          </mesh>
        </group>
        <group ref={jet} position={[0, 0.42, -2.25]} visible={false} userData={{ dynamic: true }}>
          <mesh material={m.carUnder} rotation={[Math.PI / 2, 0, 0]} userData={{ dynamic: true }}>
            <cylinderGeometry args={[0.22, 0.26, 0.3, 10]} />
          </mesh>
          <mesh ref={jetCore} material={jetMaterial} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]} userData={{ dynamic: true }}>
            <torusGeometry args={[0.17, 0.03, 6, 16]} />
          </mesh>
        </group>
      {/* Contact shadow: a soft blob that follows the car (the key-light shadow alone floats at low sun angles) */}
      <mesh ref={shadow} material={m.shadowBlob} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[3.4, 5.4]} />
      </mesh>

      {/* Headlight beam (quality gated) */}
      <primitive object={headlightTarget} />
      {profileQ.headlight && (
        <spotLight
          position={[0, 0.9, 1.9]}
          target={headlightTarget}
          color="#FFF1D0"
          intensity={34}
          distance={30}
          angle={0.5}
          penumbra={0.7}
          decay={1.6}
        />
      )}

      {/* Wheels: front pair steers; all four tuck into the body in flight form */}
      <group ref={frontLeft} position={[-WHEEL_X, WHEEL_RADIUS, WHEEL_FRONT_Z]}>{wheel(-1)}</group>
      <group ref={frontRight} position={[WHEEL_X, WHEEL_RADIUS, WHEEL_FRONT_Z]}>{wheel(1)}</group>
      <group ref={rearLeft} position={[-WHEEL_X, WHEEL_RADIUS, WHEEL_REAR_Z]}>{wheel(-1)}</group>
      <group ref={rearRight} position={[WHEEL_X, WHEEL_RADIUS, WHEEL_REAR_Z]}>{wheel(1)}</group>
    </group>
  );
}
