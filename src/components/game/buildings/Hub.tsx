"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import { getDistrict } from "@/data/districts";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "../materials";
import { StaticBatch } from "../StaticBatch";

const OCT = 8;
const BASE_Y = 0.42; // top of the plaza island

/**
 * Central Hub — "The Engineering Nexus".
 * Octagonal plinth, glazed ground floor behind eight pillars, cantilevered
 * concrete slab, a smaller upper volume with a glass band, an architectural
 * ring with a cyan underside, and a glazed core column rising to a spire.
 * The entrance faces south (+Z), toward the car spawn.
 */
export function Hub() {
  const m = getMaterials();
  const d = getDistrict("hub");
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];
  const core = useRef<Mesh>(null);
  const r = d.footprint[0] / 2; // 5

  useFrame(({ clock }) => {
    if (!profile.ambientMotion || !core.current) return;
    const mat = core.current.material as MeshStandardMaterial;
    mat.emissiveIntensity = 0.9 + Math.sin(clock.elapsedTime * 1.4) * 0.25;
  });

  return (
    <group position={[d.position[0], BASE_Y, d.position[1]]}>
      <StaticBatch>
      {/* Plinth with perimeter light strip */}
      <mesh position={[0, 0.25, 0]} material={m.concreteLight} castShadow receiveShadow>
        <cylinderGeometry args={[r + 0.1, r + 0.4, 0.5, OCT]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.lightCyan}>
        <torusGeometry args={[r + 0.42, 0.04, 6, 48]} />
      </mesh>

      {/* Ground floor: glass drum behind pillars */}
      <mesh position={[0, 2.1, 0]} material={m.glass} castShadow>
        <cylinderGeometry args={[r - 0.7, r - 0.7, 3.2, OCT]} />
      </mesh>
      {Array.from({ length: OCT }, (_, i) => {
        const a = (i / OCT) * Math.PI * 2 + Math.PI / OCT;
        return (
          <mesh key={i} position={[Math.cos(a) * (r - 0.35), 2.1, Math.sin(a) * (r - 0.35)]} rotation={[0, -a, 0]} material={m.metal} castShadow>
            <boxGeometry args={[0.32, 3.2, 0.32]} />
          </mesh>
        );
      })}
      {/* First slab: cantilevered concrete */}
      <mesh position={[0, 3.95, 0]} material={m.concrete} castShadow receiveShadow>
        <cylinderGeometry args={[r + 0.2, r, 0.5, OCT]} />
      </mesh>
      <mesh position={[0, 3.68, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.lightCyanSoft}>
        <torusGeometry args={[r - 0.2, 0.05, 6, 48]} />
      </mesh>

      {/* Upper volume with glass band */}
      <mesh position={[0, 5.55, 0]} material={m.facadeLight} castShadow receiveShadow>
        <cylinderGeometry args={[r - 1.5, r - 1.3, 2.7, OCT]} />
      </mesh>
      <mesh position={[0, 5.75, 0]} material={m.glass}>
        <cylinderGeometry args={[r - 1.26, r - 1.26, 0.9, OCT]} />
      </mesh>
      {/* Top slab */}
      <mesh position={[0, 7.1, 0]} material={m.concreteLight} castShadow>
        <cylinderGeometry args={[r - 0.9, r - 1.3, 0.4, OCT]} />
      </mesh>

      {/* Architectural ring on four struts, cyan underside */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * (r - 0.5), 7.6, Math.sin(a) * (r - 0.5)]} material={m.metalDark}>
            <boxGeometry args={[0.18, 1.2, 0.18]} />
          </mesh>
        );
      })}
      <mesh position={[0, 8.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal} castShadow>
        <torusGeometry args={[r - 0.1, 0.24, 8, 48]} />
      </mesh>
      <mesh position={[0, 7.98, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.lightCyan}>
        <torusGeometry args={[r - 0.1, 0.07, 6, 48]} />
      </mesh>

      {/* Core: glass column with emissive heart, metal rings, spire and beacon */}
      <mesh position={[0, 10.4, 0]} material={m.glass} castShadow>
        <cylinderGeometry args={[1.25, 1.35, 6.2, OCT]} />
      </mesh>
      <mesh ref={core} position={[0, 10.4, 0]} material={m.lightCyanSoft} userData={{ dynamic: true }}>
        <cylinderGeometry args={[0.5, 0.5, 6.0, 8]} />
      </mesh>
      {[9.0, 10.6, 12.2].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
          <torusGeometry args={[1.45, 0.06, 6, 24]} />
        </mesh>
      ))}
      <mesh position={[0, 13.7, 0]} material={m.metalDark}>
        <cylinderGeometry args={[0.6, 1.3, 0.5, OCT]} />
      </mesh>
      <mesh position={[0, 15.4, 0]} material={m.metalDark} castShadow>
        <boxGeometry args={[0.18, 3.0, 0.18]} />
      </mesh>
      <mesh position={[0, 17.0, 0]} material={m.lightCyan}>
        <sphereGeometry args={[0.3, 10, 10]} />
      </mesh>

      {/* Entrance: canopy on two columns, lit door, warm lanterns */}
      <mesh position={[0, 3.25, r + 0.9]} material={m.concreteLight} castShadow>
        <boxGeometry args={[4.4, 0.25, 2.6]} />
      </mesh>
      <mesh position={[0, 3.1, r + 1.6]} material={m.lightAmberSoft}>
        <boxGeometry args={[3.8, 0.05, 0.12]} />
      </mesh>
      {[-1.8, 1.8].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.6, r + 1.9]} material={m.metal} castShadow>
            <boxGeometry args={[0.26, 3.2, 0.26]} />
          </mesh>
          <mesh position={[x, 2.95, r + 1.9]} material={m.lightAmber}>
            <boxGeometry args={[0.3, 0.12, 0.3]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.5, r - 0.68]} material={m.doorCool}>
        <planeGeometry args={[1.8, 2.4]} />
      </mesh>

      {/* Geometric gardens on the island, between the exits */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const x = Math.cos(a) * 6.3;
        const z = Math.sin(a) * 6.3;
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, -a, 0]}>
            <mesh position={[0, 0.22, 0]} material={m.planter} castShadow receiveShadow>
              <boxGeometry args={[1.5, 0.44, 1.5]} />
            </mesh>
            <mesh position={[0, 0.8, 0]} material={m.bush} castShadow>
              <dodecahedronGeometry args={[0.62, 0]} />
            </mesh>
          </group>
        );
      })}

      </StaticBatch>
      {profile.headlight && <pointLight position={[0, 9, 0]} color={palette.cyan} intensity={22} distance={26} decay={2} />}
    </group>
  );
}
