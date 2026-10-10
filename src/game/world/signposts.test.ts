import { describe, expect, it } from "vitest";
import { districts } from "@/data/districts";
import { distanceToRoad } from "@/data/world";
import { buildSignposts, sideOf } from "./signposts";

describe("signposts", () => {
  const posts = buildSignposts();
  it("lists every non-hub district exactly once", () => {
    const ids = posts.flatMap((p) => p.entries.map((e) => e.district.id)).sort();
    const expected = districts.filter((d) => d.kind !== "hub").map((d) => d.id).sort();
    expect(ids).toEqual(expected);
  });
  it("stands beside the road, never on it", () => {
    for (const p of posts) expect(distanceToRoad(p.x, p.z), p.exit).toBeGreaterThan(0.5);
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
