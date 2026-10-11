"use client";

import { useFrame } from "@react-three/fiber";
import { harbors } from "@/data/archipelago";
import { resolveActiveZone, type Zone } from "@/game/interaction/proximity";
import { interactionZones, labZones } from "@/game/interaction/zones";
import { liveBoat } from "@/game/vehicle/boatState";
import { liveCar } from "@/game/vehicle/carState";
import { livePlane } from "@/game/vehicle/planeState";
import { authorityOf } from "@/game/vehicle/transformer";
import { useGameStore } from "@/stores/gameStore";
import { landingAhead } from "@/game/vehicle/landing";

/** Pier docking zones, from the archipelago data. */
export const dockingZones: Zone<(typeof harbors)[number]["id"]>[] = harbors.map((h) => ({ id: h.id, ...h.dockingZone }));

/** Fastest approach speed at which open ground still reads as a landing zone. */
export const LANDING_ZONE_MAX_SPEED = 22;
/** Altitude above the ground under which open ground reads as a landing zone. */
export const LANDING_ZONE_ALTITUDE = 30;

/**
 * Checks the car against the district and lab zones, the hull against the
 * pier docking zones, and the aircraft against the ground ahead (open,
 * flat, built ground or water), every frame; the store only updates on
 * transitions. Ramps and beaches are sensed by the vehicle itself (it has
 * the ground sample).
 */
export function ProximitySensor() {
  useFrame(() => {
    const store = useGameStore.getState();
    const authority = authorityOf(store.vehicleState);
    if (authority === "car") {
      const car = liveCar.state;
      store.setNearby(resolveActiveZone(interactionZones, car.x, car.z, store.nearbyDistrict));
      store.setNearbyLab(resolveActiveZone(labZones, car.x, car.z, store.nearbyLab));
      store.setNearbyDock(null);
      store.setLandingZone(false);
    } else if (authority === "boat") {
      const boat = liveBoat.state;
      store.setNearby(null);
      store.setNearbyLab(null);
      store.setNearbyDock(resolveActiveZone(dockingZones, boat.x, boat.z, store.nearbyDock));
      store.setLandingZone(false);
    } else {
      const p = livePlane.state;
      store.setNearby(null);
      store.setNearbyLab(null);
      store.setNearbyDock(null);
      // Landing zone: low, slow, and the ground a few lengths ahead may be landed on.
      store.setLandingZone(!p.onGround && p.speed <= LANDING_ZONE_MAX_SPEED && p.y < LANDING_ZONE_ALTITUDE && landingAhead(p.x, p.z, p.heading));
    }
  }, -2);
  return null;
}
