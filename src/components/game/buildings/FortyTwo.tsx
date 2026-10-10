"use client";

import { useEffect, useMemo } from "react";
import { getDistrict } from "@/data/districts";
import { makeMonogramTexture } from "@/lib/labelTexture";
import { palette } from "@/lib/palette";
import { getMaterials } from "../materials";
import { StaticBatch } from "../StaticBatch";
import { WindowGrid } from "./WindowGrid";

/**
 * 42 Madrid — modular technical campus.
 * Two ground-floor classroom modules flanking a covered entrance, a third
 * module bridging them on the upper floor, a stair tower, rooftop solar
 * array and a big "42" plate. Front face is +Z (south).
 */
export function FortyTwo() {
  const m = getMaterials();
  const d = getDistrict("fortytwo");
  const [x, z] = d.position;
  const [w, depth] = d.footprint; // 14 × 10
  const front = depth / 2;
  const modH = 3.4;
  const label = useMemo(() => makeMonogramTexture("42", palette.amber), []);
  useEffect(() => () => label.dispose(), [label]);

  const classroom = (mx: number, my: number, mw: number, md: number, mat: typeof m.facade, key: string) => (
    <group key={key} position={[mx, my, 0]}>
      <mesh material={mat} castShadow receiveShadow>
        <boxGeometry args={[mw, modH, md]} />
      </mesh>
      {/* Panel seams: thin vertical ribs on the front */}
      {Array.from({ length: Math.floor(mw / 1.4) }, (_, i) => (
        <mesh key={i} position={[-mw / 2 + 0.7 + i * 1.4, 0, md / 2 + 0.03]} material={m.facadeDark}>
          <boxGeometry args={[0.08, modH, 0.06]} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group position={[x, 0, z]}>
      <StaticBatch>
      {/* Ground floor modules and the covered entrance between them */}
      {classroom(-4.0, modH / 2, 5.6, depth, m.facade, "a")}
      {classroom(4.0, modH / 2, 5.6, depth, m.facade, "b")}
      <WindowGrid position={[-4.0, 1.9, front + 0.02]} rotationY={0} cols={3} rows={1} size={[1.2, 1.3]} gap={[1.6, 1]} lit={palette.windowCool} ratio={0.7} seed={41} />
      <WindowGrid position={[4.0, 1.9, front + 0.02]} rotationY={0} cols={3} rows={1} size={[1.2, 1.3]} gap={[1.6, 1]} lit={palette.windowCool} ratio={0.7} seed={42} />
      <mesh position={[0, 1.5, front - 1.4]} material={m.doorWarm}>
        <planeGeometry args={[2.0, 2.6]} />
      </mesh>
      <mesh position={[0, 1.6, -0.5]} material={m.facadeDark} receiveShadow>
        <boxGeometry args={[2.4, 3.2, depth - 2.9]} />
      </mesh>
      <mesh position={[0, modH - 0.05, front - 0.6]} material={m.concreteLight} castShadow>
        <boxGeometry args={[3.2, 0.2, 2.6]} />
      </mesh>
      <mesh position={[0, modH - 0.18, front + 0.5]} material={m.lightAmberSoft}>
        <boxGeometry args={[2.8, 0.05, 0.1]} />
      </mesh>
      <mesh position={[0, 0.08, front + 0.9]} material={m.concrete} receiveShadow>
        <boxGeometry args={[3.6, 0.16, 1.4]} />
      </mesh>

      {/* Upper module bridging the two, set back, with a wide window band and the 42 plate */}
      {classroom(0.6, modH + 0.2 + modH / 2, 8.4, depth - 1.6, m.facadeLight, "c")}
      <WindowGrid position={[0.6, modH + 0.2 + 1.7, front - 0.8 + 0.02]} rotationY={0} cols={5} rows={1} size={[1.1, 1.2]} gap={[1.5, 1]} lit={palette.windowWarm} ratio={0.8} seed={43} />
      <group position={[-4.9, modH + 0.2 + 1.7, front - 0.8 + 0.02]}>
        <mesh position={[0, 0, -0.04]} material={m.metalDark}>
          <boxGeometry args={[1.6, 1.6, 0.08]} />
        </mesh>
        <mesh>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial map={label} toneMapped={false} />
        </mesh>
      </group>
      {/* Stair tower on the east end */}
      <mesh position={[w / 2 - 0.9, 4.0, -depth / 2 + 1.6]} material={m.facadeDark} castShadow>
        <boxGeometry args={[1.8, 8.0, 2.6]} />
      </mesh>
      <mesh position={[w / 2 - 0.9, 4.0, -depth / 2 + 0.28]} material={m.glassAmber}>
        <boxGeometry args={[0.8, 7.4, 0.06]} />
      </mesh>

      {/* Rooftop solar array and masts */}
      {[-1.8, 0.2, 2.2].map((sx) => (
        <mesh key={sx} position={[sx, modH * 2 + 0.75, -1.5]} rotation={[-0.5, 0, 0]} material={m.glass} castShadow>
          <boxGeometry args={[1.8, 0.08, 2.2]} />
        </mesh>
      ))}
      {[-6.2, 6.2].map((px) => (
        <group key={px}>
          <mesh position={[px, modH + 2.2, front - 0.6]} material={m.metalDark}>
            <boxGeometry args={[0.1, 4.4, 0.1]} />
          </mesh>
          <mesh position={[px, modH + 4.5, front - 0.6]} material={m.lightAmber}>
            <sphereGeometry args={[0.16, 8, 8]} />
          </mesh>
        </group>
      ))}
      </StaticBatch>
    </group>
  );
}
