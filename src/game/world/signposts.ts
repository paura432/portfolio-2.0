import { districts, type District } from "@/data/districts";
import { PLAZA } from "@/data/world";

export type Exit = "north" | "east" | "south" | "west";

export interface SignpostEntry {
  district: District;
  /** Which side of the road the district sits on when driving away from the plaza. */
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

const EXIT_DIR: Record<Exit, [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

function exitFor(d: District): Exit | null {
  const [x, z] = d.entrance;
  if (Math.abs(x) >= 10 && Math.abs(z) < 10) return x < 0 ? "west" : "east";
  if (Math.abs(z) >= 20 && Math.abs(x) < 10) return z < 0 ? "north" : "south";
  return null;
}

/** Side of the road from the driver's point of view, heading away from the plaza. */
export function sideOf(exit: Exit, d: District): "left" | "right" | "ahead" {
  const [fx, fz] = EXIT_DIR[exit];
  // Right-hand vector for forward (fx, 0, fz) with Y up: (−fz, 0, fx).
  const rx = -fz;
  const rz = fx;
  const dot = d.position[0] * rx + d.position[1] * rz;
  if (Math.abs(dot) < 6) return "ahead";
  return dot > 0 ? "right" : "left";
}

/** One signpost per plaza exit listing the districts reachable down that road. */
export function buildSignposts(): Signpost[] {
  const exits: Exit[] = ["west", "east", "north", "south"];
  return exits
    .map((exit): Signpost => {
      const [fx, fz] = EXIT_DIR[exit];
      // Stand just outside the plaza on the driver's left so the car never clips it.
      const dist = PLAZA.outerRadius + 3;
      const lx = fz; // left-hand vector = (fz, 0, −fx)
      const lz = -fx;
      const entries = districts
        .filter((d) => d.kind !== "hub" && exitFor(d) === exit)
        .map((district) => ({ district, side: sideOf(exit, district) }));
      return {
        exit,
        x: fx * dist + lx * 5.2,
        z: fz * dist + lz * 5.2,
        rotationY: Math.atan2(-fx, -fz),
        entries,
      };
    })
    .filter((s) => s.entries.length > 0);
}
