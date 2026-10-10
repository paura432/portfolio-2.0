"use client";

import { useCallback, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { getDistrict } from "@/data/districts";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { getMaterials } from "../materials";

const OCT = 8;
const ROT = Math.PI / 8; // flat octagon faces toward the axes

/**
 * OVI — "AI Intelligence Core".
 * Three stacked octagonal drums on a plinth, separated by floating slabs and
 * braced by four diagonal struts; cyan light slots reveal the glowing core
 * column; a glazed top drum carries the orb with two slowly orbiting rings.
 * Portal entrance faces south (+Z).
 */
export function Ovi() {
  const m = getMaterials();
  const d = getDistrict("ovi");
  const [x, z] = d.position;
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];
  const rings = useRef<Group>(null);
  const orb = useRef<Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (!profile.ambientMotion) return;
    if (rings.current) {
      rings.current.rotation.y += delta * 0.35;
      rings.current.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.25;
    }
    if (orb.current) (orb.current.material as MeshStandardMaterial).emissiveIntensity = 1.1 + Math.sin(clock.elapsedTime * 2) * 0.3;
  });

  /** Light slots: one per octagon face on the two lower drums. */
  const slots = useCallback((mesh: InstancedMesh | null) => {
    if (!mesh) return;
    const o = new Object3D();
    let i = 0;
    for (const [r, y, h] of [
      [5.4, 2.9, 3.4],
      [4.6, 7.5, 3.4],
    ] as const) {
      const apothem = r * Math.cos(Math.PI / OCT) + 0.03;
      for (let k = 0; k < OCT; k++) {
        const a = (k / OCT) * Math.PI * 2;
        o.position.set(Math.cos(a) * apothem, y, Math.sin(a) * apothem);
        o.rotation.set(0, -a + Math.PI / 2, 0);
        o.scale.set(1, h, 1);
        o.updateMatrix();
        mesh.setMatrixAt(i++, o.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group position={[x, 0, z]}>
      {/* Plinth with radiating data lines and entrance steps */}
      <mesh position={[0, 0.4, 0]} rotation={[0, ROT, 0]} material={m.concreteLight} castShadow receiveShadow>
        <cylinderGeometry args={[6.4, 6.8, 0.8, OCT]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.81, 0]} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 4]} material={m.lightCyanSoft}>
          <planeGeometry args={[0.12, 11.5]} />
        </mesh>
      ))}
      <mesh position={[0, 0.15, 6.6]} material={m.concrete} receiveShadow>
        <boxGeometry args={[4.6, 0.3, 1.0]} />
      </mesh>

      {/* Drums and slabs */}
      <mesh position={[0, 2.9, 0]} rotation={[0, ROT, 0]} material={m.facade} castShadow receiveShadow>
        <cylinderGeometry args={[5.4, 5.4, 4.2, OCT]} />
      </mesh>
      <mesh position={[0, 5.2, 0]} rotation={[0, ROT, 0]} material={m.concreteLight} castShadow receiveShadow>
        <cylinderGeometry args={[6.0, 5.8, 0.4, OCT]} />
      </mesh>
      <mesh position={[0, 7.5, 0]} rotation={[0, ROT, 0]} material={m.facadeLight} castShadow receiveShadow>
        <cylinderGeometry args={[4.6, 4.6, 4.2, OCT]} />
      </mesh>
      <mesh position={[0, 9.8, 0]} rotation={[0, ROT, 0]} material={m.concreteLight} castShadow receiveShadow>
        <cylinderGeometry args={[5.2, 5.0, 0.4, OCT]} />
      </mesh>
      <mesh position={[0, 11.9, 0]} rotation={[0, ROT, 0]} material={m.glass} castShadow>
        <cylinderGeometry args={[3.7, 3.7, 3.8, OCT]} />
      </mesh>
      {[10.05, 13.75].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, ROT, 0]} material={m.metal}>
          <cylinderGeometry args={[3.8, 3.8, 0.14, OCT]} />
        </mesh>
      ))}

      {/* Core column and light slots */}
      <mesh position={[0, 8.2, 0]} material={m.lightCyanSoft}>
        <cylinderGeometry args={[1.0, 1.0, 14.6, 12]} />
      </mesh>
      <instancedMesh ref={slots} args={[undefined, undefined, OCT * 2]} material={m.lightCyan}>
        <planeGeometry args={[0.22, 1]} />
      </instancedMesh>

      {/* Diagonal struts from the plinth to the first slab */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 6.0, 2.9, Math.sin(a) * 6.0]} rotation={[0, -a, -0.38]} material={m.metalDark} castShadow>
            <boxGeometry args={[0.28, 5.2, 0.28]} />
          </mesh>
        );
      })}

      {/* Orb with orbiting rings */}
      <mesh position={[0, 14.4, 0]} material={m.metalDark}>
        <cylinderGeometry args={[0.9, 1.3, 1.2, OCT]} />
      </mesh>
      <mesh ref={orb} position={[0, 16.3, 0]} material={m.lightCyanSoft}>
        <sphereGeometry args={[1.5, 16, 16]} />
      </mesh>
      <group ref={rings} position={[0, 16.3, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
          <torusGeometry args={[2.5, 0.08, 6, 36]} />
        </mesh>
        <mesh rotation={[Math.PI / 2 + 0.9, 0.4, 0]} material={m.metal}>
          <torusGeometry args={[2.9, 0.06, 6, 36]} />
        </mesh>
      </group>

      {/* Portal entrance: pylons, lintel with cyan strip, lit lobby */}
      {[-2.1, 2.1].map((px) => (
        <mesh key={px} position={[px, 2.3, 6.1]} material={m.concrete} castShadow>
          <boxGeometry args={[0.5, 4.6, 0.6]} />
        </mesh>
      ))}
      <mesh position={[0, 4.75, 6.1]} material={m.concreteLight} castShadow>
        <boxGeometry args={[5.0, 0.5, 0.8]} />
      </mesh>
      <mesh position={[0, 4.47, 6.1]} material={m.lightCyan}>
        <boxGeometry args={[4.2, 0.06, 0.1]} />
      </mesh>
      <mesh position={[0, 1.6, 5.02]} material={m.doorCool}>
        <planeGeometry args={[2.6, 2.6]} />
      </mesh>

      {profile.headlight && <pointLight position={[0, 15, 0]} color={palette.cyan} intensity={28} distance={30} decay={2} />}
      {profile.headlight && <pointLight position={[0, 3, 8]} color={palette.cyan} intensity={10} distance={16} decay={2} />}
    </group>
  );
}
