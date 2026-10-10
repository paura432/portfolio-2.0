"use client";

import { useCallback, useMemo } from "react";
import { Color, InstancedMesh, Object3D } from "three";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { generateFurniture, generateLamps, type Placed, type TreeInstance } from "@/game/world/props";
import { treeDefs } from "@/game/world/trees";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "./materials";
import { Trees } from "./Trees";

const CANOPY_TINTS = [palette.tree, palette.treeTeal, palette.treeGreen, palette.treeBlue];

type Placer = (o: Object3D, item: TreeInstance | Placed, i: number) => void;

/** Builds an instanced-mesh ref callback from a placement function; tints use instanceColor. */
function useInstances<T extends TreeInstance | Placed>(items: T[], place: Placer, tint?: (item: T) => string | null) {
  return useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      const c = new Color();
      items.forEach((item, i) => {
        o.position.set(0, 0, 0);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(1);
        place(o, item, i);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
        if (tint) {
          const t = tint(item);
          if (t) mesh.setColorAt(i, c.set(t));
        }
      });
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    [items, place, tint],
  );
}

const tintOf = (t: TreeInstance | Placed) => CANOPY_TINTS[(t as TreeInstance).tint ?? 0] ?? palette.tree;

export function Props() {
  const m = getMaterials();
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];

  // Trees come from the shared deterministic list (stable ids; see Trees.tsx for rendering).
  const furniture = useMemo(() => generateFurniture(treeDefs()), []);
  const lamps = useMemo(() => generateLamps(), []);

  const bush: Placer = useCallback((o, b) => {
    const s = b.scale ?? 1;
    o.position.set(b.x, 0.45 * s, b.z);
    o.scale.set(s, s * 0.8, s);
    o.rotation.y = b.rotation;
  }, []);
  const garden: Placer = useCallback((o, g) => {
    const r = (g as unknown as { radius: number }).radius;
    o.position.set(g.x, 0.02, g.z);
    o.rotation.set(-Math.PI / 2, 0, 0);
    o.scale.set(r, r, 1);
  }, []);
  const at = (y: number, dz = 0, dx = 0): Placer => (o, p) => {
    o.position.set(p.x, y, p.z);
    o.rotation.y = p.rotation;
    o.translateZ(dz);
    o.translateX(dx);
  };
  const benchSeat = useMemo(() => at(0.46), []);
  const benchBack = useMemo(() => at(0.72, -0.22), []);
  const benchLegs = useMemo(() => at(0.2), []);
  const planterBox = useMemo(() => at(0.28), []);
  const planterBush = useMemo(() => at(0.95), []);
  const bollardPost = useMemo(() => at(0.4), []);
  const bollardCap = useMemo(() => at(0.82), []);
  const lampPost = useMemo(() => at(1.95), []);
  const lampArm = useMemo(() => at(3.86, 0.5), []);
  const lampHead = useMemo(() => at(3.82, 1.0), []);
  const lampPool: Placer = useCallback((o, p) => {
    o.position.set(p.x, 0.03, p.z);
    o.rotation.y = p.rotation;
    o.translateZ(1.2);
    o.rotation.x = -Math.PI / 2;
    o.scale.set(3.4, 3.4, 1);
  }, []);

  const gardensAsPlaced = useMemo(() => furniture.gardens.map((g) => ({ ...g, rotation: 0 })), [furniture.gardens]);

  const refBushes = useInstances(furniture.bushes, bush, tintOf);
  const refGardens = useInstances(gardensAsPlaced, garden);
  const refBenchSeat = useInstances(furniture.benches, benchSeat);
  const refBenchBack = useInstances(furniture.benches, benchBack);
  const refBenchLegs = useInstances(furniture.benches, benchLegs);
  const refPlanterBox = useInstances(furniture.planters, planterBox);
  const refPlanterBush = useInstances(furniture.planters, planterBush);
  const refBollardPost = useInstances(furniture.bollards, bollardPost);
  const refBollardCap = useInstances(furniture.bollards, bollardCap);
  const refLampPost = useInstances(lamps, lampPost);
  const refLampArm = useInstances(lamps, lampArm);
  const refLampHead = useInstances(lamps, lampHead);
  const refLampPool = useInstances(lamps, lampPool);

  return (
    <group>
      {/* Gardens (turf discs under tree clusters) */}
      <instancedMesh ref={refGardens} args={[undefined, undefined, gardensAsPlaced.length]} material={m.turf} receiveShadow>
        <circleGeometry args={[1, 9]} />
      </instancedMesh>

      {/* Trees: instanced forest + pooled dynamic trees (destructible, see Trees.tsx) */}
      <Trees />

      {/* Bushes and planters */}
      <instancedMesh ref={refBushes} args={[undefined, undefined, Math.max(1, furniture.bushes.length)]} material={m.canopy} castShadow>
        <dodecahedronGeometry args={[0.7, 0]} />
      </instancedMesh>
      <instancedMesh ref={refPlanterBox} args={[undefined, undefined, furniture.planters.length]} material={m.planter} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.56, 1.9]} />
      </instancedMesh>
      <instancedMesh ref={refPlanterBush} args={[undefined, undefined, furniture.planters.length]} material={m.bush} castShadow>
        <dodecahedronGeometry args={[0.85, 0]} />
      </instancedMesh>

      {/* Benches */}
      <instancedMesh ref={refBenchSeat} args={[undefined, undefined, furniture.benches.length]} material={m.metal} castShadow>
        <boxGeometry args={[1.7, 0.08, 0.5]} />
      </instancedMesh>
      <instancedMesh ref={refBenchBack} args={[undefined, undefined, furniture.benches.length]} material={m.metal} castShadow>
        <boxGeometry args={[1.7, 0.42, 0.06]} />
      </instancedMesh>
      <instancedMesh ref={refBenchLegs} args={[undefined, undefined, furniture.benches.length]} material={m.metalDark}>
        <boxGeometry args={[1.4, 0.4, 0.36]} />
      </instancedMesh>

      {/* Bollards with a cyan cap */}
      <instancedMesh ref={refBollardPost} args={[undefined, undefined, furniture.bollards.length]} material={m.metalDark} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.8, 8]} />
      </instancedMesh>
      <instancedMesh ref={refBollardCap} args={[undefined, undefined, furniture.bollards.length]} material={m.lightCyan}>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 8]} />
      </instancedMesh>

      {/* Street lamps: post, arm toward the road, emissive head, light pool on the ground */}
      <instancedMesh ref={refLampPost} args={[undefined, undefined, lamps.length]} material={m.metalDark} castShadow>
        <boxGeometry args={[0.14, 3.9, 0.14]} />
      </instancedMesh>
      <instancedMesh ref={refLampArm} args={[undefined, undefined, lamps.length]} material={m.metalDark}>
        <boxGeometry args={[0.08, 0.08, 1.1]} />
      </instancedMesh>
      <instancedMesh ref={refLampHead} args={[undefined, undefined, lamps.length]} material={m.lightAmberSoft}>
        <boxGeometry args={[0.46, 0.12, 0.3]} />
      </instancedMesh>
      {profile.lampPools && (
        <instancedMesh ref={refLampPool} args={[undefined, undefined, lamps.length]} material={m.lampPool}>
          <circleGeometry args={[1, 16]} />
        </instancedMesh>
      )}
    </group>
  );
}
