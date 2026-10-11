"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ExtrudeGeometry, Path, Shape, ShapeGeometry, type BufferGeometry, type Group } from "three";
import { distanceToCoast, WATER_LEVEL } from "@/data/archipelago";
import { inputState } from "@/game/controls/input";
import { heightAt, oceanClock, shoreDamp } from "@/game/ocean/waves";
import { boatWake, wakeStrength } from "@/game/ocean/wake";
import { BOAT_CONFIG, boatSpeed, forwardSpeed, stepBoat } from "@/game/vehicle/boatPhysics";
import { liveBoat } from "@/game/vehicle/boatState";
import { dampTo, FLOAT_VISUAL, floatPose, planingPitch, turnRoll } from "@/game/vehicle/buoyancy";
import { canControl } from "@/game/vehicle/vehicleManager";
import { constrainBoat, openWaterDirection } from "@/game/world/seaObstacles";
import { treeWorld } from "@/game/world/treeWorld";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "./materials";
import { StaticBatch } from "./StaticBatch";

/**
 * Plan view of the hull (x = beam, y = length; the bow is at negative y so
 * that after the −90° X rotation it ends up at local +Z, the forward axis).
 */
const PLAN: [number, number][] = [
  [0, -2.75],
  [0.42, -2.25],
  [0.82, -1.45],
  [1.05, -0.5],
  [1.14, 0.55],
  [1.12, 1.6],
  [1.02, 2.35],
  [0.92, 2.5],
  [-0.92, 2.5],
  [-1.02, 2.35],
  [-1.12, 1.6],
  [-1.14, 0.55],
  [-1.05, -0.5],
  [-0.82, -1.45],
  [-0.42, -2.25],
];

function planShape(scale = 1, inset = 0): Shape {
  const s = new Shape();
  PLAN.forEach(([x, y], i) => {
    const px = x * scale - Math.sign(x) * inset;
    const py = y * scale;
    if (i === 0) s.moveTo(px, py);
    else s.lineTo(px, py);
  });
  s.closePath();
  return s;
}

const HULL_HEIGHT = 1.0;
const CHINE = 0.42;

/**
 * Hull band between two heights, extruded from the plan shape then tapered:
 * the beam narrows toward the keel (V section) and the keel rises toward the
 * bow (rake), which is what makes the silhouette read as a boat and not a box.
 */
function hullBand(y0: number, y1: number, bevel: number): ExtrudeGeometry {
  const g = new ExtrudeGeometry(planShape(), { depth: y1 - y0, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 1 });
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // along the length (bow negative)
    const z = pos.getZ(i) + y0; // height from the keel line
    const f = Math.max(0, Math.min(1, z / HULL_HEIGHT));
    const taper = 0.38 + 0.62 * Math.pow(f, 0.8);
    // Rake: the keel climbs toward the bow (y < -0.8) so the forefoot clears the water.
    const bowT = Math.max(0, (-y - 0.6) / 2.1);
    const rake = (1 - f) * bowT * bowT * 0.55;
    pos.setX(i, x * taper);
    pos.setZ(i, z + rake);
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Thin rub rail: the plan outline minus an inset copy, extruded a few centimetres. */
function rubRail(): BufferGeometry {
  const outer = planShape(1, -0.04);
  const inner = planShape(1, 0.08);
  const hole = new Path();
  const pts = inner.getPoints();
  pts.forEach((p, i) => (i === 0 ? hole.moveTo(p.x, p.y) : hole.lineTo(p.x, p.y)));
  hole.closePath();
  outer.holes.push(hole);
  const g = new ExtrudeGeometry(outer, { depth: 0.09, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function deckPlate(): BufferGeometry {
  const g = new ShapeGeometry(planShape(1, 0.1));
  g.rotateX(-Math.PI / 2);
  return g;
}

const IDLE = { throttle: 0, steer: 0, brake: false } as const;

/**
 * PAU SPEEDBOAT: a compact futuristic runabout in the car's orange, navy
 * underwater body, light deck, cyan accents. The outer group follows the 2D
 * physics; the inner group carries the buoyancy pose (height, pitch, roll).
 * Forward is +Z in local space, like the car.
 */
export function Boat() {
  const m = getMaterials();
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const stuck = useRef(0);
  const jolt = useRef(0);
  const lower = useMemo(() => hullBand(0, CHINE, 0.04), []);
  const upper = useMemo(() => hullBand(CHINE, HULL_HEIGHT, 0.05), []);
  const rail = useMemo(() => rubRail(), []);
  const deck = useMemo(() => deckPlate(), []);

  useFrame((_, delta) => {
    const store = useGameStore.getState();
    const dt = Math.min(delta, 0.1);
    const driving = canControl("boat", store.phase, store);
    const input = driving ? inputState.drive : IDLE;

    // Moored: any throttle casts off (the HUD button does the same).
    if (!driving && store.mooredAt && store.phase === "playing" && !store.transition && inputState.drive.throttle !== 0) store.castOff();

    const prev = liveBoat.state;
    let next = prev;
    if (driving) {
      next = stepBoat(prev, input, delta, undefined, constrainBoat);
      // Stuck recovery: pressed against something with no way through for a while → a gentle nudge toward open water.
      if (next.bump > 0 && boatSpeed(next) < 0.6) stuck.current += dt;
      else if (boatSpeed(next) > 1) stuck.current = 0;
      if (stuck.current > 2) {
        const [dx, dz] = openWaterDirection(next.x, next.z);
        next = { ...next, x: next.x + dx * 0.8, z: next.z + dz * 0.8, vx: 0, vz: 0 };
        stuck.current = 0;
      }
      if (next.bump > 0.5) jolt.current = Math.min(1, jolt.current + next.bump * 0.12);
    } else if (!store.transition && (prev.vx !== 0 || prev.vz !== 0 || prev.yawRate !== 0)) {
      // Pause semantics (panel, menu, car active): the hull stops dead and ignores input.
      next = { ...prev, vx: 0, vz: 0, yawRate: 0, throttle: 0, bump: 0 };
    }
    liveBoat.state = next;

    // Buoyancy: five samples of the same wave function the shader renders, damped toward the hull.
    const t = oceanClock.time;
    const pose = floatPose(next.x, next.z, next.heading, (x, z) => heightAt(x, z, t, shoreDamp(distanceToCoast(x, z))));
    const vf = forwardSpeed(next);
    const v = liveBoat.visual;
    v.y = dampTo(v.y, pose.y + FLOAT_VISUAL.freeboard, FLOAT_VISUAL.heightLambda, dt);
    v.pitch = dampTo(v.pitch, pose.pitch + planingPitch(vf, next.throttle, BOAT_CONFIG.maxSpeed), FLOAT_VISUAL.angleLambda, dt);
    v.roll = dampTo(v.roll, pose.roll + turnRoll(vf, next.rudder, BOAT_CONFIG.maxSpeed), FLOAT_VISUAL.angleLambda, dt);
    jolt.current = Math.max(0, jolt.current - dt * 2.2);

    // Wake trail from the stern.
    const sx = next.x - Math.sin(next.heading) * 2.4;
    const sz = next.z - Math.cos(next.heading) * 2.4;
    boatWake.record(sx, sz, t, driving || store.transition ? wakeStrength(vf, next.throttle, BOAT_CONFIG.maxSpeed) : 0);

    const g = group.current;
    if (!g) return;
    g.position.set(next.x, WATER_LEVEL + v.y, next.z);
    g.rotation.y = next.heading;
    if (body.current) {
      const j = treeWorld.reducedMotion ? 0 : jolt.current;
      body.current.rotation.x = -v.pitch + j * 0.04 * Math.sin(t * 38);
      body.current.rotation.z = v.roll + j * 0.06 * Math.sin(t * 29);
    }
  }, -3);

  const s = liveBoat.state;
  return (
    <group ref={group} position={[s.x, WATER_LEVEL, s.z]} rotation={[0, s.heading, 0]}>
      <group ref={body} position={[0, -0.32, 0]}>
        <StaticBatch>
          {/* Hull: navy underwater body, orange topsides, light rub rail */}
          <mesh geometry={lower} material={m.hullNavy} castShadow />
          <mesh geometry={upper} material={m.hullOrange} castShadow />
          <mesh geometry={rail} material={m.carTrim} position={[0, HULL_HEIGHT - 0.02, 0]} />
          {/* Deck */}
          <mesh geometry={deck} material={m.hullDeck} position={[0, HULL_HEIGHT + 0.005, 0]} />
          {/* Cockpit well */}
          <mesh material={m.hullSeat} position={[0, HULL_HEIGHT - 0.1, -0.55]}>
            <boxGeometry args={[1.5, 0.22, 2.3]} />
          </mesh>
          {/* Console, wheel and windshield */}
          <mesh material={m.carBodyDark} position={[0, HULL_HEIGHT + 0.22, 0.55]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[1.3, 0.42, 0.5]} />
          </mesh>
          <mesh material={m.lightCyanSoft} position={[0, HULL_HEIGHT + 0.36, 0.33]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.7, 0.12, 0.02]} />
          </mesh>
          <mesh material={m.carTrim} position={[-0.3, HULL_HEIGHT + 0.46, 0.3]} rotation={[0.9, 0, 0]}>
            <torusGeometry args={[0.16, 0.025, 6, 12]} />
          </mesh>
          <mesh material={m.carGlass} position={[0, HULL_HEIGHT + 0.62, 0.86]} rotation={[-0.55, 0, 0]}>
            <boxGeometry args={[1.62, 0.62, 0.05]} />
          </mesh>
          <mesh material={m.carTrim} position={[0, HULL_HEIGHT + 0.9, 0.72]} rotation={[-0.55, 0, 0]}>
            <boxGeometry args={[1.66, 0.04, 0.06]} />
          </mesh>
          {[-1, 1].map((sd) => (
            <mesh key={sd} material={m.carTrim} position={[sd * 0.81, HULL_HEIGHT + 0.6, 0.88]} rotation={[-0.55, 0, 0]}>
              <boxGeometry args={[0.04, 0.62, 0.06]} />
            </mesh>
          ))}
          {/* Seats */}
          {[-0.4, 0.4].map((x) => (
            <group key={x}>
              <mesh material={m.hullSeat} position={[x, HULL_HEIGHT + 0.08, -0.55]}>
                <boxGeometry args={[0.6, 0.3, 0.62]} />
              </mesh>
              <mesh material={m.hullSeat} position={[x, HULL_HEIGHT + 0.42, -0.86]} rotation={[0.18, 0, 0]}>
                <boxGeometry args={[0.6, 0.5, 0.1]} />
              </mesh>
            </group>
          ))}
          {/* Engine cover / sun pad with the cyan light bar */}
          <mesh material={m.carBodyDark} position={[0, HULL_HEIGHT + 0.14, -1.72]} castShadow>
            <boxGeometry args={[1.76, 0.3, 1.1]} />
          </mesh>
          <mesh material={m.lightCyanSoft} position={[0, HULL_HEIGHT + 0.3, -1.72]}>
            <boxGeometry args={[1.2, 0.03, 0.08]} />
          </mesh>
          {/* Side accent strips and grab rails */}
          {[-1, 1].map((sd) => (
            <group key={sd}>
              <mesh material={m.lightCyanSoft} position={[sd * 0.985, HULL_HEIGHT - 0.28, -1.0]}>
                <boxGeometry args={[0.04, 0.05, 1.5]} />
              </mesh>
              <mesh material={m.carTrim} position={[sd * 0.78, HULL_HEIGHT + 0.14, -1.0]}>
                <boxGeometry args={[0.04, 0.04, 1.3]} />
              </mesh>
              <mesh material={m.carTrim} position={[sd * 0.78, HULL_HEIGHT + 0.07, -0.4]}>
                <boxGeometry args={[0.04, 0.14, 0.04]} />
              </mesh>
              <mesh material={m.carTrim} position={[sd * 0.78, HULL_HEIGHT + 0.07, -1.6]}>
                <boxGeometry args={[0.04, 0.14, 0.04]} />
              </mesh>
              {/* Fenders */}
              <mesh material={m.fender} position={[sd * 1.14, HULL_HEIGHT - 0.42, 1.2]}>
                <cylinderGeometry args={[0.1, 0.1, 0.42, 8]} />
              </mesh>
            </group>
          ))}
          {/* Bow: cleat and navigation lights (red port, green starboard) */}
          <mesh material={m.carTrim} position={[0, HULL_HEIGHT + 0.06, 2.1]}>
            <boxGeometry args={[0.3, 0.07, 0.08]} />
          </mesh>
          <mesh material={m.lightRed} position={[0.28, HULL_HEIGHT + 0.08, 1.95]}>
            <boxGeometry args={[0.1, 0.1, 0.16]} />
          </mesh>
          <mesh material={m.navGreen} position={[-0.28, HULL_HEIGHT + 0.08, 1.95]}>
            <boxGeometry args={[0.1, 0.1, 0.16]} />
          </mesh>
          {/* Stern: outboard drive, white stern light, jet ring */}
          <mesh material={m.carUnder} position={[0, HULL_HEIGHT - 0.05, -2.95]} castShadow>
            <boxGeometry args={[0.5, 0.62, 0.5]} />
          </mesh>
          <mesh material={m.carBodyDark} position={[0, HULL_HEIGHT + 0.3, -2.95]}>
            <boxGeometry args={[0.46, 0.1, 0.46]} />
          </mesh>
          <mesh material={m.carUnder} position={[0, HULL_HEIGHT - 0.68, -2.95]}>
            <boxGeometry args={[0.14, 0.7, 0.34]} />
          </mesh>
          <mesh material={m.carTrim} position={[0, HULL_HEIGHT - 1.0, -3.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 8]} />
          </mesh>
          <mesh material={m.lightCyan} position={[0, HULL_HEIGHT - 0.42, -2.78]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.17, 0.03, 6, 16]} />
          </mesh>
          <mesh material={m.lightWarm} position={[0, HULL_HEIGHT + 0.42, -3.1]}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
          </mesh>
          {/* Transom plate */}
          <mesh material={m.carBodyDark} position={[0, HULL_HEIGHT - 0.3, -2.66]}>
            <boxGeometry args={[1.6, 0.4, 0.06]} />
          </mesh>
        </StaticBatch>
      </group>
    </group>
  );
}
