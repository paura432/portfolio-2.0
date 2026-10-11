import { QUAY } from "@/data/archipelago";
import { rampPoint, ramps } from "@/data/ramps";
import { SKYPORT } from "@/data/skyport";
import { buildSignposts } from "./signposts";

/**
 * Fixtures (V9): the free-standing posts and masts the world's components
 * draw from their own data — the plaza signposts, the ramp gate masts and
 * ramp sign posts, the Skyport pad masts, the hangar sign post and the
 * harbor gate sign post. One list, keyed, so the simulation (collider +
 * reaction) and the component that draws each one share the same position.
 */
export type FixtureCategory = "signpost" | "mast";

export interface Fixture {
  /** Stable key, e.g. `ramp:west-ramp:mast:l`, `plaza:west`, `skyport:pad:0`. */
  key: string;
  category: FixtureCategory;
  x: number;
  z: number;
  /** Yaw of the drawn object (the collider is a circle; the yaw only orients the fall / wobble reading). */
  rotation: number;
}

let cache: Fixture[] | null = null;

export function fixtures(): Fixture[] {
  if (cache) return cache;
  const out: Fixture[] = [];
  for (const s of buildSignposts()) out.push({ key: `plaza:${s.exit}`, category: "signpost", x: s.x, z: s.z, rotation: s.rotationY });
  for (const r of ramps) {
    for (const side of [-1, 1] as const) {
      const [x, z] = rampPoint(r, -r.approach, side * (r.width / 2 + 0.9));
      out.push({ key: `ramp:${r.id}:mast:${side < 0 ? "l" : "r"}`, category: "mast", x, z, rotation: r.heading });
    }
    const [sx, sz] = rampPoint(r, -r.approach + 1, r.width / 2 + 2.2);
    out.push({ key: `ramp:${r.id}:sign`, category: "signpost", x: sx, z: sz, rotation: r.heading + Math.PI });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    out.push({ key: `skyport:pad:${i}`, category: "mast", x: SKYPORT.pad.x + Math.cos(a) * (SKYPORT.pad.radius + 1.2), z: SKYPORT.pad.z + Math.sin(a) * (SKYPORT.pad.radius + 1.2), rotation: 0 });
  }
  out.push({ key: "skyport:hangar-sign", category: "signpost", x: SKYPORT.hangar.x + SKYPORT.hangar.w / 2 + 1.2, z: SKYPORT.hangar.z - SKYPORT.hangar.d / 2 - 0.5, rotation: Math.PI });
  out.push({ key: "harbor:gate-sign", category: "signpost", x: QUAY.x1 + 1.6, z: -5.6, rotation: Math.PI / 2 });
  cache = out;
  return out;
}

export function fixture(key: string): Fixture {
  const f = fixtures().find((x) => x.key === key);
  if (!f) throw new Error(`Unknown fixture: ${key}`);
  return f;
}
