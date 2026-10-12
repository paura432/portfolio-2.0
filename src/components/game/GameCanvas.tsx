"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { ACESFilmicToneMapping, Vector2 } from "three";
import { cameraState, photoMode, probeState, type PhotoCamera } from "@/game/camera/photoMode";
import { cameraOccluders } from "@/game/camera/cameraClip";
import { resolveCollisions } from "@/game/physics/collision";
import type { LightingPresetId } from "@/game/render/lighting";
import { QUALITY_PROFILES, lowerQuality } from "@/game/render/quality";
import { particleStats } from "@/game/fx/particles";
import { liveBoat, placeBoat } from "@/game/vehicle/boatState";
import { bumpGeneration, liveVehicle, logVehicleState } from "@/game/vehicle/liveVehicle";
import { authorityOf, bodyModeOf, type VehicleState } from "@/game/vehicle/transformer";
import { boatSpeed } from "@/game/vehicle/boatPhysics";
import { liveCar } from "@/game/vehicle/carState";
import { poseOf, resolveVehicleMode, type VehicleMode } from "@/game/vehicle/vehicleManager";
import { livePlane, placePlane } from "@/game/vehicle/planeState";
import { heightAt, oceanClock } from "@/game/ocean/waves";
import type { HarborId } from "@/data/archipelago";
import type { BeachId } from "@/data/beaches";
import type { RampId } from "@/data/ramps";
import { debugLog, type ContactSample, type VehicleSample } from "@/game/physics/debugLog";
import { contactLog, obstacles } from "@/game/world/obstacles";
import type { PropCategory } from "@/game/world/propCatalog";
import { propWorld, type PropDef, type PropState } from "@/game/world/propWorld";
import { treeWorld, type TreeState } from "@/game/world/treeWorld";
import { type TreeDef } from "@/game/world/trees";
import { useGameStore, type Quality } from "@/stores/gameStore";
import { ImpactParticles } from "./ImpactParticles";
import { SkidMarks } from "./SkidMarks";
import { FollowCamera } from "./FollowCamera";
import { ProximitySensor } from "./ProximitySensor";
import { SceneLighting } from "./SceneLighting";
import { World } from "./World";
import { Signposts } from "./Signposts";
import { Harbor } from "./Harbor";
import { Vehicle } from "./Vehicle";
import { Ramps } from "./Ramps";
import { BoatSpray } from "./BoatSpray";
import { Islands } from "./Islands";
import { Ocean } from "./Ocean";
import { VehicleController } from "./VehicleController";
import { ContextLossHandler, FirstFrameSignal } from "./SceneSignals";
import { DebugColliders } from "./DebugColliders";

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
      /** V6: the boat (2D state plus the buoyancy pose) and the vehicle manager's view. */
      boat: () => { x: number; z: number; y: number; speed: number; heading: number; pitch: number; roll: number; throttle: number };
      teleportBoat: (x: number, z: number, heading: number) => void;
      /** V8: the one vehicle's state machine view and its authoritative pose. */
      vehicle: () => { state: VehicleState; authority: "car" | "boat" | "plane"; body: "car" | "boat" | "plane"; mode: VehicleMode; transition: string | null; mooredAt: HarborId | null; nearbyDock: HarborId | null; nearbyRamp: RampId | null; nearbyBeach: BeachId | null; landingZone: boolean; x: number; y: number; z: number; heading: number; speed: number; progress: number };
      /** V9: every state the machine went through since the last teleport / reset (no sampling race). */
      vehicleStates: () => VehicleState[];
      /** V7: the aircraft state while the car is in flight form. */
      plane: () => { x: number; y: number; z: number; heading: number; pitch: number; roll: number; speed: number; onGround: boolean; stalled: boolean; throttle: number };
      /** Stage the aircraft (test/capture tooling): on the ground in plane form, or airborne at cruise speed. */
      teleportPlane: (x: number, y: number, z: number, heading: number, airborne?: boolean) => void;
      /** Water surface height at a world point (the same function the boat floats on). */
      water: (x: number, z: number) => number;
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
      /** V9: destructible street furniture (read-only except `reset`, which is the HUD action). */
      props: {
        def: (id: number) => PropDef | undefined;
        state: (id: number) => PropState;
        /** Where the prop stands now (shoves included). */
        position: (id: number) => { x: number; z: number };
        /** Closest simulated prop to a point, optionally of one category. */
        nearest: (x: number, z: number, category?: PropCategory) => (PropDef & { dist: number }) | null;
        /** Its live collider, or null while it is down. */
        collider: (id: number) => { kind: string; x: number; z: number; r?: number; hx?: number; hz?: number; rotation?: number } | null;
        summary: () => { count: number; active: string[]; dynamic: number; down: number; phases: Record<string, number> };
        /** Recent simulation events (knock, shove, wobble, flatten, settle, restore), newest last. */
        events: () => { type: string; id: number; category: string; impact: number }[];
        reset: () => void;
        timeScale: (k: number) => void;
      };
      /** V9 debug tooling: the collider overlay and the static collider list. Never part of the product UI. */
      debug: {
        colliders: (on: boolean) => void;
        obstacles: () => { kind: string; id: string }[];
        contacts: () => { x: number; z: number; what: string }[];
        /** Telemetry ring buffers: on/off, then read the last n vehicle samples or contact samples on demand. */
        /** Follow camera: position, clip fraction (1 = unclipped) and whether it sits inside a building occluder. */
        camera: () => { x: number; y: number; z: number; clip: number; insideBuilding: boolean };
        telemetry: (on: boolean) => void;
        samples: (n?: number) => VehicleSample[];
        contactLog: (n?: number) => ContactSample[];
        clearLog: () => void;
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
        liveVehicle.y = 0;
        liveVehicle.vy = 0;
        liveVehicle.airborne = false;
        liveVehicle.onRamp = null;
        liveVehicle.sinceTransform = 10;
        logVehicleState("car", true);
        useGameStore.setState({ vehicleState: "car", transition: null, mooredAt: null, landingZone: false });
        bumpGeneration();
      },
      vehicleStates: () => [...liveVehicle.stateLog],
      boat: () => {
        const b = liveBoat.state;
        return { x: b.x, z: b.z, y: liveBoat.visual.y, speed: boatSpeed(b), heading: b.heading, pitch: liveBoat.visual.pitch, roll: liveBoat.visual.roll, throttle: b.throttle };
      },
      teleportBoat: (x, z, heading) => {
        placeBoat(x, z, heading);
        liveVehicle.sinceTransform = 10;
        logVehicleState("floating", true);
        useGameStore.setState({ vehicleState: "floating", transition: null, mooredAt: null, landingZone: false });
        bumpGeneration();
      },
      vehicle: () => {
        const s = useGameStore.getState();
        const p = poseOf(s.vehicleState);
        return { state: s.vehicleState, authority: authorityOf(s.vehicleState), body: bodyModeOf(s.vehicleState), mode: resolveVehicleMode(s.phase, s), transition: s.transition?.kind ?? null, mooredAt: s.mooredAt, nearbyDock: s.nearbyDock, nearbyRamp: s.nearbyRamp, nearbyBeach: s.nearbyBeach, landingZone: s.landingZone, x: p.x, y: p.y, z: p.z, heading: p.heading, speed: p.speed, progress: liveVehicle.progress() };
      },
      plane: () => {
        const p = livePlane.state;
        return { x: p.x, y: p.y, z: p.z, heading: p.heading, pitch: p.pitch, roll: p.roll, speed: p.speed, onGround: p.onGround, stalled: p.stalled, throttle: p.throttle };
      },
      teleportPlane: (x, y, z, heading) => {
        placePlane(x, y, z, heading, true);
        liveVehicle.sinceTransform = 10;
        logVehicleState("flying", true);
        useGameStore.setState({ vehicleState: "flying", transition: null, mooredAt: null, landingZone: false });
        bumpGeneration();
      },
      water: (x, z) => heightAt(x, z, oceanClock.time),
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
      props: {
        def: (id) => propWorld.defs[id],
        state: (id) => ({ ...propWorld.state(id) }),
        position: (id) => propWorld.positionOf(id),
        nearest: (x, z, category) => {
          let best: (PropDef & { dist: number }) | null = null;
          for (const d of propWorld.defs) {
            if (!propWorld.active.has(d.category)) continue;
            if (category && d.category !== category) continue;
            const dist = Math.hypot(d.x - x, d.z - z);
            if (!best || dist < best.dist) best = { ...d, dist };
          }
          return best;
        },
        collider: (id) => {
          if (!propWorld.isObstacle(id)) return null;
          const o = propWorld.obstacleOf(id);
          return o.kind === "round" ? { kind: o.kind, x: o.x, z: o.z, r: o.r } : o.kind === "obb" ? { kind: o.kind, x: o.x, z: o.z, hx: o.hx, hz: o.hz, rotation: o.rotation } : { kind: o.kind, x: (o.minX + o.maxX) / 2, z: (o.minZ + o.maxZ) / 2 };
        },
        summary: () => {
          const phases: Record<string, number> = {};
          for (const s of propWorld.states) phases[s.phase] = (phases[s.phase] ?? 0) + 1;
          return { count: propWorld.defs.length, active: [...propWorld.active], dynamic: propWorld.dynamicCount(), down: propWorld.downCount(), phases };
        },
        events: () => propWorld.history.map((e) => ({ type: e.type, id: e.id, category: e.category, impact: e.impact })),
        reset: () => propWorld.resetWorld(liveCar.state.x, liveCar.state.z),
        timeScale: (k) => {
          propWorld.timeScale = k;
        },
      },
      debug: {
        colliders: (on) => useGameStore.getState().setDebugColliders(on),
        obstacles: () => obstacles.map((o) => ({ kind: o.kind, id: o.id })),
        contacts: () => contactLog.items.map((c) => ({ x: c.x, z: c.z, what: c.what })),
        camera: () => ({ x: cameraState.x, y: cameraState.y, z: cameraState.z, clip: cameraState.clip, insideBuilding: resolveCollisions({ x: cameraState.x, z: cameraState.z, r: 0.2 }, cameraOccluders(obstacles), Infinity).hits.length > 0 }),
        telemetry: (on) => {
          debugLog.enabled = on;
          if (!on) debugLog.clear();
        },
        samples: (n = 60) => debugLog.vehicle.last(n).map((s) => ({ ...s })),
        contactLog: (n = 50) => debugLog.contacts.last(n).map((c) => ({ ...c })),
        clearLog: () => debugLog.clear(),
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
    // Development builds only: `?debug=colliders` switches the overlay on without the probe.
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "colliders") {
      useGameStore.getState().setDebugColliders(true);
    }
    return () => {
      delete window.__pauWorld;
      photoMode.camera = null;
      probeState.lockQuality = false;
      useGameStore.getState().setDebugColliders(false);
      debugLog.enabled = false;
      debugLog.clear();
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
      <Ocean />
      <Islands />
      <World />
      <Harbor />
      <Signposts />
      <VehicleController />
      <Ramps />
      <Vehicle />
      <BoatSpray />
      <ImpactParticles />
      <SkidMarks />
      <ProximitySensor />
      <DebugColliders />
      <FollowCamera />
    </Canvas>
  );
}
