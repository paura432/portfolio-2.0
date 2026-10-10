"use client";

import { useCallback } from "react";
import { Color, InstancedMesh, Matrix4 } from "three";
import { palette } from "@/lib/palette";
import { seededRandom } from "@/lib/seededRandom";
import { getMaterials } from "../materials";

export interface WindowGridProps {
  /** Face centre. */
  position: [number, number, number];
  /** Rotation around Y so the grid faces outward. */
  rotationY: number;
  cols: number;
  rows: number;
  gap?: [number, number];
  size?: [number, number];
  lit: string;
  /** Fraction of lit windows. */
  ratio?: number;
  seed: number;
}

/** Instanced window quads on a building face; a seeded subset is lit. */
export function WindowGrid({ position, rotationY, cols, rows, gap = [1.2, 1.4], size = [0.6, 0.8], lit, ratio = 0.42, seed }: WindowGridProps) {
  const m = getMaterials();
  const count = cols * rows;
  const setup = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const rand = seededRandom(seed);
      const mat = new Matrix4();
      const c = new Color();
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          mat.makeTranslation((col - (cols - 1) / 2) * gap[0], (r - (rows - 1) / 2) * gap[1], 0);
          mesh.setMatrixAt(i, mat);
          c.set(rand() < ratio ? lit : palette.windowDark);
          mesh.setColorAt(i, c);
          i++;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    [cols, rows, gap, lit, ratio, seed],
  );
  return (
    <instancedMesh ref={setup} args={[undefined, undefined, count]} position={position} rotation={[0, rotationY, 0]} material={m.windowInstanced}>
      <planeGeometry args={size} />
    </instancedMesh>
  );
}
