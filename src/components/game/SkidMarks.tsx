"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import { inputState } from "@/game/controls/input";
import { driveFx } from "@/game/fx/driving";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { liveCar } from "@/game/vehicle/carState";
import { surfaceAt } from "@/game/world/surface";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "./materials";

/** Ring buffer of marks: the oldest is overwritten, so marks never accumulate. */
export const SKID_CAPACITY = 160;
const MARK_SPACING = 0.42;
const REAR_Z = -1.3;
const WHEEL_X = 0.98;

/** Skid marks laid by the rear wheels on asphalt under hard braking or fast turns (one draw call). */
export function SkidMarks() {
  const m = getMaterials();
  const quality = useGameStore((s) => s.quality);
  const enabled = QUALITY_PROFILES[quality].worldFx;
  const mesh = useRef<InstancedMesh>(null);
  const st = useRef({ head: 0, count: 0, lastX: NaN, lastZ: NaN, prevSpeed: 0, o: new Object3D() });

  useFrame((_, delta) => {
    const im = mesh.current;
    if (!im || !enabled) return;
    const dt = Math.min(delta, 0.1);
    const car = liveCar.state;
    const s = st.current;
    const accel = dt > 0 ? (car.speed - s.prevSpeed) / dt : 0;
    s.prevSpeed = car.speed;
    const fx = driveFx({ surface: surfaceAt(car.x, car.z), speed: car.speed, steer: inputState.drive.steer, brake: inputState.drive.brake, accel });
    if (!fx.skid) {
      s.lastX = NaN;
      return;
    }
    if (!Number.isNaN(s.lastX) && Math.hypot(car.x - s.lastX, car.z - s.lastZ) < MARK_SPACING) return;
    s.lastX = car.x;
    s.lastZ = car.z;
    const fx0 = Math.sin(car.heading);
    const fz0 = Math.cos(car.heading);
    const rx = fz0;
    const rz = -fx0;
    for (const side of [-1, 1]) {
      const o = s.o;
      o.position.set(car.x + fx0 * REAR_Z + rx * WHEEL_X * side, 0.028, car.z + fz0 * REAR_Z + rz * WHEEL_X * side);
      o.rotation.set(-Math.PI / 2, 0, -car.heading);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      im.setMatrixAt(s.head, o.matrix);
      s.head = (s.head + 1) % SKID_CAPACITY;
      s.count = Math.min(SKID_CAPACITY, s.count + 1);
    }
    im.count = s.count;
    im.instanceMatrix.needsUpdate = true;
  }, -2.3);

  if (!enabled) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, m.skid, SKID_CAPACITY]} count={0} frustumCulled={false} renderOrder={1}>
      <planeGeometry args={[0.26, 0.6]} />
    </instancedMesh>
  );
}
