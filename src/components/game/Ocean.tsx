"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry } from "three";
import { WATER_LEVEL } from "@/data/archipelago";
import { buildOceanGrid, OCEAN_SPACING } from "@/game/ocean/oceanMesh";
import { createOceanMaterial, oceanUniforms } from "@/game/ocean/oceanMaterial";
import { boatWake } from "@/game/ocean/wake";
import { oceanClock } from "@/game/ocean/waves";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { BOAT_CONFIG, forwardSpeed } from "@/game/vehicle/boatPhysics";
import { liveBoat } from "@/game/vehicle/boatState";
import { treeWorld } from "@/game/world/treeWorld";
import { useGameStore } from "@/stores/gameStore";

let material: ReturnType<typeof createOceanMaterial> | null = null;
function getOceanMaterial() {
  if (!material) material = createOceanMaterial();
  return material;
}

/**
 * The ocean: one non-uniform grid (dense where the boat sails, coarse to the
 * horizon) displaced by the shared Gerstner table in the vertex shader. The
 * clock advances here once per frame; the boat reads the same clock, so the
 * hull and the rendered surface agree by construction.
 */
export function Ocean() {
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];
  const geometry = useMemo(() => {
    const grid = buildOceanGrid(OCEAN_SPACING[quality]);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(grid.positions, 3));
    g.setAttribute("aShore", new BufferAttribute(grid.shore, 1));
    g.setAttribute("aDense", new BufferAttribute(grid.dense, 1));
    g.setIndex(new BufferAttribute(grid.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [quality]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    oceanUniforms.uWhitecaps.value = profile.worldFx ? 1 : 0;
  }, [profile.worldFx]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    // Reduced motion: the sea still moves, slowly.
    oceanClock.time += treeWorld.reducedMotion ? dt * 0.35 : dt;
    oceanUniforms.uTime.value = oceanClock.time;
    // Wake: stern position, heading and the trail ring.
    const b = liveBoat.state;
    const fx = Math.sin(b.heading);
    const fz = Math.cos(b.heading);
    const v = Math.abs(forwardSpeed(b)) / BOAT_CONFIG.maxSpeed;
    oceanUniforms.uBoat.value.set(b.x - fx * 2.4, b.z - fz * 2.4, Math.min(1, v * 1.2 + b.throttle * 0.3));
    oceanUniforms.uBoatDir.value.set(fx, fz);
    // Upload the trail oldest → newest so the shader can draw continuous segments.
    const d = boatWake.data;
    for (let i = 0; i < boatWake.count; i++) {
      const k = boatWake.slot(i) * 4;
      oceanUniforms.uWake.value[i]!.set(d[k]!, d[k + 1]!, d[k + 2]!);
      oceanUniforms.uWakeStrength.value[i] = d[k + 3]!;
    }
    oceanUniforms.uWakeCount.value = boatWake.count;
  }, -5);

  // Drawn after the rest of the opaque world: the sea under the islands then fails the depth test before its
  // fragment shader runs (software renderers otherwise shade the whole hidden surface and overdraw it).
  return <mesh geometry={geometry} material={getOceanMaterial()} position={[0, WATER_LEVEL, 0]} frustumCulled={false} receiveShadow renderOrder={1} />;
}
