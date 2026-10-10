"use client";

import { useMemo } from "react";
import { buildSignposts, SIGNPOST_PANEL_PITCH, SIGNPOST_TOP_Y, type SignpostEntry } from "@/game/world/signposts";
import { accentHex, palette } from "@/lib/palette";
import { SignPanel } from "./DistrictSigns";
import { getMaterials } from "./materials";

const ARROW = { left: "←", right: "→", ahead: "↑" } as const;

function Panel({ entry, y }: { entry: SignpostEntry; y: number }) {
  const { district, side } = entry;
  const accent = district.built ? accentHex[district.accent] : palette.muted;
  const title = side === "left" ? `${ARROW.left} ${district.name}` : `${district.name} ${ARROW[side]}`;
  return (
    <group position={[0, y, 0]}>
      <SignPanel title={title} subtitle={district.built ? district.tagline : "planned district"} accent={accent} width={2.9} height={0.84} compact />
    </group>
  );
}

/** Direction signs at each plaza exit: contextual navigation toward the districts. Single-sided, facing the plaza. */
export function Signposts() {
  const m = getMaterials();
  const posts = useMemo(() => buildSignposts(), []);
  return (
    <>
      {posts.map((p) => (
        <group key={p.exit} position={[p.x, 0, p.z]} rotation={[0, p.rotationY, 0]}>
          <mesh position={[0, SIGNPOST_TOP_Y / 2 + 0.25, -0.1]} material={m.metalDark} castShadow>
            <boxGeometry args={[0.14, SIGNPOST_TOP_Y + 0.5, 0.14]} />
          </mesh>
          {p.entries.map((e, i) => (
            <Panel key={e.district.id} entry={e} y={SIGNPOST_TOP_Y - i * SIGNPOST_PANEL_PITCH} />
          ))}
        </group>
      ))}
    </>
  );
}
