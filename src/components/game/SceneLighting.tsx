"use client";

import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";

/** Night lighting: cool moonlight key, hemisphere fill, fog matching the background. */
export function SceneLighting() {
  const quality = useGameStore((s) => s.quality);
  const shadows = quality === "high";
  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 70, 170]} />
      <hemisphereLight args={["#6F93B8", "#152A42", 1.1]} />
      <ambientLight intensity={0.35} color="#9FB8D6" />
      <directionalLight
        position={[40, 60, 25]}
        intensity={2.4}
        color="#D6E4F5"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-normalBias={0.04}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-near={10}
        shadow-camera-far={180}
      />
    </>
  );
}
