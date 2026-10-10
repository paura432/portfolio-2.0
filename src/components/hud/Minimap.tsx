"use client";

import { useEffect, useRef } from "react";
import { districts } from "@/data/districts";
import { PLATFORM, PLAZA, ROADS } from "@/data/world";
import { liveCar } from "@/game/vehicle/carState";
import { accentHex } from "@/lib/palette";

const SIZE = 100; // viewBox units
const SCALE = SIZE / (PLATFORM.halfSize * 2);
const toMap = (x: number, z: number): [number, number] => [(x + PLATFORM.halfSize) * SCALE, (z + PLATFORM.halfSize) * SCALE];

/** Top-down map built from the same road and district data as the 3D world; the car marker is updated outside React. */
export function Minimap() {
  const car = useRef<SVGGElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const g = car.current;
      if (g) {
        const { x, z, heading } = liveCar.state;
        const [mx, mz] = toMap(x, z);
        g.setAttribute("transform", `translate(${mx.toFixed(2)} ${mz.toFixed(2)}) rotate(${(-(heading * 180) / Math.PI + 180).toFixed(1)})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg className="minimap" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Map of the city with the car position" data-testid="minimap">
      <rect x="1" y="1" width={SIZE - 2} height={SIZE - 2} rx="6" fill="#142538" />
      {ROADS.map((r, i) => {
        const [ax, az] = toMap(r.from[0], r.from[1]);
        const [bx, bz] = toMap(r.to[0], r.to[1]);
        return <line key={i} x1={ax} y1={az} x2={bx} y2={bz} stroke="#2E4A66" strokeWidth={r.width * SCALE} strokeLinecap="round" />;
      })}
      <circle cx={SIZE / 2} cy={SIZE / 2} r={((PLAZA.innerRadius + PLAZA.outerRadius) / 2) * SCALE} fill="none" stroke="#2E4A66" strokeWidth={(PLAZA.outerRadius - PLAZA.innerRadius) * SCALE} />
      {districts.map((d) => {
        const [cx, cz] = toMap(d.position[0], d.position[1]);
        const w = d.footprint[0] * SCALE;
        const h = d.footprint[1] * SCALE;
        const color = accentHex[d.accent];
        return d.built ? (
          <g key={d.id} data-district={d.id}>
            <rect x={cx - w / 2} y={cz - h / 2} width={w} height={h} rx="1" fill={color} opacity="0.9">
              <title>{d.name}</title>
            </rect>
            {(d.plots ?? []).map((p) => {
              const [px, pz] = toMap(p.position[0], p.position[1]);
              return (
                <rect key={p.id} x={px - (p.footprint[0] * SCALE) / 2} y={pz - (p.footprint[1] * SCALE) / 2} width={p.footprint[0] * SCALE} height={p.footprint[1] * SCALE} rx="0.6" fill={color} opacity="0.55">
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
      <g ref={car}>
        <polygon points="0,-3.2 2.4,2.6 0,1.4 -2.4,2.6" fill="#FF7A3D" stroke="#080F1D" strokeWidth="0.6" />
      </g>
    </svg>
  );
}
