"use client";

import { useMemo } from "react";
import { rampHeightAt, rampPoint, ramps, rampSlopeAt, type RampDefinition } from "@/data/ramps";
import { DEPLOY_SPEED } from "@/game/vehicle/transformer";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { SignPanel } from "./DistrictSigns";
import { DynamicFixture } from "./DynamicFixture";
import { getMaterials } from "./materials";
import { StaticBatch } from "./StaticBatch";

/** Deck segments along the slope: each is a box tilted to the local slope, so the deck follows the same profile the car climbs. */
const SEGMENTS = 11;

/**
 * Takeoff ramps (V8): futuristic launch structures, not inclined blocks. A
 * composite deck on steel legs, cyan edge strips, rails on posts, chevrons
 * on the approach, a speed sign at the entry and an amber light bar on the
 * lip. Geometry follows `rampHeightAt`, the same profile the ground height
 * field gives the car, so the deck seen is the deck driven.
 */
function Ramp({ r }: { r: RampDefinition }) {
  const m = getMaterials();
  const profile = QUALITY_PROFILES[useGameStore((s) => s.quality)];
  const segments = useMemo(() => {
    const out: { x: number; y: number; z: number; len: number; tilt: number }[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const s0 = (i / SEGMENTS) * r.length;
      const s1 = ((i + 1) / SEGMENTS) * r.length;
      const y0 = rampHeightAt(r, s0);
      const y1 = rampHeightAt(r, s1);
      const [x, z] = rampPoint(r, (s0 + s1) / 2, 0);
      out.push({ x, y: (y0 + y1) / 2, z, len: Math.hypot(s1 - s0, y1 - y0) + 0.06, tilt: Math.atan2(y1 - y0, s1 - s0) });
    }
    return out;
  }, [r]);
  const legs = useMemo(() => {
    const out: { x: number; y: number; z: number; h: number }[] = [];
    for (let s = 3; s < r.length; s += 3.2) {
      const h = rampHeightAt(r, s) - 0.12;
      if (h < 0.5) continue;
      for (const lat of [-r.width / 2 + 0.5, r.width / 2 - 0.5]) {
        const [x, z] = rampPoint(r, s, lat);
        out.push({ x, y: h / 2, z, h });
      }
    }
    return out;
  }, [r]);
  const chevrons = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let s = -r.approach + 3; s < -1.5; s += 3) {
      const [x, z] = rampPoint(r, s, 0);
      out.push({ x, z });
    }
    return out;
  }, [r]);
  const lipSlope = rampSlopeAt(r, r.length);
  const [lipX, lipZ] = rampPoint(r, r.length, 0);
  const [entryX, entryZ] = rampPoint(r, -r.approach, 0);
  const strips = useMemo(() => {
    const out: { x: number; y: number; z: number; len: number; tilt: number; lat: number }[] = [];
    for (const seg of segments) for (const lat of [-r.width / 2 + 0.12, r.width / 2 - 0.12]) {
      // Offset the segment centre laterally.
      const fx = Math.sin(r.heading);
      const fz = Math.cos(r.heading);
      out.push({ x: seg.x + fz * lat, y: seg.y + 0.09, z: seg.z - fx * lat, len: seg.len, tilt: seg.tilt, lat });
    }
    return out;
  }, [segments, r]);

  return (
    <group>
      <StaticBatch>
        {/* Deck */}
        {segments.map((s, i) => (
          <mesh key={i} material={m.metalDark} position={[s.x, s.y, s.z]} rotation={[-s.tilt, r.heading, 0]} castShadow receiveShadow>
            <boxGeometry args={[r.width, 0.24, s.len]} />
          </mesh>
        ))}
        {/* Worked surface: lighter composite plates down the centre */}
        {segments.map((s, i) => (
          <mesh key={`p${i}`} material={m.concreteLight} position={[s.x, s.y + 0.125, s.z]} rotation={[-s.tilt, r.heading, 0]}>
            <boxGeometry args={[r.width - 1.6, 0.02, s.len - 0.3]} />
          </mesh>
        ))}
        {/* Legs */}
        {legs.map((l, i) => (
          <mesh key={`l${i}`} material={m.metal} position={[l.x, l.y, l.z]} castShadow>
            <boxGeometry args={[0.28, l.h, 0.28]} />
          </mesh>
        ))}
        {/* Rails on posts */}
        {segments.map((s, i) =>
          [-1, 1].map((side) => {
            const lat = side * (r.width / 2 + 0.1);
            const fx = Math.sin(r.heading);
            const fz = Math.cos(r.heading);
            return (
              <group key={`r${i}${side}`}>
                <mesh material={m.metal} position={[s.x + fz * lat, s.y + 0.95, s.z - fx * lat]} rotation={[-s.tilt, r.heading, 0]}>
                  <boxGeometry args={[0.08, 0.08, s.len]} />
                </mesh>
                {i % 2 === 0 && (
                  <mesh material={m.metalDark} position={[s.x + fz * lat, s.y + 0.5, s.z - fx * lat]} rotation={[-s.tilt, r.heading, 0]}>
                    <boxGeometry args={[0.1, 0.9, 0.1]} />
                  </mesh>
                )}
              </group>
            );
          }),
        )}
        {/* Approach chevrons */}
        {chevrons.map((c, i) => (
          <mesh key={`c${i}`} material={m.roadLine} position={[c.x, 0.03, c.z]} rotation={[-Math.PI / 2, 0, -r.heading + Math.PI / 4]}>
            <boxGeometry args={[2.2, 0.36, 0.02]} />
          </mesh>
        ))}
      </StaticBatch>
      {/* Entry gate: two masts with amber heads; destructible fixtures (V9), drawn in local coordinates */}
      {[-1, 1].map((side) => (
        <DynamicFixture key={`g${side}`} fixtureKey={`ramp:${r.id}:mast:${side < 0 ? "l" : "r"}`}>
          <mesh material={m.metalDark} position={[0, 2.2, 0]} castShadow>
            <boxGeometry args={[0.16, 4.4, 0.16]} />
          </mesh>
          <mesh material={m.lightAmberSoft} position={[0, 4.5, 0]}>
            <boxGeometry args={[0.36, 0.2, 0.36]} />
          </mesh>
        </DynamicFixture>
      ))}
      {/* Sign post with its panel; destructible fixture */}
      <DynamicFixture fixtureKey={`ramp:${r.id}:sign`}>
        <mesh material={m.metalDark} position={[0, 1.7, 0]} castShadow>
          <boxGeometry args={[0.12, 3.4, 0.12]} />
        </mesh>
        <group position={[0, 3.3, 0]}>
          <SignPanel title={r.name.toUpperCase()} subtitle={`Takeoff · ≥ ${Math.round(DEPLOY_SPEED * 3.6)} km/h`} accent={palette.amber} width={3.4} height={1.0} compact />
        </group>
      </DynamicFixture>
      {/* Cyan edge strips (emissive, separate so the batch does not share their material) */}
      {strips.map((s, i) => (
        <mesh key={i} material={m.lightCyanSoft} position={[s.x, s.y, s.z]} rotation={[-s.tilt, r.heading, 0]}>
          <boxGeometry args={[0.1, 0.03, s.len]} />
        </mesh>
      ))}
      {/* Lip light bar */}
      <mesh material={m.lightAmber} position={[lipX, rampHeightAt(r, r.length) + 0.16, lipZ]} rotation={[-lipSlope, r.heading, 0]}>
        <boxGeometry args={[r.width - 0.4, 0.06, 0.14]} />
      </mesh>
      {profile.lampPools && (
        <mesh material={m.lampPool} position={[entryX, 0.05, entryZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.2, 16]} />
        </mesh>
      )}
    </group>
  );
}

export function Ramps() {
  return (
    <group>
      {ramps.map((r) => (
        <Ramp key={r.id} r={r} />
      ))}
    </group>
  );
}
