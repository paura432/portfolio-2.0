"use client";

import { useCallback, useMemo } from "react";
import { InstancedMesh, Object3D } from "three";
import { getHarbor, getIsland, pierBox } from "@/data/archipelago";
import { runwayLights, SKYPORT } from "@/data/skyport";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { coastRocks } from "@/game/world/islandTerrain";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { SignPanel } from "./DistrictSigns";
import { useRocks, useTerrainGeometry } from "./Islands";
import { buildCoastSkirt } from "@/game/world/islandTerrain";
import { getMaterials } from "./materials";
import { StaticBatch } from "./StaticBatch";

const PILE_BOTTOM = -4.2;

/**
 * Skyport Island (V7): a flat technological slab east of the city with its
 * runway, the transformation pad on the threshold, hangar, control tower,
 * terminal, lights and signs, reached over a causeway from the east cross
 * road (the road itself is part of the road network) and by boat at its pier.
 */
export function Skyport() {
  const m = getMaterials();
  const profile = QUALITY_PROFILES[useGameStore((s) => s.quality)];
  const island = getIsland("skyport");
  const { slab, causeway, pad, runway, hangar, tower, terminal } = SKYPORT;
  const pier = pierBox(getHarbor("skyport-pier"));
  const skirt = useTerrainGeometry(() =>
    buildCoastSkirt(island.coastline, 7070, (x, z) => [Math.max(slab.minX, Math.min(slab.maxX, x)), Math.max(slab.minZ, Math.min(slab.maxZ, z))]),
  );
  const rocks = useMemo(
    () =>
      coastRocks(island.coastline, 7071, {
        density: 1.0,
        skip: (x, z) => (x < slab.minX + 2 && Math.abs(z) < causeway.width) || (z > slab.maxZ && x > pier.minX - 6 && x < pier.maxX + 6) || (x > runway.maxX - 4 && z > runway.minZ - 6 && z < runway.maxZ + 6),
      }),
    [island.coastline, slab, causeway.width, pier, runway],
  );
  const refRocks = useRocks(rocks);
  const lights = useMemo(() => runwayLights(), []);
  const edgeLights = useMemo(() => lights.filter((l) => l.kind === "edge"), [lights]);
  const thresholdLights = useMemo(() => lights.filter((l) => l.kind !== "edge"), [lights]);
  const refEdge = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      edgeLights.forEach((l, i) => {
        o.position.set(l.x, 0.14, l.z);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.count = edgeLights.length;
      mesh.instanceMatrix.needsUpdate = true;
    },
    [edgeLights],
  );
  const refThreshold = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      thresholdLights.forEach((l, i) => {
        o.position.set(l.x, l.kind === "approach" ? 1.3 : 0.12, l.z);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.count = thresholdLights.length;
      mesh.instanceMatrix.needsUpdate = true;
    },
    [thresholdLights],
  );
  const dashes = useMemo(() => {
    const out: number[] = [];
    for (let x = runway.minX + 8; x < runway.maxX - 6; x += 6) out.push(x);
    return out;
  }, [runway]);
  const piles = useMemo(() => {
    const out: number[] = [];
    for (let x = causeway.fromX + 3; x < causeway.toX; x += 6) out.push(x);
    return out;
  }, [causeway]);
  const cx = (slab.minX + slab.maxX) / 2;
  const cz = (slab.minZ + slab.maxZ) / 2;
  const rw = runway.maxX - runway.minX;
  const rd = runway.maxZ - runway.minZ;
  const rx = (runway.minX + runway.maxX) / 2;
  const rz = (runway.minZ + runway.maxZ) / 2;

  return (
    <group>
      <mesh geometry={skirt} material={m.terrain} receiveShadow />
      <instancedMesh ref={refRocks} args={[undefined, undefined, Math.max(1, rocks.length)]} material={m.rock} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <StaticBatch>
        {/* Slab: top at 0 like the city platform; paved technical surface */}
        <mesh material={m.ground} position={[cx, -1.7, cz]} receiveShadow>
          <boxGeometry args={[slab.maxX - slab.minX, 3.4, slab.maxZ - slab.minZ]} />
        </mesh>
        <mesh material={m.sidewalk} position={[cx, 0.012, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[slab.maxX - slab.minX - 1, slab.maxZ - slab.minZ - 1]} />
        </mesh>
        {/* Causeway deck on piles with railings and cyan guide strips */}
        <mesh material={m.deck} position={[(causeway.fromX + causeway.toX) / 2, -0.3, causeway.z]} castShadow receiveShadow>
          <boxGeometry args={[causeway.toX - causeway.fromX + 2, 0.6, causeway.width]} />
        </mesh>
        {piles.map((x) => (
          <group key={x}>
            {[-1, 1].map((s) => (
              <mesh key={s} material={m.pile} position={[x, (PILE_BOTTOM - 0.6) / 2, causeway.z + s * (causeway.width / 2 - 1)]}>
                <cylinderGeometry args={[0.45, 0.55, 0.6 - PILE_BOTTOM, 8]} />
              </mesh>
            ))}
            <mesh material={m.pile} position={[x, -0.9, causeway.z]}>
              <boxGeometry args={[0.5, 0.5, causeway.width - 1.5]} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh material={m.metal} position={[(causeway.fromX + causeway.toX) / 2, 1.0, causeway.z + s * (causeway.width / 2 - 0.2)]}>
              <boxGeometry args={[causeway.toX - causeway.fromX, 0.06, 0.06]} />
            </mesh>
            <mesh material={m.lightCyanSoft} position={[(causeway.fromX + causeway.toX) / 2, 0.02, causeway.z + s * (causeway.width / 2 - 0.4)]}>
              <boxGeometry args={[causeway.toX - causeway.fromX, 0.03, 0.08]} />
            </mesh>
            {piles.map((x) => (
              <mesh key={x} material={m.metalDark} position={[x, 0.5, causeway.z + s * (causeway.width / 2 - 0.2)]}>
                <boxGeometry args={[0.08, 1.0, 0.08]} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Runway: dark surface, centre dashes, threshold bars, edge stripes */}
        <mesh material={m.asphalt} position={[rx, 0.02, rz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[rw, rd]} />
        </mesh>
        {dashes.map((x) => (
          <mesh key={x} material={m.roadLine} position={[x, 0.035, rz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3, 0.3]} />
          </mesh>
        ))}
        {[runway.minX + 1.5, runway.maxX - 1.5].map((x) => (
          <group key={x}>
            {[-3.5, -2, -0.5, 1, 2.5].map((dz) => (
              <mesh key={dz} material={m.crosswalk} position={[x, 0.035, rz + dz + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2.4, 0.7]} />
              </mesh>
            ))}
          </group>
        ))}
        {[runway.minZ + 0.3, runway.maxZ - 0.3].map((z) => (
          <mesh key={z} material={m.roadLineDim} position={[rx, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[rw - 1, 0.25]} />
          </mesh>
        ))}
        {/* Transformation pad on the threshold: disc, ring, lettering stripes and four masts */}
        <mesh material={m.concreteLight} position={[pad.x, 0.03, pad.z]}>
          <cylinderGeometry args={[pad.radius, pad.radius, 0.04, 32]} />
        </mesh>
        <mesh material={m.lightCyanSoft} position={[pad.x, 0.06, pad.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[pad.radius - 0.5, pad.radius - 0.25, 48]} />
        </mesh>
        <mesh material={m.lightAmberSoft} position={[pad.x, 0.06, pad.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 1.7, 32]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const x = pad.x + Math.cos(a) * (pad.radius + 1.2);
          const z = pad.z + Math.sin(a) * (pad.radius + 1.2);
          return (
            <group key={i}>
              <mesh material={m.metalDark} position={[x, 1.6, z]} castShadow>
                <boxGeometry args={[0.14, 3.2, 0.14]} />
              </mesh>
              <mesh material={m.lightAmberSoft} position={[x, 3.3, z]}>
                <boxGeometry args={[0.36, 0.14, 0.36]} />
              </mesh>
            </group>
          );
        })}
        {/* Hangar: open front toward the runway, orange door band, cyan roof strip */}
        <mesh material={m.facade} position={[hangar.x, hangar.h / 2, hangar.z + hangar.d / 2 - 0.3]} castShadow receiveShadow>
          <boxGeometry args={[hangar.w, hangar.h, 0.6]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.facade} position={[hangar.x + s * (hangar.w / 2 - 0.3), hangar.h / 2, hangar.z]} castShadow receiveShadow>
            <boxGeometry args={[0.6, hangar.h, hangar.d]} />
          </mesh>
        ))}
        <mesh material={m.roof} position={[hangar.x, hangar.h + 0.2, hangar.z]} castShadow>
          <boxGeometry args={[hangar.w + 0.8, 0.4, hangar.d + 0.8]} />
        </mesh>
        <mesh material={m.carBody} position={[hangar.x, hangar.h - 0.7, hangar.z - hangar.d / 2 + 0.02]}>
          <boxGeometry args={[hangar.w - 1.4, 0.5, 0.08]} />
        </mesh>
        <mesh material={m.lightCyanSoft} position={[hangar.x, hangar.h + 0.45, hangar.z - hangar.d / 2 - 0.3]}>
          <boxGeometry args={[hangar.w + 0.4, 0.08, 0.08]} />
        </mesh>
        <mesh material={m.concrete} position={[hangar.x, 0.06, hangar.z]} receiveShadow>
          <boxGeometry args={[hangar.w - 1.2, 0.12, hangar.d]} />
        </mesh>
        <mesh material={m.metalDark} position={[hangar.x + hangar.w / 2 + 1.2, 2.2, hangar.z - hangar.d / 2 - 0.5]} castShadow>
          <boxGeometry args={[0.12, 4.4, 0.12]} />
        </mesh>
        {/* Control tower: shaft, cab, red beacon */}
        <mesh material={m.facadeDark} position={[tower.x, tower.h / 2 - 1.5, tower.z]} castShadow receiveShadow>
          <boxGeometry args={[tower.w - 1.2, tower.h - 3, tower.d - 1.2]} />
        </mesh>
        <mesh material={m.glassClear} position={[tower.x, tower.h - 1.2, tower.z]} castShadow>
          <boxGeometry args={[tower.w + 1.5, 2.4, tower.d + 1.5]} />
        </mesh>
        <mesh material={m.roof} position={[tower.x, tower.h + 0.15, tower.z]}>
          <boxGeometry args={[tower.w + 2, 0.3, tower.d + 2]} />
        </mesh>
        <mesh material={m.lightWindowWarm} position={[tower.x, tower.h - 1.2, tower.z - tower.d / 2 - 0.8]}>
          <boxGeometry args={[tower.w + 0.6, 1.2, 0.05]} />
        </mesh>
        <mesh material={m.metal} position={[tower.x, tower.h + 1.4, tower.z]}>
          <cylinderGeometry args={[0.05, 0.08, 2.2, 6]} />
        </mesh>
        <mesh material={m.beaconRed} position={[tower.x, tower.h + 2.6, tower.z]}>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
        </mesh>
        <mesh material={m.lightCyanSoft} position={[tower.x, tower.h - 2.5, tower.z]}>
          <boxGeometry args={[tower.w + 1.6, 0.08, tower.d + 1.6]} />
        </mesh>
        {/* Terminal */}
        <mesh material={m.facadeLight} position={[terminal.x, terminal.h / 2, terminal.z]} castShadow receiveShadow>
          <boxGeometry args={[terminal.w, terminal.h, terminal.d]} />
        </mesh>
        <mesh material={m.roof} position={[terminal.x, terminal.h + 0.12, terminal.z]} castShadow>
          <boxGeometry args={[terminal.w + 0.6, 0.24, terminal.d + 0.6]} />
        </mesh>
        <mesh material={m.lightWindowWarm} position={[terminal.x, terminal.h / 2, terminal.z - terminal.d / 2 - 0.02]}>
          <boxGeometry args={[terminal.w - 2, 1.4, 0.05]} />
        </mesh>
        <mesh material={m.lightCyanSoft} position={[terminal.x, terminal.h - 0.3, terminal.z - terminal.d / 2 - 0.04]}>
          <boxGeometry args={[terminal.w - 1, 0.06, 0.05]} />
        </mesh>
        {/* Approach-light piles beyond the east threshold */}
        {SKYPORT.approachLights.map((x) => (
          <mesh key={x} material={m.pile} position={[x, (PILE_BOTTOM + 1.2) / 2, rz]}>
            <cylinderGeometry args={[0.18, 0.22, 1.2 - PILE_BOTTOM, 6]} />
          </mesh>
        ))}
        {/* Windsock */}
        <mesh material={m.metalDark} position={[runway.maxX + 6, 2.2, runway.minZ - 4]}>
          <cylinderGeometry args={[0.05, 0.07, 4.4, 6]} />
        </mesh>
        <mesh material={m.carBody} position={[runway.maxX + 6.9, 4.2, runway.minZ - 4]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.28, 1.8, 8, 1, true]} />
        </mesh>
      </StaticBatch>
      {/* Lights: cyan edge lights, amber threshold and approach lights */}
      <instancedMesh ref={refEdge} args={[undefined, undefined, Math.max(1, edgeLights.length)]} material={m.lightCyan}>
        <boxGeometry args={[0.3, 0.28, 0.3]} />
      </instancedMesh>
      <instancedMesh ref={refThreshold} args={[undefined, undefined, Math.max(1, thresholdLights.length)]} material={m.lightAmber}>
        <boxGeometry args={[0.3, 0.24, 0.5]} />
      </instancedMesh>
      <group position={[hangar.x + hangar.w / 2 + 1.2, 3.9, hangar.z - hangar.d / 2 - 0.5]} rotation={[0, Math.PI, 0]}>
        <SignPanel title="SKYPORT" subtitle={SKYPORT.tagline} accent={palette.cyan} width={3.8} height={1.1} />
      </group>
      {profile.lampPools && (
        <>
          <mesh material={m.cyanPool} position={[pad.x, 0.028, pad.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[pad.radius - 0.3, 32]} />
          </mesh>
          <mesh material={m.lampPool} position={[hangar.x, 0.03, hangar.z - hangar.d / 2 - 3]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[5, 20]} />
          </mesh>
        </>
      )}
    </group>
  );
}
