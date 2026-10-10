"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, type Group, type Mesh } from "three";
import { inputState } from "@/game/controls/input";
import { stepCar } from "@/game/vehicle/carPhysics";
import { liveCar } from "@/game/vehicle/carState";
import { constrainCar } from "@/game/world/obstacles";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";

const WHEEL_RADIUS = 0.38;

/** Low-poly orange car. Front of the car is +Z in local space. */
export function Car() {
  const group = useRef<Group>(null);
  const frontLeft = useRef<Group>(null);
  const frontRight = useRef<Group>(null);
  const wheels = useRef<Mesh[]>([]);
  const headlightTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(0, 0, 12);
    return o;
  }, []);

  useFrame((_, delta) => {
    const driving = useGameStore.getState().phase === "playing";

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

    const spin = (next.speed * Math.min(delta, 0.1)) / WHEEL_RADIUS;
    for (const w of wheels.current) w.rotation.x += spin;
    if (frontLeft.current) frontLeft.current.rotation.y = next.steerAngle;
    if (frontRight.current) frontRight.current.rotation.y = next.steerAngle;
  }, -3);

  const addWheel = (m: Mesh | null) => {
    if (m && !wheels.current.includes(m)) wheels.current.push(m);
  };

  const wheel = (
    <mesh ref={addWheel} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.32, 10]} />
      <meshStandardMaterial color={palette.carDark} roughness={0.9} />
    </mesh>
  );

  return (
    <group ref={group} position={[liveCar.state.x, 0, liveCar.state.z]} rotation={[0, liveCar.state.heading, 0]}>
      {/* Chassis */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[2.0, 0.68, 4.2]} />
        <meshStandardMaterial color={palette.carOrange} roughness={0.45} />
      </mesh>
      {/* Hood slope */}
      <mesh position={[0, 1.1, 1.0]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[1.8, 0.3, 1.2]} />
        <meshStandardMaterial color={palette.carOrange} roughness={0.45} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.36, -0.35]} castShadow>
        <boxGeometry args={[1.7, 0.66, 2.0]} />
        <meshStandardMaterial color="#E86A32" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.4, -0.35]}>
        <boxGeometry args={[1.74, 0.36, 1.7]} />
        <meshStandardMaterial color="#17283A" roughness={0.2} metalness={0.4} />
      </mesh>
      {/* Headlights */}
      <mesh position={[-0.65, 0.78, 2.12]}>
        <boxGeometry args={[0.36, 0.18, 0.08]} />
        <meshBasicMaterial color="#FFF3D6" toneMapped={false} />
      </mesh>
      <mesh position={[0.65, 0.78, 2.12]}>
        <boxGeometry args={[0.36, 0.18, 0.08]} />
        <meshBasicMaterial color="#FFF3D6" toneMapped={false} />
      </mesh>
      {/* Tail lights */}
      <mesh position={[0, 0.8, -2.12]}>
        <boxGeometry args={[1.5, 0.14, 0.08]} />
        <meshBasicMaterial color="#FF4A3D" toneMapped={false} />
      </mesh>
      {/* Headlight beam */}
      <primitive object={headlightTarget} />
      <spotLight
        position={[0, 1, 2]}
        target={headlightTarget}
        color="#FFF1D0"
        intensity={40}
        distance={28}
        angle={0.55}
        penumbra={0.6}
        decay={1.6}
      />
      {/* Wheels: front pair steers */}
      <group ref={frontLeft} position={[-1.02, WHEEL_RADIUS, 1.35]}>{wheel}</group>
      <group ref={frontRight} position={[1.02, WHEEL_RADIUS, 1.35]}>{wheel}</group>
      <group position={[-1.02, WHEEL_RADIUS, -1.35]}>{wheel}</group>
      <group position={[1.02, WHEEL_RADIUS, -1.35]}>{wheel}</group>
    </group>
  );
}
