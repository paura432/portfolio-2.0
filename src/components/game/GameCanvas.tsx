"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Vector2 } from "three";
import { photoMode, probeState, type PhotoCamera } from "@/game/camera/photoMode";
import { liveCar } from "@/game/vehicle/carState";
import { useGameStore, type Quality } from "@/stores/gameStore";
import { Car } from "./Car";
import { FollowCamera } from "./FollowCamera";
import { ProximitySensor } from "./ProximitySensor";
import { SceneLighting } from "./SceneLighting";
import { World } from "./World";
import { Signposts } from "./Signposts";
import { ContextLossHandler, FirstFrameSignal } from "./SceneSignals";

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

export interface RenderStats {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  dpr: number;
  width: number;
  height: number;
}

declare global {
  interface Window {
    /** Read-only probe used by Playwright tests and the capture tooling. Not part of the product. */
    __pauWorld?: {
      car: () => { x: number; z: number; speed: number; heading: number };
      /** Place the car (test/capture tooling). */
      teleport: (x: number, z: number, heading: number) => void;
      /** Fixed camera for reproducible screenshots; null restores the follow camera. */
      photo: (camera: PhotoCamera | null) => void;
      setQuality: (q: Quality, lock?: boolean) => void;
      stats: () => RenderStats;
    };
  }
}

/** Exposes the probe API; lives inside the Canvas so it can read the renderer. */
function Probe() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    window.__pauWorld = {
      car: () => ({ x: liveCar.state.x, z: liveCar.state.z, speed: liveCar.state.speed, heading: liveCar.state.heading }),
      teleport: (x, z, heading) => {
        liveCar.state = { ...liveCar.state, x, z, heading, speed: 0, steerAngle: 0 };
        liveCar.generation++;
      },
      photo: (camera) => {
        photoMode.camera = camera;
      },
      setQuality: (q, lock = false) => {
        probeState.lockQuality = lock;
        useGameStore.getState().setQuality(q);
      },
      stats: () => {
        const size = gl.getSize(new Vector2());
        return {
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures,
          programs: gl.info.programs?.length ?? 0,
          dpr: gl.getPixelRatio(),
          width: size.x,
          height: size.y,
        };
      },
    };
    return () => {
      delete window.__pauWorld;
      photoMode.camera = null;
      probeState.lockQuality = false;
    };
  }, [gl]);
  return null;
}

export function GameCanvas() {
  const setQuality = useGameStore((s) => s.setQuality);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ fov: 50, near: 0.5, far: 240, position: [0, 8, 40] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-hidden
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor
        onDecline={() => {
          if (!probeState.lockQuality) setQuality("low");
        }}
        flipflops={2}
      />
      <QualityController />
      <Probe />
      <FirstFrameSignal />
      <ContextLossHandler />
      <SceneLighting />
      <World />
      <Signposts />
      <Car />
      <ProximitySensor />
      <FollowCamera />
    </Canvas>
  );
}
