"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { configForAspect, damp, desiredCamera, profilesFor } from "@/game/camera/followCamera";
import { photoMode } from "@/game/camera/photoMode";
import { generationOf, poseOf, transitionClock } from "@/game/vehicle/vehicleManager";
import { impactBus } from "@/game/world/impactBus";
import { treeWorld } from "@/game/world/treeWorld";
import { useGameStore } from "@/stores/gameStore";

/**
 * Smooth third-person camera for the active vehicle; damping is exponential so
 * it is frame-rate independent. During a vehicle transition the camera glides
 * from where it was to the destination vehicle's framing (eased), then the
 * normal damping takes over without a seam.
 */
export function FollowCamera() {
  const target = useRef(new Vector3());
  const seenVehicle = useRef<string>("");
  const seenGeneration = useRef(-1);
  const blendFrom = useRef<{ position: Vector3; target: Vector3; fov: number } | null>(null);
  const blendKey = useRef<object | null>(null);

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
      // Next frame without photo mode snaps back to the vehicle.
      seenGeneration.current = -1;
      return;
    }

    const store = useGameStore.getState();
    const transition = store.transition;
    // While a transition runs the camera already frames the destination vehicle.
    const vehicle = transition ? transition.to : store.activeVehicle;
    const profiles = profilesFor(vehicle);
    const config = configForAspect(size.width / Math.max(1, size.height), profiles.landscape, profiles.portrait);
    const pose = poseOf(vehicle);
    const want = desiredCamera(pose.x, pose.z, pose.heading, pose.speed, config, pose.y);
    const dt = Math.min(delta, 0.1);

    const generation = generationOf(vehicle);
    const key = `${vehicle}:${generation}`;
    if (transition && transition.from !== transition.to) {
      // Vehicle change: ease from the camera's current framing to the new vehicle's.
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
      seenVehicle.current = key;
      seenGeneration.current = generation;
    } else if (seenVehicle.current !== key || seenGeneration.current !== generation) {
      // First frame and every vehicle reset: snap instead of gliding across the map.
      camera.position.set(want.position.x, want.position.y, want.position.z);
      target.current.set(want.target.x, want.target.y, want.target.z);
      seenVehicle.current = key;
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
    // Tiny nudge on impacts (never a full shake); off under reduced motion.
    const j = treeWorld.reducedMotion ? 0 : impactBus.jolt.strength;
    if (j > 0) {
      const t = clock.elapsedTime;
      camera.position.y += j * 0.12 * Math.sin(t * 37);
      camera.position.x += j * 0.06 * Math.sin(t * 29);
    }
  }, -1);

  return null;
}
