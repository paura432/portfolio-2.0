"use client";

import { useCallback } from "react";
import { Color, InstancedMesh, Matrix4 } from "three";
import { districts, getDistrict } from "@/data/districts";
import { palette } from "@/lib/palette";
import { seededRandom } from "@/lib/seededRandom";

interface WindowGridProps {
  /** Face centre. */
  position: [number, number, number];
  /** Rotation around Y so the grid faces outward. */
  rotationY: number;
  cols: number;
  rows: number;
  gap?: [number, number];
  size?: [number, number];
  lit: string;
  seed: number;
}

/** Instanced window quads on a building face; a seeded subset is lit. */
function WindowGrid({ position, rotationY, cols, rows, gap = [1.2, 1.4], size = [0.6, 0.8], lit, seed }: WindowGridProps) {
  const count = cols * rows;

  const setup = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const rand = seededRandom(seed);
      const m = new Matrix4();
      const c = new Color();
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          m.makeTranslation((col - (cols - 1) / 2) * gap[0], (r - (rows - 1) / 2) * gap[1], 0);
          mesh.setMatrixAt(i, m);
          c.set(rand() < 0.42 ? lit : "#101D2E");
          mesh.setColorAt(i, c);
          i++;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    [cols, rows, gap, lit, seed],
  );

  return (
    <instancedMesh ref={setup} args={[undefined, undefined, count]} position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={size} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </instancedMesh>
  );
}

function HubPavilion() {
  const d = getDistrict("hub");
  const r = d.footprint[0] / 2;
  return (
    <group position={[d.position[0], 0.3, d.position[1]]}>
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r - 0.6, r, 3.2, 8]} />
        <meshStandardMaterial color={palette.building} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 3.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r - 0.5, 0.12, 8, 48]} />
        <meshBasicMaterial color={palette.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.6, 0]} castShadow>
        <cylinderGeometry args={[r - 2.2, r - 1.4, 2.4, 8]} />
        <meshStandardMaterial color={palette.buildingLight} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 10, 0]} castShadow>
        <boxGeometry args={[0.32, 9, 0.32]} />
        <meshStandardMaterial color={palette.buildingDark} roughness={0.5} />
      </mesh>
      <mesh position={[0, 14.7, 0]}>
        <sphereGeometry args={[0.42, 12, 12]} />
        <meshBasicMaterial color={palette.cyan} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 6, 0]} color={palette.cyan} intensity={18} distance={22} decay={2} />
      {/* Bollards around the plaza */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return (
          <mesh key={i} position={[Math.cos(a) * (r + 1.6), 0.35, Math.sin(a) * (r + 1.6)]}>
            <cylinderGeometry args={[0.14, 0.14, 0.7, 6]} />
            <meshStandardMaterial color={palette.buildingLight} emissive={palette.cyan} emissiveIntensity={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}

/** DUPLEX: two offset stacked volumes (a "duplex") with an amber diagnostic mast. */
function DuplexBuilding() {
  const d = getDistrict("duplex");
  const [w, depth] = d.footprint;
  const [x, z] = d.position;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 5.2, depth]} />
        <meshStandardMaterial color={palette.building} roughness={0.8} />
      </mesh>
      <mesh position={[2.2, 7.4, -1.6]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.58, 4.4, depth * 0.66]} />
        <meshStandardMaterial color={palette.buildingLight} roughness={0.8} />
      </mesh>
      {/* Amber strip above the entrance (south face, z+) */}
      <mesh position={[0, 4.6, depth / 2 + 0.06]}>
        <boxGeometry args={[w * 0.7, 0.22, 0.1]} />
        <meshBasicMaterial color={palette.amber} toneMapped={false} />
      </mesh>
      {/* Entrance door */}
      <mesh position={[-2.5, 1.2, depth / 2 + 0.03]}>
        <planeGeometry args={[2.2, 2.4]} />
        <meshBasicMaterial color="#F0C28F" toneMapped={false} />
      </mesh>
      <WindowGrid position={[2.4, 2.9, depth / 2 + 0.03]} rotationY={0} cols={5} rows={2} lit="#FFD4A6" seed={11} />
      <WindowGrid position={[2.2, 7.4, -1.6 + (depth * 0.66) / 2 + 0.03]} rotationY={0} cols={4} rows={2} lit="#FFD4A6" seed={12} />
      <WindowGrid position={[-w / 2 - 0.03, 2.9, 0]} rotationY={-Math.PI / 2} cols={6} rows={2} lit="#FFD4A6" seed={13} />
      {/* Diagnostic mast with amber beacon */}
      <mesh position={[-w / 2 + 1.2, 8.2, -depth / 2 + 1.2]} castShadow>
        <boxGeometry args={[0.3, 6.4, 0.3]} />
        <meshStandardMaterial color={palette.buildingDark} />
      </mesh>
      <mesh position={[-w / 2 + 1.2, 11.6, -depth / 2 + 1.2]}>
        <sphereGeometry args={[0.38, 10, 10]} />
        <meshBasicMaterial color={palette.amber} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 5, depth / 2 + 2]} color={palette.amber} intensity={14} distance={18} decay={2} />
    </group>
  );
}

/** OVI: octagonal tower with floor rings and an "assistant orb" on top. */
function OviBuilding() {
  const d = getDistrict("ovi");
  const [x, z] = d.position;
  const r = d.footprint[0] / 2 - 0.6;
  const height = 14;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r - 0.4, r, height, 8]} />
        <meshStandardMaterial color={palette.building} roughness={0.75} flatShading />
      </mesh>
      {[4, 8, 12].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[r + 0.35, r + 0.35, 0.3, 8]} />
          <meshStandardMaterial color={palette.buildingLight} roughness={0.7} flatShading />
        </mesh>
      ))}
      {/* Vertical light seams on the south face */}
      {[-1.6, 0, 1.6].map((dx) => (
        <mesh key={dx} position={[dx, 6.6, r + 0.02]}>
          <planeGeometry args={[0.18, 11]} />
          <meshBasicMaterial color={palette.cyan} toneMapped={false} />
        </mesh>
      ))}
      {/* Lobby */}
      <mesh position={[0, 1.3, r + 0.03]}>
        <planeGeometry args={[3.2, 2.6]} />
        <meshBasicMaterial color="#8EEAF0" toneMapped={false} />
      </mesh>
      {/* Orb pedestal + orb */}
      <mesh position={[0, height + 0.5, 0]} castShadow>
        <cylinderGeometry args={[1, 1.6, 1, 8]} />
        <meshStandardMaterial color={palette.buildingLight} flatShading />
      </mesh>
      <mesh position={[0, height + 2.6, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color="#9FF0F5" emissive={palette.cyan} emissiveIntensity={1.6} roughness={0.3} />
      </mesh>
      <pointLight position={[0, height + 3, 0]} color={palette.cyan} intensity={30} distance={30} decay={2} />
      <pointLight position={[0, 3, r + 3]} color={palette.cyan} intensity={10} distance={16} decay={2} />
    </group>
  );
}

/** Reserved plots for unbuilt districts: a low foundation outline, no content. */
function ReservedPlots() {
  return (
    <>
      {districts
        .filter((d) => !d.built)
        .map((d) => (
          <mesh key={d.id} position={[d.position[0], 0.08, d.position[1]]} receiveShadow>
            <boxGeometry args={[d.footprint[0], 0.16, d.footprint[1]]} />
            <meshStandardMaterial color={palette.buildingDark} roughness={1} />
          </mesh>
        ))}
    </>
  );
}

export function Buildings() {
  return (
    <group>
      <HubPavilion />
      <DuplexBuilding />
      <OviBuilding />
      <ReservedPlots />
    </group>
  );
}
