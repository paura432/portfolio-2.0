"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { damp, desiredCamera, FOLLOW_CONFIG } from "@/game/camera/followCamera";
import { photoMode } from "@/game/camera/photoMode";
import { liveCar } from "@/game/vehicle/carState";

/** Smooth third-person camera; damping is exponential so it is frame-rate independent. */
export function FollowCamera() {
  const target = useRef(new Vector3());
  const seenGeneration = useRef(-1);

  useFrame(({ camera }, delta) => {
    const photo = photoMode.camera;
    if (photo) {
      camera.position.set(photo.position[0], photo.position[1], photo.position[2]);
      target.current.set(photo.target[0], photo.target[1], photo.target[2]);
      camera.lookAt(target.current);
      if (photo.fov && camera instanceof PerspectiveCamera && camera.fov !== photo.fov) {
        camera.fov = photo.fov;
        camera.updateProjectionMatrix();
      }
      // Next frame without photo mode snaps back to the car.
      seenGeneration.current = -1;
      return;
    }

    const { x, z, heading, speed } = liveCar.state;
    const want = desiredCamera(x, z, heading, speed);
    const dt = Math.min(delta, 0.1);

    // First frame and every car reset: snap instead of gliding across the map.
    if (seenGeneration.current !== liveCar.generation) {
      camera.position.set(want.position.x, want.position.y, want.position.z);
      target.current.set(want.target.x, want.target.y, want.target.z);
      seenGeneration.current = liveCar.generation;
    } else {
      camera.position.x = damp(camera.position.x, want.position.x, FOLLOW_CONFIG.positionLambda, dt);
      camera.position.y = damp(camera.position.y, want.position.y, FOLLOW_CONFIG.positionLambda, dt);
      camera.position.z = damp(camera.position.z, want.position.z, FOLLOW_CONFIG.positionLambda, dt);
      target.current.x = damp(target.current.x, want.target.x, FOLLOW_CONFIG.targetLambda, dt);
      target.current.y = damp(target.current.y, want.target.y, FOLLOW_CONFIG.targetLambda, dt);
      target.current.z = damp(target.current.z, want.target.z, FOLLOW_CONFIG.targetLambda, dt);
    }
    camera.lookAt(target.current);
  }, -1);

  return null;
}
