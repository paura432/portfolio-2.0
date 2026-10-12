"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { blendConfigs, configForAspect, damp, desiredCamera, profilesFor, SWELL_TO_CAMERA, type FollowConfig } from "@/game/camera/followCamera";
import { cameraOccluders, clipFraction } from "@/game/camera/cameraClip";
import { cameraState, photoMode } from "@/game/camera/photoMode";
import { authorityOf, bodyModeOf, isTransforming } from "@/game/vehicle/transformer";
import { generationOf, poseOf, transitionClock } from "@/game/vehicle/vehicleManager";
import { groundHeightAt } from "@/game/world/ground";
import { impactBus } from "@/game/world/impactBus";
import { obstacles } from "@/game/world/obstacles";
import { treeWorld } from "@/game/world/treeWorld";
import { useGameStore } from "@/stores/gameStore";

/** Altitude above the ground at which the framing is fully the flight profile. */
const FLIGHT_BLEND_ALTITUDE = 8;

/**
 * Smooth third-person camera for PAU TRANSFORMER-X; damping is exponential so
 * it is frame-rate independent. One camera, four framings: the car profile on
 * the ground, the boat profile on the water, the flight profile in the air
 * (reached by a continuous blend with altitude, so lips and touchdowns need
 * no cut), and a pulled-back framing while parts move. Mode changes
 * interpolate position, target and field of view; a pier glide eases from the
 * current framing; resets snap.
 */
export function FollowCamera() {
  const target = useRef(new Vector3());
  const seenGeneration = useRef(-1);
  const blendFrom = useRef<{ position: Vector3; target: Vector3; fov: number } | null>(null);
  const blendKey = useRef<object | null>(null);
  const transformMix = useRef(0);
  /** Occlusion clip fraction, eased: pulled in fast when a wall appears, let out slowly (CAM-01). */
  const clip = useRef(1);
  const occluders = useMemo(() => cameraOccluders(obstacles), []);

  useFrame(({ camera, size, clock }, delta) => {
    const photo = photoMode.camera;
    const persp = camera instanceof PerspectiveCamera ? camera : null;
    if (photo) {
      camera.position.set(photo.position[0], photo.position[1], photo.position[2]);
      target.current.set(photo.target[0], photo.target[1], photo.target[2]);
      camera.lookAt(target.current);
      if (photo.fov && persp && persp.fov !== photo.fov) {
        persp.fov = photo.fov;
        persp.updateProjectionMatrix();
      }
      seenGeneration.current = -1;
      return;
    }

    const store = useGameStore.getState();
    const state = store.vehicleState;
    const authority = authorityOf(state);
    const mode = bodyModeOf(state);
    const aspect = size.width / Math.max(1, size.height);
    const dt = Math.min(delta, 0.1);
    const pose = poseOf(state);
    const pick = (v: Parameters<typeof profilesFor>[0]) => {
      const p = profilesFor(v);
      return configForAspect(aspect, p.landscape, p.portrait);
    };
    let config: FollowConfig;
    let yFollow = 1;
    let pitch = 0;
    let baseY = pose.y;
    if (authority === "plane") {
      pitch = pose.pitch;
      const ground = groundHeightAt(pose.x, pose.z);
      const t = Math.max(0, Math.min(1, (pose.y - ground) / FLIGHT_BLEND_ALTITUDE));
      config = blendConfigs(pick("car"), pick("plane"), t);
    } else if (authority === "boat") {
      yFollow = SWELL_TO_CAMERA;
      baseY = pose.y - 0.5;
      config = pick("boat");
    } else {
      // Ground body: the car profile; wings out (deploying up a ramp, rolling out) lean toward the flight profile.
      config = mode === "plane" ? blendConfigs(pick("car"), pick("plane"), 0.35) : pick("car");
      pitch = pose.pitch * 0.5;
    }
    // Pulled back while parts move, eased in and out so nothing jumps.
    transformMix.current = damp(transformMix.current, isTransforming(state) ? 1 : 0, 3, dt);
    if (transformMix.current > 0.01) config = blendConfigs(config, pick("transform"), transformMix.current * 0.6);
    const want = desiredCamera(pose.x, pose.z, pose.heading, pose.speed, config, baseY, yFollow, pitch);
    // Occlusion (CAM-01): on the ground and on the water, never let the camera into a building. The wanted
    // position is pulled in along the car→camera line (fast in, slow out) and lifted a little while pulled in,
    // so the car stays in view over the facade instead of the facade filling the frame.
    const highFlight = authority === "plane" && pose.y - groundHeightAt(pose.x, pose.z) > 8;
    const wantedClip = highFlight ? 1 : clipFraction({ x: pose.x, z: pose.z }, { x: want.position.x, z: want.position.z }, occluders);
    // Snap with the camera on resets and teleports (the generation changed); ease otherwise.
    clip.current = seenGeneration.current !== generationOf() ? wantedClip : damp(clip.current, wantedClip, wantedClip < clip.current ? 14 : 2.5, dt);
    if (clip.current < 0.999) {
      const f = clip.current;
      want.position.x = pose.x + (want.position.x - pose.x) * f;
      want.position.z = pose.z + (want.position.z - pose.z) * f;
      want.position.y += (1 - f) * 3.5;
    }
    cameraState.clip = clip.current;

    const generation = generationOf();
    const transition = store.transition;
    if (transition) {
      if (blendKey.current !== transition) {
        blendKey.current = transition;
        blendFrom.current = { position: camera.position.clone(), target: target.current.clone(), fov: persp?.fov ?? config.fov };
      }
      const from = blendFrom.current!;
      const s = transitionClock.progress();
      camera.position.set(from.position.x + (want.position.x - from.position.x) * s, from.position.y + (want.position.y - from.position.y) * s, from.position.z + (want.position.z - from.position.z) * s);
      target.current.set(from.target.x + (want.target.x - from.target.x) * s, from.target.y + (want.target.y - from.target.y) * s, from.target.z + (want.target.z - from.target.z) * s);
      if (persp) {
        persp.fov = from.fov + (config.fov - from.fov) * s;
        persp.updateProjectionMatrix();
      }
      seenGeneration.current = generation;
    } else if (seenGeneration.current !== generation) {
      // First frame and every reset / teleport: snap instead of gliding across the map.
      camera.position.set(want.position.x, want.position.y, want.position.z);
      target.current.set(want.target.x, want.target.y, want.target.z);
      seenGeneration.current = generation;
      blendKey.current = null;
      if (persp) {
        persp.fov = config.fov;
        persp.updateProjectionMatrix();
      }
    } else {
      blendKey.current = null;
      camera.position.x = damp(camera.position.x, want.position.x, config.positionLambda, dt);
      camera.position.y = damp(camera.position.y, want.position.y, config.positionLambda, dt);
      camera.position.z = damp(camera.position.z, want.position.z, config.positionLambda, dt);
      target.current.x = damp(target.current.x, want.target.x, config.targetLambda, dt);
      target.current.y = damp(target.current.y, want.target.y, config.targetLambda, dt);
      target.current.z = damp(target.current.z, want.target.z, config.targetLambda, dt);
      if (persp && Math.abs(persp.fov - config.fov) > 0.01) {
        persp.fov = damp(persp.fov, config.fov, 4, dt);
        persp.updateProjectionMatrix();
      }
    }
    camera.lookAt(target.current);
    cameraState.x = camera.position.x;
    cameraState.y = camera.position.y;
    cameraState.z = camera.position.z;
    const j = treeWorld.reducedMotion ? 0 : impactBus.jolt.strength;
    if (j > 0) {
      const t = clock.elapsedTime;
      camera.position.y += j * 0.12 * Math.sin(t * 37);
      camera.position.x += j * 0.06 * Math.sin(t * 29);
    }
  }, -1);

  return null;
}
