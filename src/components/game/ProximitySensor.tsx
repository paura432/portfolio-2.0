"use client";

import { useFrame } from "@react-three/fiber";
import { harbors } from "@/data/archipelago";
import { resolveActiveZone, type Zone } from "@/game/interaction/proximity";
import { interactionZones, labZones } from "@/game/interaction/zones";
import { liveBoat } from "@/game/vehicle/boatState";
import { liveCar } from "@/game/vehicle/carState";
import { useGameStore } from "@/stores/gameStore";

/** Harbor boarding zones (car side) and docking zones (boat side), from the archipelago data. */
export const boardingZones: Zone<(typeof harbors)[number]["id"]>[] = harbors.filter((h) => h.landVehicles.includes("car")).map((h) => ({ id: h.id, ...h.boardingZone }));
export const dockingZones: Zone<(typeof harbors)[number]["id"]>[] = harbors.map((h) => ({ id: h.id, ...h.dockingZone }));

/**
 * Checks the car against district zones and the harbor boarding zones, and the
 * boat against the docking zones, every frame; the store only updates on transitions.
 */
export function ProximitySensor() {
  useFrame(() => {
    const store = useGameStore.getState();
    const car = liveCar.state;
    store.setNearby(resolveActiveZone(interactionZones, car.x, car.z, store.nearbyDistrict));
    store.setNearbyLab(resolveActiveZone(labZones, car.x, car.z, store.nearbyLab));
    store.setNearbyHarbor(resolveActiveZone(boardingZones, car.x, car.z, store.nearbyHarbor));
    const boat = liveBoat.state;
    store.setNearbyDock(resolveActiveZone(dockingZones, boat.x, boat.z, store.nearbyDock));
  }, -2);
  return null;
}
