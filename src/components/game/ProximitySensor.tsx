"use client";

import { useFrame } from "@react-three/fiber";
import { resolveActiveZone } from "@/game/interaction/proximity";
import { interactionZones } from "@/game/interaction/zones";
import { liveCar } from "@/game/vehicle/carState";
import { useGameStore } from "@/stores/gameStore";

/** Checks the car against district zones each frame; the store only updates on transitions. */
export function ProximitySensor() {
  useFrame(() => {
    const store = useGameStore.getState();
    const { x, z } = liveCar.state;
    const next = resolveActiveZone(interactionZones, x, z, store.nearbyDistrict);
    store.setNearby(next);
  }, -2);
  return null;
}
