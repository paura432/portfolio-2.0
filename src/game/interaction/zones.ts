import { districts, type DistrictId } from "@/data/districts";
import type { Zone } from "./proximity";

/** Interaction zones for built districts, derived from the district map. */
export const interactionZones: Zone<DistrictId>[] = districts
  .filter((d) => d.built)
  .map((d) => ({ id: d.id, x: d.entrance[0], z: d.entrance[1], radius: d.interactRadius }));

/** Zone id of a plot: `<district>:<plot>`. */
export type LabZoneId = `${DistrictId}:${string}`;

/** Small zones at the entrance of secondary buildings (campus labs); optional, the district zone opens everything. */
export const labZones: Zone<LabZoneId>[] = districts
  .filter((d) => d.built)
  .flatMap((d) => (d.plots ?? []).filter((p) => p.entrance).map((p) => ({ id: `${d.id}:${p.id}` as LabZoneId, x: p.entrance![0], z: p.entrance![1], radius: p.interactRadius ?? 4.5 })));
