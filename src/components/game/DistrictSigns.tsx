"use client";

import { useEffect, useMemo } from "react";
import { builtDistricts, type District } from "@/data/districts";
import { SIGN_MOUNTS } from "@/game/world/signage";
import { makeLabelTexture } from "@/lib/labelTexture";
import { accentHex } from "@/lib/palette";
import { getMaterials } from "./materials";

/** Single-sided label on a solid backing plate: readable from the front, dark from behind, never mirrored. */
export function SignPanel({ title, subtitle, accent, width, height, compact = false }: { title: string; subtitle?: string; accent: string; width: number; height: number; compact?: boolean }) {
  const m = getMaterials();
  const texture = useMemo(() => makeLabelTexture({ title, subtitle, accent, compact }), [title, subtitle, accent, compact]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <mesh position={[0, 0, -0.04]} material={m.metalDark}>
        <boxGeometry args={[width + 0.12, height + 0.12, 0.08]} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Sign({ district }: { district: District }) {
  const mount = SIGN_MOUNTS[district.id];
  if (!mount) return null;
  const accent = accentHex[district.accent];
  return (
    <group position={mount.position} rotation={[0, mount.rotationY, 0]}>
      <SignPanel title={district.name} subtitle={district.tagline} accent={accent} width={mount.width} height={mount.height} />
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
