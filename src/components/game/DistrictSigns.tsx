"use client";

import { useEffect, useMemo } from "react";
import { builtDistricts, type District } from "@/data/districts";
import { makeLabelTexture } from "@/lib/labelTexture";
import { palette } from "@/lib/palette";

function Sign({ district }: { district: District }) {
  const accent = district.accent === "cyan" ? palette.cyan : palette.amber;
  const texture = useMemo(
    () => makeLabelTexture({ title: district.name, subtitle: district.tagline, accent }),
    [district.name, district.tagline, accent],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  const [ex, ez] = district.entrance;
  const [bx, bz] = district.position;
  const dx = bx - ex;
  const dz = bz - ez;
  const len = Math.hypot(dx, dz) || 1;
  const facing = Math.atan2(-dx, -dz);

  if (district.kind === "hub") {
    // The hub sign hangs on the pavilion wall, facing the road the player arrives from.
    const r = district.footprint[0] / 2;
    return (
      <group position={[bx - (dx / len) * (r + 0.08), 1.9, bz - (dz / len) * (r + 0.08)]} rotation={[0, facing, 0]}>
        <mesh>
          <planeGeometry args={[4.6, 1.34]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  // Project signs stand between the entrance and the building, facing the road.
  const offset = 3.2;
  const x = ex + (dx / len) * offset;
  const z = ez + (dz / len) * offset;

  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <mesh position={[-2.4, 1.6, 0]} castShadow>
        <boxGeometry args={[0.16, 3.2, 0.16]} />
        <meshStandardMaterial color={palette.buildingDark} />
      </mesh>
      <mesh position={[2.4, 1.6, 0]} castShadow>
        <boxGeometry args={[0.16, 3.2, 0.16]} />
        <meshStandardMaterial color={palette.buildingDark} />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <planeGeometry args={[5.4, 1.58]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={2} />
      </mesh>
    </group>
  );
}

export function DistrictSigns() {
  return (
    <>
      {builtDistricts.map((d) => (
        <Sign key={d.id} district={d} />
      ))}
    </>
  );
}
