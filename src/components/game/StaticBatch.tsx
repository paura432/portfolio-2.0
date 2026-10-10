"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { BufferGeometry, Group, InstancedMesh, Material, Matrix4, Mesh, MeshBasicMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Merges every static child mesh into one geometry per material, so a building
 * built from dozens of primitives costs a handful of draw calls. Instanced
 * meshes, lights and anything flagged `userData.dynamic` (animated parts, or
 * meshes whose material is mutated per frame) are left untouched.
 *
 * Transforms are baked relative to this group, so the whole batch can still be
 * moved or rotated by a parent (the car body uses this).
 */
export function StaticBatch({ children }: { children: ReactNode }) {
  const source = useRef<Group>(null);
  const target = useRef<Group>(null);

  useLayoutEffect(() => {
    const src = source.current;
    const dst = target.current;
    if (!src || !dst) return;
    // Both siblings read the same (possibly stale) parent matrix, so the relative transform is exact.
    src.updateMatrixWorld(true);
    dst.updateMatrixWorld(true);
    const toLocal = new Matrix4().copy(dst.matrixWorld).invert();
    const byMaterial = new Map<Material, BufferGeometry[]>();
    const consumed: Mesh[] = [];

    const visit = (o: Group | Mesh): void => {
      if (o.userData.dynamic) return;
      if (o instanceof Mesh && !(o instanceof InstancedMesh) && !Array.isArray(o.material)) {
        const geometry = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()) as BufferGeometry;
        geometry.applyMatrix4(new Matrix4().multiplyMatrices(toLocal, o.matrixWorld));
        const list = byMaterial.get(o.material) ?? [];
        list.push(geometry);
        byMaterial.set(o.material, list);
        consumed.push(o);
      }
      for (const child of o.children) if (child instanceof Group || child instanceof Mesh) visit(child);
    };
    visit(src);

    const created: Mesh[] = [];
    for (const [material, geometries] of byMaterial) {
      const merged = mergeGeometries(geometries, false);
      for (const g of geometries) g.dispose();
      if (!merged) continue;
      const mesh = new Mesh(merged, material);
      // Emissive accents (unlit basic materials: strips, screens, lamps) are thin and never need a shadow pass.
      mesh.castShadow = !(material instanceof MeshBasicMaterial);
      mesh.receiveShadow = true;
      dst.add(mesh);
      created.push(mesh);
    }
    for (const m of consumed) m.visible = false;

    return () => {
      for (const m of created) {
        dst.remove(m);
        m.geometry.dispose();
      }
      for (const m of consumed) m.visible = true;
    };
  }, []);

  return (
    <group>
      <group ref={source}>{children}</group>
      <group ref={target} />
    </group>
  );
}
