"use client";

import { useCallback, useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, InstancedMesh, Object3D } from "three";
import { CREATIVE_LAB_CENTER, getHarbor, getIsland, getPoi, insidePolygon, MAIN_COAST, pierBox, QUAY } from "@/data/archipelago";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { buildCoastSkirt, buildIslandTerrain, coastRocks, islandHeightAt, type RockInstance } from "@/game/world/islandTerrain";
import { seededRandom } from "@/lib/seededRandom";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { SignPanel } from "./DistrictSigns";
import { getMaterials } from "./materials";
import { StaticBatch } from "./StaticBatch";

function useTerrainGeometry(build: () => { positions: Float32Array; colors: Float32Array; indices: Uint32Array }) {
  const geometry = useMemo(() => {
    const t = build();
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(t.positions, 3));
    g.setAttribute("color", new BufferAttribute(t.colors, 3));
    g.setIndex(new BufferAttribute(t.indices, 1));
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function useRocks(rocks: RockInstance[]) {
  return useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      rocks.forEach((r, i) => {
        o.position.set(r.x, r.y, r.z);
        o.rotation.set(0, r.rotation, 0);
        o.scale.set(r.scale, r.scale * 0.7, r.scale * 0.85);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.count = rocks.length;
      mesh.instanceMatrix.needsUpdate = true;
    },
    [rocks],
  );
}

/** The main island's shore: a low-poly skirt from the platform edge into the sea, with rocks along the waterline. */
export function MainCoast() {
  const m = getMaterials();
  const island = getIsland("main");
  const geometry = useTerrainGeometry(() => buildCoastSkirt(island.coastline, MAIN_COAST.seed + 1));
  const pier = pierBox(getHarbor("pau-harbor"));
  const rocks = useMemo(
    () =>
      coastRocks(island.coastline, MAIN_COAST.seed + 2, {
        // Keep the quay face and the pier channel clear so the boat can leave.
        skip: (x, z) => (x < QUAY.x1 + 1 && z > QUAY.z0 - 6 && z < QUAY.z1 + 6) || (x > pier.minX - 6 && x < pier.maxX + 2 && z > pier.minZ - 10 && z < pier.maxZ + 10),
      }),
    [island.coastline, pier],
  );
  const refRocks = useRocks(rocks);
  return (
    <group>
      <mesh geometry={geometry} material={m.terrain} receiveShadow />
      <instancedMesh ref={refRocks} args={[undefined, undefined, Math.max(1, rocks.length)]} material={m.rock} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </instancedMesh>
    </group>
  );
}

interface TreeSpot {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
}

/**
 * Creative Lab Island: terrain from its coastline, rocks, a few pines, a
 * path from the pier to the lab pavilion, lamps and a sign. Experimental by
 * design: the pavilion is the point of interest, its content is pending.
 */
export function CreativeLabIsland() {
  const m = getMaterials();
  const profile = QUALITY_PROFILES[useGameStore((s) => s.quality)];
  const island = getIsland("creative-lab");
  const harbor = getHarbor("creative-lab-pier");
  const poi = getPoi("creative-lab");
  const center = CREATIVE_LAB_CENTER;
  const heightAt = useCallback((x: number, z: number) => islandHeightAt(island.coastline, center, island.landHeight, x, z), [island.coastline, island.landHeight, center]);
  const geometry = useTerrainGeometry(() => buildIslandTerrain(island.coastline, center, island.landHeight, 9090));
  const pier = pierBox(harbor);
  const rocks = useMemo(
    () => coastRocks(island.coastline, 9091, { density: 1.1, skip: (x, z) => x > pier.minX - 5 && z > pier.minZ - 7 && z < pier.maxZ + 7 }),
    [island.coastline, pier],
  );
  const refRocks = useRocks(rocks);

  // Path: from the pier root up to the pavilion, as flat steps that follow the terrain.
  const path = useMemo(() => {
    const steps: { x: number; y: number; z: number; rotation: number }[] = [];
    const from: [number, number] = [harbor.pierRoot[0] - 0.5, harbor.pierRoot[1]];
    const to: [number, number] = [poi.position[0] + 4.2, poi.position[1] + 1.2];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = from[0] + (to[0] - from[0]) * t;
      const z = from[1] + (to[1] - from[1]) * t;
      steps.push({ x, y: heightAt(x, z) + 0.06, z, rotation: Math.atan2(to[0] - from[0], to[1] - from[1]) });
    }
    return steps;
  }, [harbor.pierRoot, poi.position, heightAt]);

  const trees = useMemo(() => {
    const rand = seededRandom(9092);
    const out: TreeSpot[] = [];
    let attempts = 0;
    while (out.length < 16 && attempts < 200) {
      attempts++;
      const a = rand() * Math.PI * 2;
      const d = 6 + rand() * 12;
      const x = center[0] + Math.cos(a) * d;
      const z = center[1] - Math.sin(a) * d;
      if (!insidePolygon(island.coastline, x, z)) continue;
      // Not on the pavilion, not on the path corridor (east of the centre, near z = center).
      if (Math.hypot(x - poi.position[0], z - poi.position[1]) < 6.5) continue;
      if (x > center[0] + 2 && Math.abs(z - center[1]) < 4.5) continue;
      if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
      out.push({ x, y: heightAt(x, z) - 0.1, z, scale: 0.8 + rand() * 0.7, rotation: rand() * Math.PI * 2 });
    }
    return out;
  }, [center, island.coastline, poi.position, heightAt]);
  const refTrunks = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      trees.forEach((t, i) => {
        o.position.set(t.x, t.y + 0.7 * t.scale, t.z);
        o.rotation.set(0, t.rotation, 0);
        o.scale.setScalar(t.scale);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.count = trees.length;
      mesh.instanceMatrix.needsUpdate = true;
    },
    [trees],
  );
  const refCanopies = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      trees.forEach((t, i) => {
        o.position.set(t.x, t.y + 2.4 * t.scale, t.z);
        o.rotation.set(0, t.rotation, 0);
        o.scale.setScalar(t.scale);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.count = trees.length;
      mesh.instanceMatrix.needsUpdate = true;
    },
    [trees],
  );

  const [px, pz] = poi.position;
  const py = heightAt(px, pz);
  const lamps = useMemo(() => [path[4]!, path[9]!], [path]);

  return (
    <group>
      <mesh geometry={geometry} material={m.terrain} receiveShadow castShadow />
      <instancedMesh ref={refRocks} args={[undefined, undefined, Math.max(1, rocks.length)]} material={m.rock} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <instancedMesh ref={refTrunks} args={[undefined, undefined, Math.max(1, trees.length)]} material={m.trunk} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 1.4, 6]} />
      </instancedMesh>
      <instancedMesh ref={refCanopies} args={[undefined, undefined, Math.max(1, trees.length)]} material={m.bush} castShadow>
        <coneGeometry args={[1.25, 3.2, 7]} />
      </instancedMesh>
      <StaticBatch>
        {/* Path steps */}
        {path.map((s, i) => (
          <mesh key={i} material={m.sidewalk} position={[s.x, s.y, s.z]} rotation={[0, s.rotation, 0]} receiveShadow>
            <boxGeometry args={[2.4, 0.12, 1.9]} />
          </mesh>
        ))}
        {/* Lab pavilion: a low glass-fronted hall with a sloped roof and a beacon mast */}
        <mesh material={m.concrete} position={[px, py + 0.25, pz]} receiveShadow>
          <boxGeometry args={[9.5, 0.5, 7.5]} />
        </mesh>
        <mesh material={m.facade} position={[px, py + 1.9, pz]} castShadow receiveShadow>
          <boxGeometry args={[8, 3.2, 6]} />
        </mesh>
        <mesh material={m.glassClear} position={[px + 4.02, py + 1.8, pz]}>
          <boxGeometry args={[0.06, 2.4, 4.6]} />
        </mesh>
        <mesh material={m.doorCool} position={[px + 4.05, py + 1.2, pz + 1.6]}>
          <boxGeometry args={[0.04, 2.0, 1.0]} />
        </mesh>
        <mesh material={m.lightCyanSoft} position={[px + 4.04, py + 3.25, pz]}>
          <boxGeometry args={[0.05, 0.08, 5.6]} />
        </mesh>
        <mesh material={m.roof} position={[px - 0.4, py + 3.75, pz]} rotation={[0, 0, 0.07]} castShadow>
          <boxGeometry args={[9.2, 0.3, 6.8]} />
        </mesh>
        <mesh material={m.lightWindowCool} position={[px, py + 2.0, pz - 3.02]}>
          <boxGeometry args={[5.5, 1.1, 0.04]} />
        </mesh>
        <mesh material={m.lightWindowCool} position={[px, py + 2.0, pz + 3.02]}>
          <boxGeometry args={[5.5, 1.1, 0.04]} />
        </mesh>
        <mesh material={m.metalDark} position={[px - 3, py + 5.6, pz - 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 4.2, 6]} />
        </mesh>
        <mesh material={m.lightCyan} position={[px - 3, py + 7.9, pz - 2]}>
          <octahedronGeometry args={[0.45, 0]} />
        </mesh>
        {/* Sign post by the path end */}
        <mesh material={m.metalDark} position={[px + 5.6, py + 1.6, pz + 3.4]} castShadow>
          <boxGeometry args={[0.12, 3.2, 0.12]} />
        </mesh>
        {/* Lamps along the path */}
        {lamps.map((l, i) => (
          <group key={i}>
            <mesh material={m.metalDark} position={[l.x, l.y + 1.7, l.z + 1.5]} castShadow>
              <boxGeometry args={[0.12, 3.4, 0.12]} />
            </mesh>
            <mesh material={m.lightAmberSoft} position={[l.x, l.y + 3.35, l.z + 1.2]}>
              <boxGeometry args={[0.4, 0.12, 0.6]} />
            </mesh>
          </group>
        ))}
      </StaticBatch>
      <group position={[px + 5.6, py + 3.1, pz + 3.4]} rotation={[0, Math.PI / 2, 0]}>
        <SignPanel title="CREATIVE LAB" subtitle={poi.tagline} accent={palette.cyan} width={3.6} height={1.0} compact />
      </group>
      {profile.lampPools &&
        lamps.map((l, i) => (
          <mesh key={i} material={m.lampPool} position={[l.x, l.y + 0.08, l.z + 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.6, 16]} />
          </mesh>
        ))}
    </group>
  );
}

export function Islands() {
  return (
    <group>
      <MainCoast />
      <CreativeLabIsland />
    </group>
  );
}
