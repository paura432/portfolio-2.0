"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ExtrudeGeometry, Object3D, Shape, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { inputState } from "@/game/controls/input";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { stepCar } from "@/game/vehicle/carPhysics";
import { liveCar } from "@/game/vehicle/carState";
import { dampTo, isBraking, targetPitch, targetRoll, VISUAL_CONFIG } from "@/game/vehicle/carVisual";
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

/**
 * PAU WORLD vehicle V3: a compact futuristic sports hatch. Physics drives the
 * outer group; everything cosmetic (roll, pitch, lights) lives in the inner group.
 * Front of the car is +Z in local space.
 */
export function Car() {
  const m = getMaterials();
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const frontLeft = useRef<Group>(null);
  const frontRight = useRef<Group>(null);
  const wheels = useRef<Mesh[]>([]);
  const tail = useRef<Mesh>(null);
  const prevSpeed = useRef(0);
  const accelSmooth = useRef(0);
  const pose = useRef({ roll: 0, pitch: 0 });
  const quality = useGameStore((s) => s.quality);
  const profileQ = QUALITY_PROFILES[quality];

  const headlightTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(0, 0, 14);
    return o;
  }, []);
  const bodyGeometry = useMemo(() => extrude(profile(BODY_PROFILE), BODY_WIDTH, 0.06), []);
  const cabinGeometry = useMemo(() => extrude(profile(CABIN_PROFILE), CABIN_WIDTH, 0.04), []);

  useFrame(({ clock }, delta) => {
    const driving = useGameStore.getState().phase === "playing";
    const dt = Math.min(delta, 0.1);

    // Pause semantics: while a panel or menu is open the car stops dead and ignores input.
    // Collisions are resolved inside every physics sub-step (see stepCar).
    const next = driving
      ? stepCar(liveCar.state, inputState.drive, delta, undefined, constrainCar)
      : { ...liveCar.state, speed: 0, steerAngle: 0 };
    liveCar.state = next;

    const g = group.current;
    if (!g) return;
    g.position.set(next.x, 0, next.z);
    g.rotation.y = next.heading;

    // Visual layer: wheels, roll, pitch, brake lights.
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
        {/* Full-width light bar + spoiler lip */}
        <mesh ref={tail} material={m.tailLight} position={[0, 0.9, -2.11]} userData={{ dynamic: true }}>
          <boxGeometry args={[1.2, 0.05, 0.05]} />
        </mesh>
        <mesh material={m.carBodyDark} position={[0, 1.0, -2.0]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[1.5, 0.035, 0.26]} />
        </mesh>
        <mesh material={m.carBodyDark} position={[0, 1.46, -0.78]}>
          <boxGeometry args={[0.05, 0.06, 0.2]} />
        </mesh>
        </StaticBatch>
      </group>

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

      {/* Wheels: front pair steers */}
      <group ref={frontLeft} position={[-WHEEL_X, WHEEL_RADIUS, WHEEL_FRONT_Z]}>{wheel(-1)}</group>
      <group ref={frontRight} position={[WHEEL_X, WHEEL_RADIUS, WHEEL_FRONT_Z]}>{wheel(1)}</group>
      <group position={[-WHEEL_X, WHEEL_RADIUS, WHEEL_REAR_Z]}>{wheel(-1)}</group>
      <group position={[WHEEL_X, WHEEL_RADIUS, WHEEL_REAR_Z]}>{wheel(1)}</group>
    </group>
  );
}
