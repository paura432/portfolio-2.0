"use client";

import { useEffect } from "react";
import { liveCar } from "@/game/vehicle/carState";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useGameStore } from "@/stores/gameStore";
import { Car } from "./Car";
import { FollowCamera } from "./FollowCamera";
import { ProximitySensor } from "./ProximitySensor";
import { SceneLighting } from "./SceneLighting";
import { World } from "./World";

/** Applies the quality tier to the renderer without remounting the canvas. */
function QualityController() {
  const quality = useGameStore((s) => s.quality);
  const setDpr = useThree((s) => s.setDpr);
  useEffect(() => {
    const max = quality === "high" ? 1.5 : 1;
    setDpr(Math.min(window.devicePixelRatio || 1, max));
  }, [quality, setDpr]);
  return null;
}

declare global {
  interface Window {
    /** Read-only probe used by the Playwright smoke test. */
    __pauWorld?: { car: () => { x: number; z: number; speed: number } };
  }
}

export function GameCanvas() {
  const setSceneReady = useGameStore((s) => s.setSceneReady);
  const setQuality = useGameStore((s) => s.setQuality);

  useEffect(() => {
    window.__pauWorld = { car: () => ({ x: liveCar.state.x, z: liveCar.state.z, speed: liveCar.state.speed }) };
    return () => {
      delete window.__pauWorld;
    };
  }, []);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ fov: 50, near: 0.5, far: 240, position: [0, 8, 40] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={() => setSceneReady(true)}
      aria-hidden
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor onDecline={() => setQuality("low")} flipflops={2} />
      <QualityController />
      <SceneLighting />
      <World />
      <Car />
      <ProximitySensor />
      <FollowCamera />
    </Canvas>
  );
}
