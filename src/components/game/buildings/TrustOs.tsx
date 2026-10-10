"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { getDistrict } from "@/data/districts";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "../materials";
import { StaticBatch } from "../StaticBatch";
import { WindowGrid } from "./WindowGrid";

/**
 * TrustOS — digital identity, verification and security lab.
 * A wide secure base with a window band and a scanner-gate portal, carrying a
 * 45°-rotated vault cube wrapped by a slowly turning verification ring; a rack
 * of server fins at the back and a key-shaped mast on one corner.
 * Front face is −Z (north).
 */
export function TrustOs() {
  const m = getMaterials();
  const d = getDistrict("trustos");
  const [x, z] = d.position;
  const [w, depth] = d.footprint; // 14 × 14
  const front = -depth / 2;
  const baseH = 3.2;
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];
  const ring = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (profile.ambientMotion && ring.current) ring.current.rotation.z += delta * 0.2;
  });

  return (
    <group position={[x, 0, z]}>
      <StaticBatch>
      {/* Secure base with parapet and window band */}
      <mesh position={[0, baseH / 2, 0]} material={m.facade} castShadow receiveShadow>
        <boxGeometry args={[w, baseH, depth]} />
      </mesh>
      <mesh position={[0, baseH + 0.15, 0]} material={m.concreteLight} castShadow>
        <boxGeometry args={[w + 0.3, 0.3, depth + 0.3]} />
      </mesh>
      <WindowGrid position={[-3.6, 1.9, front - 0.02]} rotationY={Math.PI} cols={4} rows={1} size={[1.1, 0.7]} gap={[1.5, 1]} lit={palette.windowCool} ratio={0.75} seed={31} />
      <WindowGrid position={[3.6, 1.9, front - 0.02]} rotationY={Math.PI} cols={4} rows={1} size={[1.1, 0.7]} gap={[1.5, 1]} lit={palette.windowCool} ratio={0.75} seed={32} />
      <WindowGrid position={[-w / 2 - 0.02, 1.9, 0]} rotationY={-Math.PI / 2} cols={6} rows={1} size={[1.1, 0.7]} gap={[1.8, 1]} lit={palette.windowCool} ratio={0.5} seed={33} />

      {/* Scanner-gate portal: two pylons, a cyan beam, lit door */}
      {[-1.6, 1.6].map((px) => (
        <mesh key={px} position={[px, 1.7, front - 0.9]} material={m.concreteLight} castShadow>
          <boxGeometry args={[0.4, 3.4, 0.4]} />
        </mesh>
      ))}
      <mesh position={[0, 3.3, front - 0.9]} material={m.concreteLight}>
        <boxGeometry args={[3.6, 0.3, 0.5]} />
      </mesh>
      <mesh position={[0, 3.12, front - 0.9]} material={m.lightCyan}>
        <boxGeometry args={[3.0, 0.05, 0.08]} />
      </mesh>
      <mesh position={[0, 1.4, front - 0.04]} material={m.doorCool}>
        <planeGeometry args={[1.8, 2.4]} />
      </mesh>
      <mesh position={[0, 0.1, front - 1.6]} material={m.concrete} receiveShadow>
        <boxGeometry args={[4.4, 0.2, 1.4]} />
      </mesh>

      {/* Vault cube rotated 45°, wrapped by the verification ring */}
      <mesh position={[0, baseH + 0.3 + 3.5, 0]} rotation={[0, Math.PI / 4, 0]} material={m.facadeLight} castShadow receiveShadow>
        <boxGeometry args={[7.6, 7.0, 7.6]} />
      </mesh>
      <mesh position={[0, baseH + 0.3 + 3.5, 0]} rotation={[0, Math.PI / 4, 0]} material={m.glass}>
        <boxGeometry args={[7.7, 0.8, 7.7]} />
      </mesh>
      <mesh position={[0, baseH + 0.3 + 7.1, 0]} rotation={[0, Math.PI / 4, 0]} material={m.concreteLight} castShadow>
        <boxGeometry args={[5.4, 0.3, 5.4]} />
      </mesh>
      <mesh ref={ring} position={[0, baseH + 0.3 + 3.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal} castShadow userData={{ dynamic: true }}>
        <torusGeometry args={[6.1, 0.14, 8, 48]} />
      </mesh>
      <mesh position={[0, baseH + 0.3 + 3.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.lightCyan}>
        <torusGeometry args={[6.1, 0.05, 6, 48]} />
      </mesh>
      {/* Corner frame and lit top edges give the vault its structure */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 5.37, baseH + 0.3 + 3.5, Math.sin(a) * 5.37]} rotation={[0, Math.PI / 4, 0]} material={m.metal} castShadow>
            <boxGeometry args={[0.34, 7.2, 0.34]} />
          </mesh>
        );
      })}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 3.8, baseH + 0.3 + 7.02, Math.sin(a) * 3.8]} rotation={[0, -a, 0]} material={m.lightCyan}>
            <boxGeometry args={[0.06, 0.06, 7.6]} />
          </mesh>
        );
      })}
      {/* Cyan shield emblem on the front corner of the cube */}
      <mesh position={[0, baseH + 0.3 + 3.5, -5.46]} rotation={[0, Math.PI / 4, 0]} material={m.lightCyanSoft}>
        <boxGeometry args={[0.18, 2.4, 0.18]} />
      </mesh>

      {/* Server fins at the back of the base roof */}
      {[-4.5, -3.0, -1.5, 0, 1.5, 3.0, 4.5].map((fx) => (
        <mesh key={fx} position={[fx, baseH + 1.2, depth / 2 - 1.3]} material={m.metalDark} castShadow>
          <boxGeometry args={[0.3, 1.8, 1.6]} />
        </mesh>
      ))}
      {/* Key mast on the west corner */}
      <mesh position={[-w / 2 + 1.0, baseH + 5.0, -depth / 2 + 1.0]} material={m.metalDark} castShadow>
        <boxGeometry args={[0.16, 9.5, 0.16]} />
      </mesh>
      {[7.5, 8.5, 9.5].map((ry) => (
        <mesh key={ry} position={[-w / 2 + 1.0, baseH + ry, -depth / 2 + 1.0]} rotation={[Math.PI / 2, 0, 0]} material={m.lightCyan}>
          <torusGeometry args={[0.45, 0.05, 6, 16]} />
        </mesh>
      ))}
      </StaticBatch>
    </group>
  );
}
