import { describe, expect, it } from "vitest";
import { districts } from "@/data/districts";
import { distanceToRoad } from "@/data/world";
import { MIN_POST_ROAD_DISTANCE, validatePost, validateSignMounts } from "./signage";
import { buildSignposts, SIGNPOST_PANEL_PITCH, SIGNPOST_TOP_Y, sideOf } from "./signposts";

describe("signage rules", () => {
  it("every built district has a facade sign facing its entrance", () => {
    expect(validateSignMounts()).toEqual([]);
  });
  it("signposts stand beyond the sidewalk, high enough, and clear of district signs", () => {
    for (const p of buildSignposts()) {
      const lowest = SIGNPOST_TOP_Y - (p.entries.length - 1) * SIGNPOST_PANEL_PITCH;
      expect(validatePost(p.exit, p.x, p.z, lowest)).toEqual([]);
      expect(distanceToRoad(p.x, p.z)).toBeGreaterThanOrEqual(MIN_POST_ROAD_DISTANCE);
    }
  });
});

describe("signposts", () => {
  const posts = buildSignposts();
  it("lists every non-hub district exactly once", () => {
    const ids = posts.flatMap((p) => p.entries.map((e) => e.district.id)).sort();
    const expected = districts.filter((d) => d.kind !== "hub").map((d) => d.id).sort();
    expect(ids).toEqual(expected);
  });
  it("reports the correct side of the road", () => {
    const duplex = districts.find((d) => d.id === "duplex")!;
    const trustos = districts.find((d) => d.id === "trustos")!;
    const fortytwo = districts.find((d) => d.id === "fortytwo")!;
    expect(sideOf("west", duplex)).toBe("right"); // north of the west road, driving west
    expect(sideOf("west", trustos)).toBe("left");
    expect(sideOf("north", fortytwo)).toBe("ahead");
  });
});
