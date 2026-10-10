"use client";

import { useEffect, useRef } from "react";
import type { DirectionalLight } from "three";
import { useFrame } from "@react-three/fiber";
import { LIGHTING_PRESETS } from "@/game/render/lighting";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { useGameStore } from "@/stores/gameStore";

/**
 * Three-point night lighting driven by a preset: cool key (moon), warm low
 * fill from the opposite side so volumes separate, a faint cyan rim from the
 * south, hemisphere + ambient for the base level. Exposure is per preset.
 */
export function SceneLighting() {
  const quality = useGameStore((s) => s.quality);
  const presetId = useGameStore((s) => s.lighting);
  const preset = LIGHTING_PRESETS[presetId];
  const profile = QUALITY_PROFILES[quality];
  const key = useRef<DirectionalLight>(null);

  // Exposure is a renderer uniform, applied before each frame when the preset changes.
  useFrame(({ gl }) => {
    if (gl.toneMappingExposure !== preset.exposure) gl.toneMappingExposure = preset.exposure;
  }, -20);

  // three only allocates the shadow map once; a new size needs the old map disposed.
  useEffect(() => {
    const light = key.current;
    if (!light?.shadow.map) return;
    light.shadow.map.dispose();
    light.shadow.map = null;
    light.shadow.needsUpdate = true;
  }, [profile.shadowMapSize]);

  return (
    <>
      <color attach="background" args={[preset.background]} />
      <fog attach="fog" args={[preset.background, preset.fog.near, preset.fog.far]} />
      <hemisphereLight args={[preset.hemisphere.sky, preset.hemisphere.ground, preset.hemisphere.intensity]} />
      <ambientLight intensity={preset.ambient.intensity} color={preset.ambient.color} />
      <directionalLight
        ref={key}
        position={preset.key.position}
        intensity={preset.key.intensity}
        color={preset.key.color}
        castShadow={profile.shadows}
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.05}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-near={10}
        shadow-camera-far={180}
      />
      <directionalLight position={preset.fill.position} intensity={preset.fill.intensity} color={preset.fill.color} />
      <directionalLight position={preset.rim.position} intensity={preset.rim.intensity} color={preset.rim.color} />
    </>
  );
}
