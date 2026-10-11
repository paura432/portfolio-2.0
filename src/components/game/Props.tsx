"use client";

import { useCallback, useMemo } from "react";
import { Color, InstancedMesh, Object3D } from "three";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { generateFurniture, type Placed, type TreeInstance } from "@/game/world/props";
import { treeDefs, visibleTreeCount } from "@/game/world/trees";
import { districts } from "@/data/districts";
import { useGameStore } from "@/stores/gameStore";
import { DynamicProps } from "./DynamicProps";
import { getMaterials } from "./materials";
import { Trees } from "./Trees";

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

export function Props() {
  const m = getMaterials();
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];

  // Trees come from the shared deterministic list (stable ids; see Trees.tsx for rendering).
  // Lamps, planters and benches are destructible (V9) and rendered by DynamicProps from the same placements.
  const furniture = useMemo(() => generateFurniture(treeDefs()), []);

  const garden: Placer = useCallback((o, g) => {
    const r = (g as unknown as { radius: number }).radius;
    o.position.set(g.x, 0.02, g.z);
    o.rotation.set(-Math.PI / 2, 0, 0);
    o.scale.set(r, r, 1);
  }, []);

  const gardensAsPlaced = useMemo(() => furniture.gardens.map((g) => ({ ...g, rotation: 0 })), [furniture.gardens]);
  // V4 depth: soft contact blobs under the rendered trees and warm pools at every district entrance.
  const treeBlobs = useMemo(() => treeDefs().slice(0, visibleTreeCount(profile.vegetation)).map((t) => ({ x: t.x, z: t.z, rotation: 0, scale: 0.7 + t.scale * 0.75 })), [profile.vegetation]);
  const entrances = useMemo(() => districts.filter((d) => d.built).map((d) => ({ x: d.entrance[0], z: d.entrance[1], rotation: 0, scale: d.kind === "hub" ? 4.2 : 3.4 })), []);
  const blob: Placer = useCallback((o, p) => {
    o.position.set(p.x, 0.025, p.z);
    o.rotation.set(-Math.PI / 2, 0, 0);
    o.scale.set(p.scale ?? 1, p.scale ?? 1, 1);
  }, []);
  const entrancePool: Placer = useCallback((o, p) => {
    o.position.set(p.x, 0.035, p.z);
    o.rotation.set(-Math.PI / 2, 0, 0);
    o.scale.set(p.scale ?? 1, p.scale ?? 1, 1);
  }, []);
  const refTreeBlobs = useInstances(treeBlobs, blob);
  const refEntrancePools = useInstances(entrances, entrancePool);

  const refGardens = useInstances(gardensAsPlaced, garden);

  return (
    <group>
      {/* Gardens (turf discs under tree clusters) */}
      <instancedMesh ref={refGardens} args={[undefined, undefined, gardensAsPlaced.length]} material={m.turf} receiveShadow>
        <circleGeometry args={[1, 9]} />
      </instancedMesh>

      {/* Contact blobs under trees (grounding on turf) */}
      <instancedMesh ref={refTreeBlobs} args={[undefined, undefined, Math.max(1, treeBlobs.length)]} material={m.shadowBlob} renderOrder={-1}>
        <circleGeometry args={[1, 10]} />
      </instancedMesh>
      {profile.lampPools && (
        <instancedMesh ref={refEntrancePools} args={[undefined, undefined, entrances.length]} material={m.lampPool}>
          <circleGeometry args={[1, 16]} />
        </instancedMesh>
      )}

      {/* Trees: instanced forest + pooled dynamic trees (destructible, see Trees.tsx) */}
      <Trees />

      {/* Destructible furniture (V9): lamps, planters, benches, bollards, bushes */}
      <DynamicProps />


    </group>
  );
}
