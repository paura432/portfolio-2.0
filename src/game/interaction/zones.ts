import { districts, type DistrictId } from "@/data/districts";
import type { Zone } from "./proximity";

/** Interaction zones for built districts, derived from the district map. */
export const interactionZones: Zone<DistrictId>[] = districts
  .filter((d) => d.built)
  .map((d) => ({ id: d.id, x: d.entrance[0], z: d.entrance[1], radius: d.interactRadius }));
