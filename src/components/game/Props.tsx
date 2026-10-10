"use client";

import { useCallback, useMemo } from "react";
import { InstancedMesh, Matrix4, Object3D } from "three";
import { generateLamps, generateTrees } from "@/game/world/props";
import { palette } from "@/lib/palette";

const TREE_COUNT = 150;

export function Props() {
  const trees = useMemo(() => generateTrees(TREE_COUNT), []);
  const lamps = useMemo(() => generateLamps(), []);

  const placeTrunks = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      trees.forEach((t, i) => {
        o.position.set(t.x, 0.6 * t.scale, t.z);
        o.scale.setScalar(t.scale);
        o.rotation.set(0, t.rotation, 0);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    [trees],
  );

  const placeCanopies = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const o = new Object3D();
      trees.forEach((t, i) => {
        o.position.set(t.x, 1.2 * t.scale + 1.5 * t.scale, t.z);
        o.scale.setScalar(t.scale);
        o.rotation.set(0, t.rotation, 0);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    [trees],
  );

  const placeLampPosts = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const m = new Matrix4();
      lamps.forEach((l, i) => {
        m.makeTranslation(l.x, 1.7, l.z);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    [lamps],
  );

  const placeLampHeads = useCallback(
    (mesh: InstancedMesh | null) => {
      if (!mesh) return;
      const m = new Matrix4();
      lamps.forEach((l, i) => {
        m.makeTranslation(l.x, 3.5, l.z);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    [lamps],
  );

  return (
    <group>
      <instancedMesh ref={placeTrunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 1.2, 6]} />
        <meshStandardMaterial color="#2C2A33" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={placeCanopies} args={[undefined, undefined, trees.length]} castShadow>
        <coneGeometry args={[1.25, 3, 6]} />
        <meshStandardMaterial color={palette.tree} roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={placeLampPosts} args={[undefined, undefined, lamps.length]} castShadow>
        <boxGeometry args={[0.16, 3.4, 0.16]} />
        <meshStandardMaterial color={palette.buildingDark} />
      </instancedMesh>
      <instancedMesh ref={placeLampHeads} args={[undefined, undefined, lamps.length]}>
        <sphereGeometry args={[0.26, 8, 8]} />
        <meshBasicMaterial color={palette.amber} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
