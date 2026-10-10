import { PLAZA, ROADS, distanceToRoad, insidePavedArea } from "@/data/world";
import { CURB_WIDTH, SIDEWALK_WIDTH, insideParkingPad } from "./urban";

/** What the wheels are on; drives dust, skid marks and the brake feedback. */
export type Surface = "asphalt" | "pavement" | "turf";

const PAVEMENT_BAND = CURB_WIDTH + SIDEWALK_WIDTH;

export function surfaceAt(x: number, z: number): Surface {
  const d = distanceToRoad(x, z);
  if (d <= 0) return "asphalt";
  if (d <= PAVEMENT_BAND) return "pavement";
  if (insideParkingPad(x, z, 0) || insidePavedArea(x, z, 0)) return "pavement";
  // Plaza island (inside the roundabout) is paved concrete.
  if (Math.hypot(x, z) < PLAZA.innerRadius) return "pavement";
  return "turf";
}

/** Half width of the roads, exported for callers that need the asphalt band. */
export const ASPHALT_HALF_WIDTH = ROADS[0]!.width / 2;
