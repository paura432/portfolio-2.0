"use client";

import { useEffect, useRef } from "react";
import { harbors, islands, pointsOfInterest, QUAY } from "@/data/archipelago";
import { beaches, beachOuterCorners } from "@/data/beaches";
import { rampPoint, ramps } from "@/data/ramps";
import { districts } from "@/data/districts";
import { SKYPORT } from "@/data/skyport";
import { PLATFORM, PLAZA, ROADS } from "@/data/world";
import { bodyModeOf } from "@/game/vehicle/transformer";
import { poseOf } from "@/game/vehicle/vehicleManager";
import { accentHex } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";

const SIZE = 100; // viewBox units

/** City view: the platform fills the map. */
const CITY = { x0: -PLATFORM.halfSize, z0: -PLATFORM.halfSize, span: PLATFORM.halfSize * 2 };
/** Archipelago view (boat and flight modes): the three islands and the sea between them. */
const SEA = { x0: -220, z0: -125, span: 450 };

type View = typeof CITY;
const mapper =
  (v: View) =>
  (x: number, z: number): [number, number] => [((x - v.x0) / v.span) * SIZE, ((z - v.z0) / v.span) * SIZE];

/**
 * Top-down map built from the same road, district and archipelago data as the
 * 3D world. Car mode frames the city; boat mode zooms out to the archipelago
 * with the harbors, the islands and both vehicles. Markers update outside React.
 */
export function Minimap() {
  const state = useGameStore((s) => s.vehicleState);
  const body = bodyModeOf(state);
  const air = body === "plane";
  const boat = body !== "car";
  const active = useRef<SVGGElement>(null);
  const toMap = mapper(boat ? SEA : CITY);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const st = useGameStore.getState();
      const g = active.current;
      if (g) {
        const { x, z, heading } = poseOf(st.vehicleState);
        const [mx, mz] = toMap(x, z);
        g.setAttribute("transform", `translate(${mx.toFixed(2)} ${mz.toFixed(2)}) rotate(${(-(heading * 180) / Math.PI + 180).toFixed(1)})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toMap]);

  const scale = SIZE / (boat ? SEA.span : CITY.span);
  const poly = (pts: readonly [number, number][]) => pts.map(([x, z]) => toMap(x, z).map((v) => v.toFixed(1)).join(",")).join(" ");

  return (
    <svg className="minimap" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={air ? "Map of the archipelago with the aircraft position" : boat ? "Map of the archipelago with the boat position" : "Map of the city with the car position"} data-testid="minimap" data-mode={air ? "air" : boat ? "sea" : "city"} data-body={body}>
      <rect x="1" y="1" width={SIZE - 2} height={SIZE - 2} rx="6" fill={boat ? "#0B2240" : "#142538"} />
      {boat && (
        <>
          {islands.map((i) => (
            <polygon key={i.id} points={poly(i.coastline)} fill="#1E3448" stroke="#4A6E8A" strokeWidth="0.6">
              <title>{i.name}</title>
            </polygon>
          ))}
          {/* The city platform and its quay */}
          <rect x={toMap(-PLATFORM.halfSize, -PLATFORM.halfSize)[0]} y={toMap(0, -PLATFORM.halfSize)[1]} width={PLATFORM.halfSize * 2 * scale} height={PLATFORM.halfSize * 2 * scale} fill="#243A52" />
          <rect x={toMap(QUAY.x0, QUAY.z0)[0]} y={toMap(QUAY.x0, QUAY.z0)[1]} width={(QUAY.x1 - QUAY.x0) * scale} height={(QUAY.z1 - QUAY.z0) * scale} fill="#2E4A66" />
          {harbors.map((h) => {
            const [hx, hz] = toMap(h.pierRoot[0], h.pierRoot[1]);
            return (
              <g key={h.id} data-harbor={h.id}>
                <circle cx={hx} cy={hz} r="2.2" fill={accentHex.amber} opacity="0.95">
                  <title>{h.name}</title>
                </circle>
              </g>
            );
          })}
          {/* Skyport runway and pad */}
          <rect x={toMap(SKYPORT.runway.minX, SKYPORT.runway.minZ)[0]} y={toMap(SKYPORT.runway.minX, SKYPORT.runway.minZ)[1]} width={(SKYPORT.runway.maxX - SKYPORT.runway.minX) * scale} height={Math.max(1, (SKYPORT.runway.maxZ - SKYPORT.runway.minZ) * scale)} fill="#CFD8E2" opacity="0.85" data-runway="skyport" />
          <circle cx={toMap(SKYPORT.pad.x, SKYPORT.pad.z)[0]} cy={toMap(SKYPORT.pad.x, SKYPORT.pad.z)[1]} r="1.8" fill="none" stroke={accentHex.cyan} strokeWidth="0.6" />
          {pointsOfInterest.map((p) => {
            const [px, pz] = toMap(p.position[0], p.position[1]);
            return <rect key={p.id} x={px - 1.6} y={pz - 1.6} width="3.2" height="3.2" rx="0.6" fill={accentHex.cyan} opacity="0.9" />;
          })}
          {/* Beaches (V8): where the hull may come ashore */}
          {beaches.map((b) => {
            const [c0, c1] = beachOuterCorners(b);
            return <polygon key={b.id} points={poly([b.edge.from, b.edge.to, c1, c0])} fill="#C9B27A" opacity="0.8" data-beach={b.id} />;
          })}
        </>
      )}
      {!boat && (
        <>
          {ROADS.map((r, i) => {
            const [ax, az] = toMap(r.from[0], r.from[1]);
            const [bx, bz] = toMap(r.to[0], r.to[1]);
            return <line key={i} x1={ax} y1={az} x2={bx} y2={bz} stroke="#2E4A66" strokeWidth={r.width * scale} strokeLinecap="round" />;
          })}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={((PLAZA.innerRadius + PLAZA.outerRadius) / 2) * scale} fill="none" stroke="#2E4A66" strokeWidth={(PLAZA.outerRadius - PLAZA.innerRadius) * scale} />
          {districts.map((d) => {
            const [cx, cz] = toMap(d.position[0], d.position[1]);
            const w = d.footprint[0] * scale;
            const h = d.footprint[1] * scale;
            const color = accentHex[d.accent];
            return d.built ? (
              <g key={d.id} data-district={d.id}>
                <rect x={cx - w / 2} y={cz - h / 2} width={w} height={h} rx="1" fill={color} opacity="0.9">
                  <title>{d.name}</title>
                </rect>
                {(d.plots ?? []).map((p) => {
                  const [px, pz] = toMap(p.position[0], p.position[1]);
                  return (
                    <rect key={p.id} x={px - (p.footprint[0] * scale) / 2} y={pz - (p.footprint[1] * scale) / 2} width={p.footprint[0] * scale} height={p.footprint[1] * scale} rx="0.6" fill={color} opacity="0.55">
                      <title>{p.name}</title>
                    </rect>
                  );
                })}
              </g>
            ) : (
              <rect key={d.id} x={cx - w / 2} y={cz - h / 2} width={w} height={h} rx="1" fill="none" stroke="#9BAFC2" strokeWidth="0.8" strokeDasharray="1.5 1.2">
                <title>{`${d.name} (planned)`}</title>
              </rect>
            );
          })}
          {/* Ramps and beaches (V8) */}
          {ramps
            .filter((r) => r.id !== "skyport-ramp")
            .map((r) => (
              <polygon key={r.id} points={poly([rampPoint(r, -r.approach, -r.width / 2), rampPoint(r, r.length, -r.width / 2), rampPoint(r, r.length, r.width / 2), rampPoint(r, -r.approach, r.width / 2)])} fill={accentHex.amber} opacity="0.8" data-ramp={r.id} />
            ))}
          {beaches
            .filter((b) => b.island === "main")
            .map((b) => {
              const [c0, c1] = beachOuterCorners(b);
              return <polygon key={b.id} points={poly([b.edge.from, b.edge.to, c1, c0])} fill="#C9B27A" opacity="0.8" data-beach={b.id} />;
            })}
          {/* Harbor marker at the edge of the city map */}
          {harbors
            .filter((h) => h.island === "main")
            .map((h) => {
              const [hx, hz] = toMap(Math.max(h.pierRoot[0], -PLATFORM.halfSize + 2), h.pierRoot[1]);
              return <circle key={h.id} cx={hx} cy={hz} r="2" fill={accentHex.amber} opacity="0.95" data-harbor={h.id} />;
            })}
        </>
      )}
      {/* The one vehicle: orange on land and in the air, cyan on the water */}
      <g ref={active} data-testid="minimap-active">
        <polygon points="0,-3.2 2.4,2.6 0,1.4 -2.4,2.6" fill={body === "boat" ? "#7FE2E9" : "#FF7A3D"} stroke="#080F1D" strokeWidth="0.6" />
      </g>
    </svg>
  );
}
