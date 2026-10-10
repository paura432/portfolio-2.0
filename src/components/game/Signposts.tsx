"use client";

import { useEffect, useMemo } from "react";
import { buildSignposts, type SignpostEntry } from "@/game/world/signposts";
import { makeLabelTexture } from "@/lib/labelTexture";
import { palette } from "@/lib/palette";

const ARROW = { left: "←", right: "→", ahead: "↑" } as const;

function Panel({ entry, y }: { entry: SignpostEntry; y: number }) {
  const { district, side } = entry;
  const accent = district.built ? (district.accent === "cyan" ? palette.cyan : palette.amber) : palette.muted;
  const title = side === "left" ? `${ARROW.left} ${district.name}` : `${district.name} ${ARROW[side]}`;
  const texture = useMemo(
    () => makeLabelTexture({ title, subtitle: district.built ? district.tagline : "planned district", accent, compact: true }),
    [title, district.tagline, district.built, accent],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, y, 0]}>
      <planeGeometry args={[3.6, 1.05]} />
      <meshBasicMaterial map={texture} toneMapped={false} side={2} />
    </mesh>
  );
}

/** Direction signs at each plaza exit: contextual navigation toward the districts. */
export function Signposts() {
  const posts = useMemo(() => buildSignposts(), []);
  return (
    <>
      {posts.map((p) => (
        <group key={p.exit} position={[p.x, 0, p.z]} rotation={[0, p.rotationY, 0]}>
          <mesh position={[0, 1.9, 0]} castShadow>
            <boxGeometry args={[0.18, 3.8, 0.18]} />
            <meshStandardMaterial color={palette.buildingDark} />
          </mesh>
          {p.entries.map((e, i) => (
            <Panel key={e.district.id} entry={e} y={3.3 - i * 1.15} />
          ))}
        </group>
      ))}
    </>
  );
}
