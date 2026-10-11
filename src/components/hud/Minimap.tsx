"use client";

import { useEffect, useRef } from "react";
import { harbors, islands, pointsOfInterest, QUAY } from "@/data/archipelago";
import { districts } from "@/data/districts";
import { PLATFORM, PLAZA, ROADS } from "@/data/world";
import { poseOf } from "@/game/vehicle/vehicleManager";
import { accentHex } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";

const SIZE = 100; // viewBox units

/** City view: the platform fills the map. */
const CITY = { x0: -PLATFORM.halfSize, z0: -PLATFORM.halfSize, span: PLATFORM.halfSize * 2 };
/** Archipelago view (boat mode): both islands and the sea between them. */
const SEA = { x0: -215, z0: -92.5, span: 310 };

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
  const boat = useGameStore((s) => s.activeVehicle) === "boat";
  const active = useRef<SVGGElement>(null);
  const other = useRef<SVGGElement>(null);
  const toMap = mapper(boat ? SEA : CITY);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = useGameStore.getState().activeVehicle;
      const place = (g: SVGGElement | null, vehicle: "car" | "boat") => {
        if (!g) return;
        const { x, z, heading } = poseOf(vehicle);
        const [mx, mz] = toMap(x, z);
        g.setAttribute("transform", `translate(${mx.toFixed(2)} ${mz.toFixed(2)}) rotate(${(-(heading * 180) / Math.PI + 180).toFixed(1)})`);
      };
      place(active.current, v);
      place(other.current, v === "car" ? "boat" : "car");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toMap]);

  const scale = SIZE / (boat ? SEA.span : CITY.span);
  const poly = (pts: readonly [number, number][]) => pts.map(([x, z]) => toMap(x, z).map((v) => v.toFixed(1)).join(",")).join(" ");

  return (
    <svg className="minimap" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={boat ? "Map of the archipelago with the boat position" : "Map of the city with the car position"} data-testid="minimap" data-mode={boat ? "sea" : "city"}>
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
          {pointsOfInterest.map((p) => {
            const [px, pz] = toMap(p.position[0], p.position[1]);
            return <rect key={p.id} x={px - 1.6} y={pz - 1.6} width="3.2" height="3.2" rx="0.6" fill={accentHex.cyan} opacity="0.9" />;
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
          {/* Harbor marker at the edge of the city map */}
          {harbors
            .filter((h) => h.island === "main")
            .map((h) => {
              const [hx, hz] = toMap(Math.max(h.pierRoot[0], -PLATFORM.halfSize + 2), h.pierRoot[1]);
              return <circle key={h.id} cx={hx} cy={hz} r="2" fill={accentHex.amber} opacity="0.95" data-harbor={h.id} />;
            })}
        </>
      )}
      {/* The parked / moored vehicle, then the active one on top */}
      <g ref={other} data-testid="minimap-other">
        {boat ? <circle r="1.6" fill="#FF7A3D" opacity="0.8" /> : <polygon points="0,-2.4 1.6,2 0,1.2 -1.6,2" fill="#7FE2E9" opacity="0.8" />}
      </g>
      <g ref={active} data-testid="minimap-active">
        <polygon points="0,-3.2 2.4,2.6 0,1.4 -2.4,2.6" fill={boat ? "#7FE2E9" : "#FF7A3D"} stroke="#080F1D" strokeWidth="0.6" />
      </g>
    </svg>
  );
}
