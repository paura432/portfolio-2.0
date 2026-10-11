"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CircleGeometry, Color, InstancedMesh, Object3D } from "three";
import { WATER_LEVEL } from "@/data/archipelago";
import { ParticlePool, type EmitSpec } from "@/game/fx/particles";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { BOAT_CONFIG, forwardSpeed } from "@/game/vehicle/boatPhysics";
import { liveBoat } from "@/game/vehicle/boatState";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "./materials";

const SPRAY_TINT = new Color("#D8F1F6");

export const SPRAY = {
  /** Below this forward speed the stern throws no spray. */
  minSpeed: 4,
  /** Puffs per second at full speed. */
  rateAtMax: 26,
  /** Extra puffs per second while turning hard at speed. */
  turnBonus: 10,
} as const;

/** Puffs per second for a given motion (pure, used by the tests). */
export function sprayRate(speed: number, rudder: number, maxSpeed = BOAT_CONFIG.maxSpeed, cfg = SPRAY): number {
  const v = Math.abs(speed);
  if (v < cfg.minSpeed) return 0;
  const t = Math.min(1, (v - cfg.minSpeed) / (maxSpeed - cfg.minSpeed));
  return cfg.rateAtMax * (0.25 + 0.75 * t) + cfg.turnBonus * Math.abs(rudder) * t;
}

/**
 * Stern spray (V6): a small pooled set of camera-facing puffs thrown up behind
 * the propeller, more when fast and when turning. One instanced draw call,
 * shared additive material with the V4 dust, budget scaled by the quality tier.
 */
export function BoatSpray() {
  const m = getMaterials();
  const budget = QUALITY_PROFILES[useGameStore((s) => s.quality)].particles;
  const capacity = Math.round(36 * budget);
  const pool = useMemo(() => (capacity > 0 ? new ParticlePool(capacity, { gravity: 6, bounce: 0, drag: 0.5, floor: WATER_LEVEL - 0.2 }, 11) : null), [capacity]);
  const geometry = useMemo(() => new CircleGeometry(0.5, 8), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const mesh = useRef<InstancedMesh>(null);
  const scratch = useRef({ o: new Object3D(), c: new Color(), spec: {} as EmitSpec, acc: 0 });

  useFrame(({ camera }, delta) => {
    if (!pool) return;
    const dt = Math.min(delta, 0.1);
    const b = liveBoat.state;
    const sc = scratch.current;
    sc.acc += sprayRate(forwardSpeed(b), b.rudder) * budget * dt;
    if (sc.acc >= 1) {
      const n = Math.floor(sc.acc);
      sc.acc -= n;
      const fx = Math.sin(b.heading);
      const fz = Math.cos(b.heading);
      const lx = Math.cos(b.heading);
      const lz = -Math.sin(b.heading);
      const spec = sc.spec;
      // Behind the stern, biased to the outside of the turn.
      const side = -b.rudder * 0.8;
      spec.x = b.x - fx * 2.9 + lx * side;
      spec.y = WATER_LEVEL + liveBoat.visual.y + 0.15;
      spec.z = b.z - fz * 2.9 + lz * side;
      spec.spread = 0.5;
      spec.vx = -fx * 1.5 + lx * side * 1.5;
      spec.vz = -fz * 1.5 + lz * side * 1.5;
      spec.vy = 2.2 + Math.abs(forwardSpeed(b)) * 0.08;
      spec.speed = 1.1;
      spec.life = 0.75;
      spec.sizeMin = 0.5;
      spec.sizeMax = 1.1;
      spec.tint = 0;
      pool.emit(n, spec);
    }
    pool.update(dt);
    const inst = mesh.current;
    if (!inst) return;
    const { o, c } = sc;
    for (let i = 0; i < pool.count; i++) {
      const f = pool.fraction(i);
      o.position.set(pool.x[i]!, pool.y[i]!, pool.z[i]!);
      o.quaternion.copy(camera.quaternion);
      const grow = pool.size[i]! * (1.5 - f * 0.5);
      o.scale.set(grow, grow, 1);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
      inst.setColorAt(i, c.copy(SPRAY_TINT).multiplyScalar(f));
    }
    inst.count = pool.count;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, -2.3);

  if (!pool) return null;
  return <instancedMesh ref={mesh} args={[geometry, m.dust, capacity]} count={0} frustumCulled={false} />;
}
