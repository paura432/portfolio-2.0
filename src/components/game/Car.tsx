"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ExtrudeGeometry, Object3D, Shape, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { SKYPORT } from "@/data/skyport";
import { inputState } from "@/game/controls/input";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { stepCar } from "@/game/vehicle/carPhysics";
import { liveCar } from "@/game/vehicle/carState";
import { dampTo, isBraking, targetPitch, targetRoll, VISUAL_CONFIG } from "@/game/vehicle/carVisual";
import { stepPlane, type TerrainQuery } from "@/game/vehicle/planePhysics";
import { livePlane } from "@/game/vehicle/planeState";
import { overRunway, transformStages, visualProgress } from "@/game/vehicle/transform";
import { canControl, transformClock, TRANSFORMING, usesPlanePose } from "@/game/vehicle/vehicleManager";
import { impactBus } from "@/game/world/impactBus";
import { constrainCar } from "@/game/world/obstacles";
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

/** What the aircraft finds under it: the runway is the only landing spot; elsewhere a floor keeps it above the roofs. */
const terrainAt: TerrainQuery = (x, z) =>
  overRunway(SKYPORT.runway, x, z) ? { groundY: SKYPORT.runway.y, canLand: true, floorY: SKYPORT.runway.y } : { groundY: 0, canLand: false, floorY: SKYPORT.floorY };

/**
 * PAU WORLD vehicle V3 (the car) and its V7 flight form (PAU AERO-X). Physics
 * drives the outer group; everything cosmetic (roll, pitch, lights) lives in
 * the inner group. Front of the car is +Z in local space. The flight parts are
 * part of this mesh from the start, folded against the body, and animate out
 * from the staged transformation timeline.
 */
export function Car() {
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
  const prevSpeed = useRef(0);
  const accelSmooth = useRef(0);
  const pose = useRef({ roll: 0, pitch: 0 });
  const floorNoticeAt = useRef(-10);
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

  useFrame(({ clock }, delta) => {
    const store = useGameStore.getState();
    const dt = Math.min(delta, 0.1);
    const planeForm = usesPlanePose(store);
    const g = group.current;

    if (!planeForm) {
      // ---- Car: V6 rules, only the active vehicle answers to the controls; a parked car stays where it was left.
      const driving = canControl("car", store.phase, store);
      const next = driving
        ? stepCar(liveCar.state, inputState.drive, delta, undefined, constrainCar)
        : liveCar.state.speed === 0 && liveCar.state.steerAngle === 0
          ? liveCar.state
          : { ...liveCar.state, speed: 0, steerAngle: 0 };
      liveCar.state = next;
      if (!g) return;
      g.position.set(next.x, 0, next.z);
      g.rotation.set(0, next.heading, 0);

      const spin = (next.speed * dt) / WHEEL_RADIUS;
      for (const w of wheels.current) w.rotation.x += spin;
      if (frontLeft.current) frontLeft.current.rotation.y = next.steerAngle;
      if (frontRight.current) frontRight.current.rotation.y = next.steerAngle;

      const accel = dt > 0 ? (next.speed - prevSpeed.current) / dt : 0;
      prevSpeed.current = next.speed;
      accelSmooth.current = dampTo(accelSmooth.current, accel, 10, dt);
      pose.current.roll = dampTo(pose.current.roll, targetRoll(next), VISUAL_CONFIG.rollLambda, dt);
      pose.current.pitch = dampTo(pose.current.pitch, targetPitch(accelSmooth.current), VISUAL_CONFIG.pitchLambda, dt);
      if (body.current) {
        // Impact jolt (cosmetic): a short shudder from the bus, decaying; off under reduced motion.
        const j = treeWorld.reducedMotion ? 0 : impactBus.jolt.strength;
        const t = clock.elapsedTime;
        body.current.rotation.z = pose.current.roll + j * 0.09 * Math.sin(t * 46);
        body.current.rotation.x = pose.current.pitch + j * 0.05 * (1 + Math.sin(t * 31));
        body.current.position.y = j * 0.03 * Math.abs(Math.sin(t * 40));
      }
      const braking = driving && isBraking(next, accelSmooth.current, inputState.drive.brake);
      if (tail.current) (tail.current.material as MeshStandardMaterial).emissiveIntensity = braking ? 2.4 : 0.9;
      if (shadow.current) shadow.current.visible = true;
    } else {
      // ---- Aircraft (V7): the same four actions drive the flight model; locked during the transformation.
      const flying = canControl("car", store.phase, store);
      if (flying) {
        const r = stepPlane(livePlane.state, inputState.drive, delta, terrainAt);
        let next = r.state;
        if (next.onGround) {
          // On the ground the island slab and the buildings bound it like the car.
          const c = constrainCar(next.x, next.z);
          if (c.x !== next.x || c.z !== next.z) next = { ...next, x: c.x, z: c.z, speed: c.blocked ? next.speed * 0.5 : next.speed };
        }
        livePlane.state = next;
        if (r.liftedOff) store.setFlightPhase("flying");
        if (r.touchedDown) store.setFlightPhase("landing");
        if (r.floorHit && clock.elapsedTime - floorNoticeAt.current > 4) {
          floorNoticeAt.current = clock.elapsedTime;
          store.noteFlight("Find the runway to land");
        }
      }
      const p = livePlane.state;
      if (!g) return;
      g.position.set(p.x, p.y, p.z);
      g.rotation.set(0, p.heading, 0);
      const spin = p.onGround ? (p.speed * dt) / WHEEL_RADIUS : 0;
      for (const w of wheels.current) w.rotation.x += spin;
      const steer = p.onGround ? -inputState.drive.steer * 0.4 : 0;
      if (frontLeft.current) frontLeft.current.rotation.y = steer;
      if (frontRight.current) frontRight.current.rotation.y = steer;
      pose.current.roll = dampTo(pose.current.roll, -p.roll, 6, dt);
      pose.current.pitch = dampTo(pose.current.pitch, -p.pitch, 6, dt);
      if (body.current) {
        body.current.rotation.z = pose.current.roll;
        body.current.rotation.x = pose.current.pitch;
        body.current.position.y = 0;
      }
      if (tail.current) (tail.current.material as MeshStandardMaterial).emissiveIntensity = p.onGround && inputState.drive.brake ? 2.4 : 0.9;
      if (shadow.current) shadow.current.visible = p.onGround;
      prevSpeed.current = p.speed;
    }

    // ---- Transformation visuals: one progress value, staged.
    const progress = visualProgress(store.carForm, store.flight, transformClock.t, transformClock.duration);
    const st = transformStages(progress);
    if (wingR.current) wingR.current.rotation.y = WING_FOLDED + (WING_SWEEP - WING_FOLDED) * st.wings;
    if (wingL.current) wingL.current.rotation.y = -(WING_FOLDED + (WING_SWEEP - WING_FOLDED) * st.wings);
    const panelOut = st.panels;
    if (panelR.current) panelR.current.position.set(BODY_WIDTH / 2 + 0.03 + 0.12 * panelOut, 0.62 - 0.18 * panelOut, 0.35);
    if (panelL.current) panelL.current.position.set(-(BODY_WIDTH / 2 + 0.03 + 0.12 * panelOut), 0.62 - 0.18 * panelOut, 0.35);
    if (stabiliser.current) {
      stabiliser.current.scale.set(0.55 + 0.45 * st.tail, 1, 1);
      stabiliser.current.position.y = 1.0 + 0.42 * st.tail;
    }
    const finAngle = (Math.PI / 2) * (1 - st.tail);
    if (finL.current) finL.current.rotation.x = finAngle;
    if (finR.current) finR.current.rotation.x = finAngle;
    const tuck = -WHEEL_TUCK * st.wheels;
    for (const w of [frontLeft, frontRight, rearLeft, rearRight]) if (w.current) w.current.position.y = WHEEL_RADIUS + tuck;
    if (thruster.current) {
      thruster.current.visible = st.thruster > 0.02;
      const s = 0.2 + 0.8 * st.thruster;
      thruster.current.scale.set(s, s, s);
    }
    if (thrusterCore.current) {
      const throttle = planeForm ? livePlane.state.throttle : 0;
      (thrusterCore.current.material as MeshStandardMaterial).emissiveIntensity = 0.6 + 1.6 * throttle + 0.3 * Math.sin(clock.elapsedTime * 18) * throttle;
    }
    if (navLights.current) navLights.current.visible = st.thruster > 0.5;
    const inTransform = TRANSFORMING.has(store.flight);
    if (inTransform && body.current && !treeWorld.reducedMotion) {
      // A faint mechanical shudder while the parts move.
      body.current.position.y += 0.012 * Math.sin(clock.elapsedTime * 50) * Math.sin(progress * Math.PI);
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
