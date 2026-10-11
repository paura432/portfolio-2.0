import { describe, expect, it } from "vitest";
import { escapes, sweepWedges } from "./wedgeSweep";
import { createCarState } from "../vehicle/carPhysics";

describe("V9 navigation: no wedge points", () => {
  it("the spots the P0 sweep found beside Duplex and TrustOS are escapable from every heading", () => {
    for (const [x, z] of [
      [-18.5, -17],
      [-18.5, -18.5],
      [-30.5, 7],
      [-32, 26.5],
      [-33.5, 26.5],
      [-6.5, 17.5],
      [13, 26.5],
    ] as const) {
      for (let k = 0; k < 8; k++) {
        const r = escapes(createCarState(x, z, (k * Math.PI) / 4));
        expect(r.ok, `(${x}, ${z}) heading ${k}/8: best ${r.best.toFixed(2)}`).toBe(true);
      }
    }
  });
  it("the whole city, on a 1.5 u grid from 8 headings, has no pose the car cannot drive away from (2.5 u in 3 s, or 4 u in 6 s)", () => {
    const { tight, wedges } = sweepWedges();
    expect(tight).toBeGreaterThan(300);
    expect(wedges.map((w) => `${w.x},${w.z} h${w.heading.toFixed(2)} best ${w.best.toFixed(2)} near ${w.near.join("/")}`)).toEqual([]);
  }, 600_000);
});
