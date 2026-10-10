"use client";

import { useMemo } from "react";
import { PLATFORM, PLAZA, ROADS } from "@/data/world";
import { palette } from "@/lib/palette";
import { Buildings } from "./Buildings";
import { Props } from "./Props";
import { DistrictSigns } from "./DistrictSigns";

const DASH_LENGTH = 1.6;
const DASH_GAP = 3.2;

interface Dash {
  x: number;
  z: number;
  rotation: number;
}

function useRoadDashes(): Dash[] {
  return useMemo(() => {
    const dashes: Dash[] = [];
    for (const r of ROADS) {
      const [ax, az] = r.from;
      const [bx, bz] = r.to;
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      const ux = dx / len;
      const uz = dz / len;
      const rotation = Math.atan2(ux, uz);
      for (let s = DASH_GAP; s < len - DASH_GAP; s += DASH_LENGTH + DASH_GAP) {
        dashes.push({ x: ax + ux * s, z: az + uz * s, rotation });
      }
    }
    return dashes;
  }, []);
}

export function World() {
  const dashes = useRoadDashes();
  const half = PLATFORM.halfSize;

  return (
    <group>
      {/* Floating island: top slab + darker, inset underside */}
      <mesh position={[0, -PLATFORM.thickness / 2, 0]} receiveShadow>
        <boxGeometry args={[half * 2, PLATFORM.thickness, half * 2]} />
        <meshStandardMaterial color={palette.ground} roughness={0.95} />
      </mesh>
      <mesh position={[0, -PLATFORM.thickness - 3, 0]}>
        <boxGeometry args={[half * 2 - 14, 6, half * 2 - 14]} />
        <meshStandardMaterial color={palette.groundDeep} roughness={1} />
      </mesh>
      <mesh position={[0, -PLATFORM.thickness - 9, 0]}>
        <boxGeometry args={[half * 2 - 40, 6, half * 2 - 40]} />
        <meshStandardMaterial color="#070F1B" roughness={1} />
      </mesh>

      {/* Roads */}
      {ROADS.map((r, i) => {
        const [ax, az] = r.from;
        const [bx, bz] = r.to;
        const len = Math.hypot(bx - ax, bz - az) + r.width;
        const rotation = Math.atan2(bx - ax, bz - az);
        return (
          <mesh
            key={i}
            position={[(ax + bx) / 2, 0.02, (az + bz) / 2]}
            rotation={[-Math.PI / 2, 0, -rotation]}
            receiveShadow
          >
            <planeGeometry args={[r.width, len]} />
            <meshStandardMaterial color={palette.road} roughness={0.9} />
          </mesh>
        );
      })}

      {/* Lane dashes */}
      {dashes.map((d, i) => (
        <mesh key={i} position={[d.x, 0.035, d.z]} rotation={[-Math.PI / 2, 0, -d.rotation]}>
          <planeGeometry args={[0.16, DASH_LENGTH]} />
          <meshBasicMaterial color={palette.roadLine} />
        </mesh>
      ))}

      {/* Plaza roundabout */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[PLAZA.innerRadius, PLAZA.outerRadius, 48]} />
        <meshStandardMaterial color={palette.road} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[PLAZA.innerRadius, PLAZA.innerRadius, 0.3, 48]} />
        <meshStandardMaterial color={palette.buildingDark} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PLAZA.innerRadius - 0.5, PLAZA.innerRadius - 0.25, 48]} />
        <meshBasicMaterial color={palette.cyan} transparent opacity={0.55} />
      </mesh>

      <Buildings />
      <DistrictSigns />
      <Props />
    </group>
  );
}
