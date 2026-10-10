"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { getDistrict } from "@/data/districts";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "../materials";
import { StaticBatch } from "../StaticBatch";
import { WindowGrid } from "./WindowGrid";

/**
 * BROKI — operations and logistics facility.
 * A barrel-roofed warehouse with three loading docks and a raised dock
 * platform, a two-storey operations office at the east end, a container yard
 * with a gantry at the west end. Nothing site-specific: a generic operational
 * platform, as the content audit requires. Front face is −Z (north).
 */
export function Broki() {
  const m = getMaterials();
  const d = getDistrict("broki");
  const [x, z] = d.position;
  const depth = d.footprint[1]; // 12
  const front = -depth / 2; // −6
  const hallX = 2.25;
  const hallW = 9.5;
  const hallH = 5.0;
  const yardX = -4.75;
  const trolley = useRef<Group>(null);
  const ambientMotion = QUALITY_PROFILES[useGameStore((s) => s.quality)].ambientMotion;

  // Ambient activity (V4): the gantry trolley crawls along the beam. Gated by the tier.
  useFrame(({ clock }) => {
    if (!ambientMotion || !trolley.current) return;
    const p = (clock.elapsedTime % 12) / 12;
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;
    const ease = tri * tri * (3 - 2 * tri);
    trolley.current.position.x = yardX - 1.7 + ease * 3.4;
  });

  return (
    <group position={[x, 0, z]}>
      <StaticBatch>
      {/* Warehouse hall with barrel roof and ridge ventilators */}
      <mesh position={[hallX, hallH / 2, 0]} material={m.facade} castShadow receiveShadow>
        <boxGeometry args={[hallW, hallH, depth]} />
      </mesh>
      <mesh position={[hallX, hallH, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.5, 1, 1]} material={m.facadeLight} castShadow>
        <cylinderGeometry args={[hallW / 2, hallW / 2, depth, 14, 1, false, 0, Math.PI]} />
      </mesh>
      {/* Gable end walls under the barrel roof */}
      {[front, -front].map((gz) => (
        <mesh key={gz} position={[hallX, hallH, gz]} rotation={[0, gz < 0 ? Math.PI : 0, 0]} scale={[1, 0.5, 1]} material={m.facadeDark}>
          <circleGeometry args={[hallW / 2 - 0.02, 14, 0, Math.PI]} />
        </mesh>
      ))}
      {[-3, 0, 3].map((vz) => (
        <mesh key={vz} position={[hallX, hallH + hallW / 4 + 0.2, vz]} material={m.metalDark}>
          <boxGeometry args={[0.8, 0.5, 1.4]} />
        </mesh>
      ))}

      {/* Dock platform, three roller doors with canopies and hazard edges */}
      <mesh position={[hallX, 0.55, front - 0.9]} material={m.concrete} castShadow receiveShadow>
        <boxGeometry args={[hallW, 1.1, 1.8]} />
      </mesh>
      {[-3, 0, 3].map((dx, i) => (
        <group key={dx} position={[hallX + dx, 0, front]}>
          <mesh position={[0, 2.5, -0.04]} material={m.shutter}>
            <boxGeometry args={[2.3, 2.8, 0.1]} />
          </mesh>
          {[1.6, 2.2, 2.8, 3.4].map((sy) => (
            <mesh key={sy} position={[0, sy, -0.1]} material={m.metal}>
              <boxGeometry args={[2.1, 0.06, 0.02]} />
            </mesh>
          ))}
          <mesh position={[0, 4.15, -0.7]} material={m.metalDark} castShadow>
            <boxGeometry args={[2.8, 0.14, 1.4]} />
          </mesh>
          <mesh position={[0, 4.06, -1.35]} material={i === 1 ? m.lightAmberSoft : m.lightWarm}>
            <boxGeometry args={[2.4, 0.04, 0.08]} />
          </mesh>
          <mesh position={[0, 1.12, -1.82]} material={m.hazard}>
            <boxGeometry args={[2.3, 0.1, 0.06]} />
          </mesh>
        </group>
      ))}

      {/* Operations office: two storeys, parapet, cool windows, entrance canopy */}
      <mesh position={[5.5, 3.2, -2.5]} material={m.facadeLight} castShadow receiveShadow>
        <boxGeometry args={[3.0, 6.4, 7.0]} />
      </mesh>
      <mesh position={[5.5, 6.55, -2.5]} material={m.concreteLight}>
        <boxGeometry args={[3.2, 0.3, 7.2]} />
      </mesh>
      <WindowGrid position={[5.5, 4.6, front + 0.02]} rotationY={0} cols={2} rows={1} size={[0.9, 1.1]} gap={[1.3, 1]} lit={palette.windowCool} ratio={0.9} seed={21} />
      <WindowGrid position={[7.02, 3.9, -2.5]} rotationY={Math.PI / 2} cols={4} rows={2} size={[0.9, 1.0]} gap={[1.5, 2.2]} lit={palette.windowCool} ratio={0.6} seed={22} />
      <mesh position={[5.5, 1.4, front + 0.08]} material={m.doorWarm}>
        <planeGeometry args={[1.4, 2.4]} />
      </mesh>
      <mesh position={[5.5, 2.9, front - 0.6]} material={m.metalDark} castShadow>
        <boxGeometry args={[2.4, 0.14, 1.3]} />
      </mesh>

      {/* Container yard with a gantry frame */}
      {[
        [yardX - 1.3, 1.2, 2.5, m.carBodyDark],
        [yardX + 1.3, 1.2, 2.5, m.metalDark],
        [yardX - 1.3, 3.6, 2.5, m.metal],
        [yardX + 0.2, 1.2, -2.2, m.facadeLight],
      ].map(([cx, cy, cz, mat], i) => (
        <mesh key={i} position={[cx as number, cy as number, cz as number]} material={mat as typeof m.metal} castShadow receiveShadow>
          <boxGeometry args={[2.4, 2.4, 5.6]} />
        </mesh>
      ))}
      {[-2.2, 2.2].map((gz) => (
        <group key={gz}>
          {[yardX - 2.0, yardX + 2.0].map((gx) => (
            <mesh key={gx} position={[gx, 3.5, gz]} material={m.metal} castShadow>
              <boxGeometry args={[0.2, 7.0, 0.2]} />
            </mesh>
          ))}
          <mesh position={[yardX, 7.0, gz]} material={m.metal}>
            <boxGeometry args={[4.6, 0.3, 0.3]} />
          </mesh>
        </group>
      ))}
      <mesh position={[yardX, 6.6, 0]} material={m.lightAmber}>
        <boxGeometry args={[0.3, 0.2, 4.4]} />
      </mesh>
      {/* Gantry trolley on the north beam (animated; never merged) */}
      <group ref={trolley} position={[yardX - 1.7, 6.75, -2.2]} userData={{ dynamic: true }}>
        <mesh material={m.metalDark} castShadow>
          <boxGeometry args={[0.7, 0.5, 0.6]} />
        </mesh>
        <mesh position={[0, -0.55, 0]} material={m.metal}>
          <boxGeometry args={[0.08, 0.6, 0.08]} />
        </mesh>
        <mesh position={[0, 0.3, 0.32]} material={m.lightAmber}>
          <boxGeometry args={[0.12, 0.08, 0.04]} />
        </mesh>
      </group>
      {/* Mast with beacon on the hall corner */}
      <mesh position={[hallX + hallW / 2 - 0.5, hallH + 3.2, depth / 2 - 0.5]} material={m.metalDark}>
        <boxGeometry args={[0.12, 4.0, 0.12]} />
      </mesh>
      <mesh position={[hallX + hallW / 2 - 0.5, hallH + 5.3, depth / 2 - 0.5]} material={m.lightAmber}>
        <sphereGeometry args={[0.22, 8, 8]} />
      </mesh>
      </StaticBatch>
    </group>
  );
}
