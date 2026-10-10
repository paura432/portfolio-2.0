"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { ACESFilmicToneMapping, Vector2 } from "three";
import { photoMode, probeState, type PhotoCamera } from "@/game/camera/photoMode";
import type { LightingPresetId } from "@/game/render/lighting";
import { QUALITY_PROFILES, lowerQuality } from "@/game/render/quality";
import { particleStats } from "@/game/fx/particles";
import { liveCar } from "@/game/vehicle/carState";
import { treeWorld, type TreeState } from "@/game/world/treeWorld";
import { type TreeDef } from "@/game/world/trees";
import { useGameStore, type Quality } from "@/stores/gameStore";
import { Car } from "./Car";
import { ImpactParticles } from "./ImpactParticles";
import { SkidMarks } from "./SkidMarks";
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
    setDpr(Math.min(window.devicePixelRatio || 1, QUALITY_PROFILES[quality].maxDpr));
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
  /** V4: trees currently animating / lying down, live particles. */
  dynamicTrees: number;
  fallenTrees: number;
  particles: number;
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
      setLighting: (l: LightingPresetId) => void;
      /** Average FPS over a sampling window. */
      fps: (ms?: number) => Promise<number>;
      stats: () => RenderStats;
      /** Destructible trees (read-only except `reset`, which is the HUD action). */
      trees: {
        def: (id: number) => TreeDef | undefined;
        state: (id: number) => TreeState;
        /** Closest rendered tree to a point. */
        nearest: (x: number, z: number) => (TreeDef & { dist: number }) | null;
        summary: () => { active: number; dynamic: number; fallen: number; reducedMotion: boolean; phases: Record<string, number> };
        reset: () => void;
        /** Capture tooling: slow-motion factor for the tree simulation. */
        timeScale: (k: number) => void;
      };
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
      setLighting: (l) => useGameStore.getState().setLighting(l),
      fps: (ms = 2000) =>
        new Promise<number>((resolve) => {
          let frames = 0;
          const start = performance.now();
          const tick = () => {
            frames++;
            if (performance.now() - start < ms) requestAnimationFrame(tick);
            else resolve((frames * 1000) / (performance.now() - start));
          };
          requestAnimationFrame(tick);
        }),
      trees: {
        def: (id) => treeWorld.defs[id],
        state: (id) => ({ ...treeWorld.state(id) }),
        nearest: (x, z) => {
          let best: (TreeDef & { dist: number }) | null = null;
          for (const d of treeWorld.defs) {
            if (d.id >= treeWorld.activeCount) continue;
            const dist = Math.hypot(d.x - x, d.z - z);
            if (!best || dist < best.dist) best = { ...d, dist };
          }
          return best;
        },
        summary: () => {
          const phases: Record<string, number> = {};
          for (const s of treeWorld.states) phases[s.phase] = (phases[s.phase] ?? 0) + 1;
          return { active: treeWorld.activeCount, dynamic: treeWorld.dynamicCount(), fallen: treeWorld.fallenCount(), reducedMotion: treeWorld.reducedMotion, phases };
        },
        reset: () => treeWorld.resetWorld(liveCar.state.x, liveCar.state.z),
        timeScale: (k) => {
          treeWorld.timeScale = k;
        },
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
          dynamicTrees: treeWorld.dynamicCount(),
          fallenTrees: treeWorld.fallenCount(),
          particles: particleStats.active,
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
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping }}
      aria-hidden
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor
        onDecline={() => {
          if (!probeState.lockQuality) setQuality(lowerQuality(useGameStore.getState().quality));
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
      <ImpactParticles />
      <SkidMarks />
      <ProximitySensor />
      <FollowCamera />
    </Canvas>
  );
}
