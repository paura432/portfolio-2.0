"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CircleGeometry, Color, InstancedMesh, Object3D, TetrahedronGeometry } from "three";
import { driveFx } from "@/game/fx/driving";
import { ParticlePool, particleStats, type EmitSpec } from "@/game/fx/particles";
import { inputState } from "@/game/controls/input";
import { liveCar } from "@/game/vehicle/carState";
import { surfaceAt } from "@/game/world/surface";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { impactBus } from "@/game/world/impactBus";
import { treeWorld, type TreeEvent } from "@/game/world/treeWorld";
import { treeHeight } from "@/game/world/trees";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "./materials";

const TINTS = [palette.tree, palette.treeTeal, palette.treeGreen, palette.treeBlue];
const DUST_TINT = new Color("#93A9C4");

interface Pools {
  splinters: ParticlePool;
  leaves: ParticlePool;
  dust: ParticlePool;
}

/** Stylised impact feedback: a few splinters, geometric leaves and dust puffs, all pooled and instanced (3 draw calls). */
export function ImpactParticles() {
  const m = getMaterials();
  const quality = useGameStore((s) => s.quality);
  const budget = QUALITY_PROFILES[quality].particles;
  const caps = useMemo(
    () => ({ splinters: Math.round(48 * budget), leaves: Math.round(72 * budget), dust: Math.round(28 * budget) }),
    [budget],
  );
  // Pools are mutable simulation state: kept in a ref, rebuilt when the budget changes.
  const poolsRef = useRef<Pools | null>(null);
  useEffect(() => {
    poolsRef.current =
      budget <= 0
        ? null
        : {
            splinters: new ParticlePool(caps.splinters, { gravity: 14, bounce: 0.25, drag: 0.35, floor: 0.04 }, 1),
            leaves: new ParticlePool(caps.leaves, { gravity: 3.5, bounce: 0.1, drag: 0.2, floor: 0.06 }, 2),
            dust: new ParticlePool(caps.dust, { gravity: -0.4, bounce: 0, drag: 0.3, floor: 0.1 }, 3),
          };
    return () => {
      poolsRef.current = null;
    };
  }, [budget, caps]);
  const geos = useMemo(() => ({ splinter: new BoxGeometry(0.07, 0.07, 0.36), leaf: new TetrahedronGeometry(0.2, 0), dust: new CircleGeometry(1, 10) }), []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  const meshes = useRef<{ splinters: InstancedMesh | null; leaves: InstancedMesh | null; dust: InstancedMesh | null }>({ splinters: null, leaves: null, dust: null });
  const scratch = useRef({ o: new Object3D(), c: new Color(), spec: {} as EmitSpec, dustAcc: 0, prevSpeed: 0 });

  const emitFor = (e: TreeEvent, p: Pools) => {
    const def = treeWorld.defs[e.id];
    if (!def) return;
    const s = def.scale;
    const spec = scratch.current.spec;
    const set = (x: number, y: number, z: number, spread: number, bias: number, vy: number, speed: number, life: number, sizeMin: number, sizeMax: number, tint: number) => {
      spec.x = x;
      spec.y = y;
      spec.z = z;
      spec.spread = spread;
      spec.vx = e.dirX * bias;
      spec.vz = e.dirZ * bias;
      spec.vy = vy;
      spec.speed = speed;
      spec.life = life;
      spec.sizeMin = sizeMin;
      spec.sizeMax = sizeMax;
      spec.tint = tint;
      return spec;
    };
    const canopyY = treeHeight(def.kind, s) * 0.7;
    const k = budget;
    switch (e.type) {
      case "break":
        p.splinters.emit(Math.round(10 * k), set(e.x, 0.6 * s, e.z, 0.15, 2.2, 2.5, 3.2, 1.4, 0.7, 1.3, 0));
        p.leaves.emit(Math.round(14 * k), set(e.x, canopyY, e.z, 0.9 * s, 1.6, 1.0, 2.4, 1.8, 0.7, 1.4, def.tint));
        p.dust.emit(Math.round(3 * k), set(e.x, 0.3, e.z, 0.4, 0.8, 0.5, 0.6, 1.1, 0.9, 1.6, 0));
        break;
      case "topple":
        p.leaves.emit(Math.round(9 * k), set(e.x, canopyY, e.z, 0.9 * s, 1.2, 0.8, 2.0, 1.7, 0.7, 1.3, def.tint));
        p.dust.emit(Math.round(2 * k), set(e.x, 0.3, e.z, 0.4, 0.6, 0.4, 0.5, 1.0, 0.8, 1.4, 0));
        break;
      case "shake":
        p.leaves.emit(Math.round(4 * k), set(e.x, canopyY, e.z, 0.8 * s, 0.4, 0.4, 1.2, 1.5, 0.6, 1.1, def.tint));
        break;
      case "settle": {
        // Canopy hits the ground along the fall direction.
        const reach = treeHeight(def.kind, s) * 0.75;
        const gx = e.x + e.dirX * reach;
        const gz = e.z + e.dirZ * reach;
        p.dust.emit(Math.round(5 * k), set(gx, 0.25, gz, 1.0 * s, 0.3, 0.6, 0.8, 1.2, 1.0, 2.0, 0));
        p.leaves.emit(Math.round(6 * k), set(gx, 0.5, gz, 1.0 * s, 0.2, 1.4, 1.4, 1.4, 0.6, 1.2, def.tint));
        break;
      }
      default:
        break;
    }
  };

  useFrame(({ camera }, delta) => {
    const pools = poolsRef.current;
    if (!pools) {
      particleStats.set(0, 0);
      return;
    }
    const dt = Math.min(delta, 0.1);
    for (const e of impactBus.events) emitFor(e, pools);
    // Driving dust: only off the hard surfaces and only while moving (see driveFx).
    const car = liveCar.state;
    const sc = scratch.current;
    const accel = dt > 0 ? (car.speed - sc.prevSpeed) / dt : 0;
    sc.prevSpeed = car.speed;
    const fx = driveFx({ surface: surfaceAt(car.x, car.z), speed: car.speed, steer: inputState.drive.steer, brake: inputState.drive.brake, accel });
    sc.dustAcc += fx.dustRate * budget * dt;
    if (sc.dustAcc >= 1) {
      const n = Math.floor(sc.dustAcc);
      sc.dustAcc -= n;
      const fx0 = Math.sin(car.heading);
      const fz0 = Math.cos(car.heading);
      const back = car.speed >= 0 ? -1 : 1;
      const spec = sc.spec;
      spec.x = car.x + fx0 * back * 1.4;
      spec.y = 0.15;
      spec.z = car.z + fz0 * back * 1.4;
      spec.spread = 0.9;
      spec.vx = fx0 * back * 1.2;
      spec.vz = fz0 * back * 1.2;
      spec.vy = 0.9;
      spec.speed = 0.6;
      spec.life = 1.0;
      spec.sizeMin = 0.7;
      spec.sizeMax = 1.3;
      spec.tint = 0;
      pools.dust.emit(n, spec);
    }
    const { o, c } = scratch.current;
    let active = 0;
    const write = (pool: ParticlePool, mesh: InstancedMesh | null, kind: "splinters" | "leaves" | "dust") => {
      pool.update(dt);
      active += pool.count;
      if (!mesh) return;
      for (let i = 0; i < pool.count; i++) {
        const f = pool.fraction(i);
        o.position.set(pool.x[i]!, pool.y[i]!, pool.z[i]!);
        if (kind === "dust") {
          // Puffs face the camera, grow as they fade.
          o.quaternion.copy(camera.quaternion);
          const grow = pool.size[i]! * (1.6 - f);
          o.scale.set(grow, grow, 1);
          mesh.setColorAt(i, c.copy(DUST_TINT).multiplyScalar(f * f));
        } else {
          const t = pool.life[i]! * pool.spin[i]!;
          o.rotation.set(t, t * 0.7, 0);
          const sz = pool.size[i]! * Math.min(1, f * 4);
          o.scale.set(sz, sz, sz);
          if (kind === "leaves") mesh.setColorAt(i, c.set(TINTS[pool.tint[i]!] ?? palette.tree));
        }
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      }
      mesh.count = pool.count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    write(pools.splinters, meshes.current.splinters, "splinters");
    write(pools.leaves, meshes.current.leaves, "leaves");
    write(pools.dust, meshes.current.dust, "dust");
    particleStats.set(active, pools.splinters.capacity + pools.leaves.capacity + pools.dust.capacity);
  }, -2.4);

  if (budget <= 0) return null;
  return (
    <group>
      <instancedMesh ref={(el) => void (meshes.current.splinters = el)} args={[geos.splinter, m.splinter, caps.splinters]} count={0} frustumCulled={false} castShadow />
      <instancedMesh ref={(el) => void (meshes.current.leaves = el)} args={[geos.leaf, m.leaf, caps.leaves]} count={0} frustumCulled={false} castShadow />
      <instancedMesh ref={(el) => void (meshes.current.dust = el)} args={[geos.dust, m.dust, caps.dust]} count={0} frustumCulled={false} />
    </group>
  );
}
