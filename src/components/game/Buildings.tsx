"use client";

import { districts } from "@/data/districts";
import { Duplex } from "./buildings/Duplex";
import { Hub } from "./buildings/Hub";
import { Ovi } from "./buildings/Ovi";
import { getMaterials } from "./materials";

/** Reserved plots for unbuilt districts: a low plinth with corner markers, no content. */
function ReservedPlots() {
  const m = getMaterials();
  return (
    <>
      {districts
        .filter((d) => !d.built)
        .map((d) => {
          const [w, dp] = d.footprint;
          return (
            <group key={d.id} position={[d.position[0], 0, d.position[1]]}>
              <mesh position={[0, 0.1, 0]} material={m.facadeDark} receiveShadow>
                <boxGeometry args={[w, 0.2, dp]} />
              </mesh>
              {[
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
              ].map(([sx, sz], i) => (
                <mesh key={i} position={[(sx! * (w - 0.6)) / 2, 0.5, (sz! * (dp - 0.6)) / 2]} material={m.metalDark}>
                  <boxGeometry args={[0.2, 0.8, 0.2]} />
                </mesh>
              ))}
            </group>
          );
        })}
    </>
  );
}

export function Buildings() {
  return (
    <group>
      <Hub />
      <Duplex />
      <Ovi />
      <ReservedPlots />
    </group>
  );
}
