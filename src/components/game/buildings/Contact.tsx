"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { getDistrict } from "@/data/districts";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "../materials";
import { StaticBatch } from "../StaticBatch";

/**
 * Contact Station — communications and exit station.
 * A raised deck with a glass pavilion, a lattice mast carrying a dish and a
 * blinking top light, three antenna posts and a platform edge line: clearly
 * not a building like the others. Front face is −Z (north).
 */
export function Contact() {
  const m = getMaterials();
  const d = getDistrict("contact");
  const [x, z] = d.position;
  const [w, depth] = d.footprint; // 12 × 8
  const front = -depth / 2;
  const deckH = 0.6;
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];
  const beacon = useRef<Mesh>(null);
  const dish = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!profile.ambientMotion) return;
    if (beacon.current) (beacon.current.material as MeshStandardMaterial).emissiveIntensity = clock.elapsedTime % 1.4 < 0.2 ? 2.5 : 0.4;
    if (dish.current) dish.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * 0.5;
  });

  return (
    <group position={[x, 0, z]}>
      <StaticBatch>
      {/* Deck with edge line and steps toward the road */}
      <mesh position={[0, deckH / 2, 0]} material={m.concrete} castShadow receiveShadow>
        <boxGeometry args={[w, deckH, depth]} />
      </mesh>
      <mesh position={[0, deckH + 0.01, front + 0.25]} material={m.lightCyanSoft}>
        <boxGeometry args={[w - 0.6, 0.02, 0.12]} />
      </mesh>
      <mesh position={[0, 0.3, front - 0.7]} material={m.concreteLight} receiveShadow>
        <boxGeometry args={[4.0, 0.3, 1.4]} />
      </mesh>
      <mesh position={[0, 0.15, front - 1.4]} material={m.concreteLight} receiveShadow>
        <boxGeometry args={[4.0, 0.15, 1.4]} />
      </mesh>

      {/* Glass pavilion with metal frame and a lit interior */}
      <mesh position={[-1.5, deckH + 1.5, 0.4]} material={m.glassClear} castShadow>
        <boxGeometry args={[6.0, 3.0, 5.0]} />
      </mesh>
      {[-4.4, 1.4].map((fx) =>
        [-2.0, 2.8].map((fz) => (
          <mesh key={`${fx}${fz}`} position={[fx, deckH + 1.5, fz]} material={m.metal}>
            <boxGeometry args={[0.16, 3.0, 0.16]} />
          </mesh>
        )),
      )}
      <mesh position={[-1.5, deckH + 3.08, 0.4]} material={m.concreteLight} castShadow>
        <boxGeometry args={[6.6, 0.16, 5.6]} />
      </mesh>
      <mesh position={[-1.5, deckH + 1.3, front + 0.03]} material={m.doorCool}>
        <planeGeometry args={[1.6, 2.2]} />
      </mesh>
      <mesh position={[-1.5, deckH + 0.9, 0.4]} material={m.lightCyanSoft}>
        <boxGeometry args={[1.2, 1.4, 1.2]} />
      </mesh>

      {/* Lattice mast: three legs, rings, dish and blinking beacon */}
      <group position={[3.8, deckH, 1.0]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.55, 6.0, Math.sin(a) * 0.55]} rotation={[0, 0, 0]} material={m.metal} castShadow>
              <boxGeometry args={[0.1, 12.0, 0.1]} />
            </mesh>
          );
        })}
        {[2, 5, 8, 11].map((ry) => (
          <mesh key={ry} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metalDark}>
            <torusGeometry args={[0.62, 0.04, 4, 12]} />
          </mesh>
        ))}
        <group ref={dish} position={[0, 7.5, 0]} userData={{ dynamic: true }}>
          <mesh position={[0.9, 0, 0]} rotation={[0, 0, -Math.PI / 2 + 0.5]} material={m.concreteLight} castShadow>
            <cylinderGeometry args={[1.5, 1.1, 0.25, 16]} />
          </mesh>
          <mesh position={[1.3, 0.5, 0]} material={m.metal}>
            <boxGeometry args={[0.08, 1.1, 0.08]} />
          </mesh>
        </group>
        <mesh ref={beacon} position={[0, 12.3, 0]} material={m.beaconRed} userData={{ dynamic: true }}>
          <sphereGeometry args={[0.22, 8, 8]} />
        </mesh>
      </group>
      {/* Antenna posts along the back edge */}
      {[-4.5, -2.5, -0.5].map((ax) => (
        <group key={ax} position={[ax, deckH, depth / 2 - 0.5]}>
          <mesh position={[0, 1.6, 0]} material={m.metalDark}>
            <boxGeometry args={[0.08, 3.2, 0.08]} />
          </mesh>
          <mesh position={[0, 3.3, 0]} material={m.lightCyan}>
            <sphereGeometry args={[0.1, 6, 6]} />
          </mesh>
        </group>
      ))}
      </StaticBatch>
    </group>
  );
}
