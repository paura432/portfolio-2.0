import { harbors } from "@/data/archipelago";
import { SKYPORT } from "@/data/skyport";
import { districts, type Accent, type District } from "@/data/districts";
import { PLAZA, ROADS } from "@/data/world";
import { roadsideExtent } from "./urban";

export type Exit = "north" | "east" | "south" | "west";

/** A destination listed on a signpost: a district, or (V6) a harbor. */
export interface Destination {
  id: string;
  name: string;
  tagline: string;
  accent: Accent;
  built: boolean;
  position: [x: number, z: number];
  entrance: [x: number, z: number];
}

export interface SignpostEntry {
  destination: Destination;
  /** Which side of the road the destination sits on when driving away from the plaza. */
  side: "left" | "right" | "ahead";
}

export interface Signpost {
  exit: Exit;
  /** World position of the post. */
  x: number;
  z: number;
  /** Rotation so the panels face the plaza (the driver reads them while leaving). */
  rotationY: number;
  entries: SignpostEntry[];
}

/** Height of the top panel centre; panels stack downward from here. */
export const SIGNPOST_TOP_Y = 4.5;
export const SIGNPOST_PANEL_PITCH = 0.95;
/** Distance from the plaza centre along the exit road: past the crossing and bollards, before the forecourts. */
export const SIGNPOST_DISTANCE = PLAZA.outerRadius + 5.5;

const EXIT_DIR: Record<Exit, [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

export function destinationOf(d: District): Destination {
  return { id: d.id, name: d.name, tagline: d.tagline, accent: d.accent, built: d.built, position: d.position, entrance: d.entrance };
}

/** Harbors reachable by car are signposted like districts (amber: a transport node, not a project). */
export function harborDestinations(): Destination[] {
  return harbors
    .filter((h) => h.island === "main" && h.landVehicles.includes("car"))
    .map((h) => ({ id: h.id, name: h.name, tagline: h.tagline, accent: "amber", built: true, position: h.pierRoot, entrance: [h.boardingZone.x, h.boardingZone.z] }));
}

/** The Skyport (V7) is reached by car over the east causeway. */
export function skyportDestination(): Destination {
  return { id: SKYPORT.id, name: SKYPORT.name, tagline: SKYPORT.tagline, accent: "cyan", built: true, position: SKYPORT.center, entrance: [SKYPORT.pad.x, SKYPORT.pad.z] };
}

function exitFor(d: Destination): Exit | null {
  const [x, z] = d.entrance;
  // Beyond the ring road (|z| >= 40) a district is reached from the north/south exit whatever its x.
  if (Math.abs(z) >= 40) return z < 0 ? "north" : "south";
  if (Math.abs(x) >= 10 && Math.abs(z) < 10) return x < 0 ? "west" : "east";
  if (Math.abs(z) >= 20 && Math.abs(x) < 10) return z < 0 ? "north" : "south";
  return null;
}

/** Side of the road from the driver's point of view, heading away from the plaza. */
export function sideOf(exit: Exit, d: Destination): "left" | "right" | "ahead" {
  const [fx, fz] = EXIT_DIR[exit];
  // Right-hand vector for forward (fx, 0, fz) with Y up: (−fz, 0, fx).
  const rx = -fz;
  const rz = fx;
  const dot = d.position[0] * rx + d.position[1] * rz;
  if (Math.abs(dot) < 6) return "ahead";
  return dot > 0 ? "right" : "left";
}

/** One signpost per plaza exit listing the destinations reachable down that road. */
export function buildSignposts(): Signpost[] {
  const exits: Exit[] = ["west", "east", "north", "south"];
  // Beyond the sidewalk on the driver's left, so the post never sits in the road or on the pavement.
  const lateral = roadsideExtent(ROADS[0]!.width) + 0.7;
  const destinations: Destination[] = [...districts.filter((d) => d.kind !== "hub").map(destinationOf), ...harborDestinations(), skyportDestination()];
  return exits
    .map((exit): Signpost => {
      const [fx, fz] = EXIT_DIR[exit];
      const lx = fz; // left-hand vector = (fz, 0, −fx)
      const lz = -fx;
      const entries = destinations.filter((d) => exitFor(d) === exit).map((destination) => ({ destination, side: sideOf(exit, destination) }));
      return {
        exit,
        x: fx * SIGNPOST_DISTANCE + lx * lateral,
        z: fz * SIGNPOST_DISTANCE + lz * lateral,
        rotationY: Math.atan2(-fx, -fz),
        entries,
      };
    })
    .filter((s) => s.entries.length > 0);
}
