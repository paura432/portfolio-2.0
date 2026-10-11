"use client";

import { useFrame } from "@react-three/fiber";
import { harbors } from "@/data/archipelago";
import { insideSkyportPad, SKYPORT } from "@/data/skyport";
import { resolveActiveZone, type Zone } from "@/game/interaction/proximity";
import { interactionZones, labZones } from "@/game/interaction/zones";
import { liveBoat } from "@/game/vehicle/boatState";
import { liveCar } from "@/game/vehicle/carState";
import { livePlane } from "@/game/vehicle/planeState";
import { landingZoneDetected } from "@/game/vehicle/transform";
import { usesPlanePose } from "@/game/vehicle/vehicleManager";
import { useGameStore } from "@/stores/gameStore";

/** Harbor boarding zones (car side) and docking zones (boat side), from the archipelago data. */
export const boardingZones: Zone<(typeof harbors)[number]["id"]>[] = harbors.filter((h) => h.landVehicles.includes("car")).map((h) => ({ id: h.id, ...h.boardingZone }));
export const dockingZones: Zone<(typeof harbors)[number]["id"]>[] = harbors.map((h) => ({ id: h.id, ...h.dockingZone }));

/** Fastest approach speed at which the runway still reads as a landing zone. */
export const LANDING_ZONE_MAX_SPEED = 22;

/**
 * Checks the car against district zones, the harbor boarding zones and the
 * Skyport pad, the boat against the docking zones, and the aircraft against
 * the runway approach, every frame; the store only updates on transitions.
 */
export function ProximitySensor() {
  useFrame(() => {
    const store = useGameStore.getState();
    const planeForm = usesPlanePose(store);
    const car = liveCar.state;
    if (planeForm) {
      // The car's zones do not apply to its flight form; the aircraft watches the runway instead.
      store.setNearby(null);
      store.setNearbyLab(null);
      store.setNearbyHarbor(null);
      store.setNearbyPad(false);
      const p = livePlane.state;
      store.setLandingZone(!p.onGround && landingZoneDetected(SKYPORT.runway, p.x, p.y, p.z, p.speed, LANDING_ZONE_MAX_SPEED));
    } else {
      store.setNearby(resolveActiveZone(interactionZones, car.x, car.z, store.nearbyDistrict));
      store.setNearbyLab(resolveActiveZone(labZones, car.x, car.z, store.nearbyLab));
      store.setNearbyHarbor(resolveActiveZone(boardingZones, car.x, car.z, store.nearbyHarbor));
      store.setNearbyPad(insideSkyportPad(car.x, car.z));
      store.setLandingZone(false);
    }
    const boat = liveBoat.state;
    store.setNearbyDock(resolveActiveZone(dockingZones, boat.x, boat.z, store.nearbyDock));
  }, -2);
  return null;
}
