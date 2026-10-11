import { describe, expect, it } from "vitest";
import { districts } from "@/data/districts";
import { distanceToRoad } from "@/data/world";
import { MIN_POST_ROAD_DISTANCE, validatePost, validateSignMounts } from "./signage";
import { buildSignposts, destinationOf, SIGNPOST_PANEL_PITCH, SIGNPOST_TOP_Y, sideOf } from "./signposts";

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
  it("lists every non-hub district exactly once, plus the harbor on the west exit (V6) and the Skyport on the east exit (V7)", () => {
    const ids = posts.flatMap((p) => p.entries.map((e) => e.destination.id)).sort();
    const expected = [...districts.filter((d) => d.kind !== "hub").map((d) => d.id), "pau-harbor", "skyport"].sort();
    expect(ids).toEqual(expected);
    const west = posts.find((p) => p.exit === "west")!;
    expect(west.entries.find((e) => e.destination.id === "pau-harbor")?.side).toBe("ahead");
    const east = posts.find((p) => p.exit === "east")!;
    expect(east.entries.find((e) => e.destination.id === "skyport")?.side).toBe("ahead");
  });
  it("reports the correct side of the road", () => {
    const duplex = destinationOf(districts.find((d) => d.id === "duplex")!);
    const trustos = destinationOf(districts.find((d) => d.id === "trustos")!);
    const fortytwo = destinationOf(districts.find((d) => d.id === "fortytwo")!);
    expect(sideOf("west", duplex)).toBe("right"); // north of the west road, driving west
    expect(sideOf("west", trustos)).toBe("left");
    expect(sideOf("north", fortytwo)).toBe("ahead");
  });
});
