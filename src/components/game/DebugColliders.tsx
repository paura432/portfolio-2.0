"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CylinderGeometry, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, MeshBasicMaterial, Object3D, BufferGeometry, Float32BufferAttribute, Color } from "three";
import { beaches, beachOuterCorners } from "@/data/beaches";
import { rampPoint, ramps } from "@/data/ramps";
import { liveCar } from "@/game/vehicle/carState";
import { groundHeightAt } from "@/game/world/ground";
import { CAR_RADIUS, contactLog, DRIVE_AREAS, obstacles } from "@/game/world/obstacles";
import { propWorld } from "@/game/world/propWorld";
import { treeWorld } from "@/game/world/treeWorld";
import { trunkRadius } from "@/game/world/trees";
import { useGameStore } from "@/stores/gameStore";

/**
 * V9 collider overlay (debug tooling, never shown to visitors): wireframes of
 * every static collider (red), the drive areas (cyan), the ramp slopes and
 * beach footprints (amber / sand), the trees' trunks and the furniture's live
 * colliders (red solid, grey once down), the car's own circle, and the last
 * contact points reported by the constraint (magenta). Switched on by the
 * probe (`__pauWorld.debug.colliders(true)`) or `?debug=colliders` in
 * development builds only.
 */
const RED = new Color("#FF4D5A");
const GREY = new Color("#6E7781");
const H = 1.6;

function outline(points: [number, number][], y: (x: number, z: number) => number): BufferGeometry {
  const verts: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    verts.push(a[0], y(a[0], a[1]), a[1], b[0], y(b[0], b[1]), b[1]);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(verts, 3));
  return g;
}

function rect(minX: number, maxX: number, minZ: number, maxZ: number): [number, number][] {
  return [
    [minX, minZ],
    [maxX, minZ],
    [maxX, maxZ],
    [minX, maxZ],
  ];
}

export function DebugColliders() {
  const on = useGameStore((s) => s.debugColliders);
  useEffect(() => {
    contactLog.enabled = on;
    if (!on) contactLog.items.length = 0;
  }, [on]);
  if (!on) return null;
  return <Overlay />;
}

function Overlay() {
  const mats = useMemo(
    () => ({
      red: new MeshBasicMaterial({ color: RED, wireframe: true, transparent: true, opacity: 0.9 }),
      live: new MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.9 }),
      car: new MeshBasicMaterial({ color: "#3DF2C2", wireframe: true }),
      contact: new MeshBasicMaterial({ color: "#FF57E8" }),
      cyan: new LineBasicMaterial({ color: "#3DF2C2" }),
      amber: new LineBasicMaterial({ color: "#FFB46A" }),
      sand: new LineBasicMaterial({ color: "#C9B27A" }),
    }),
    [],
  );
  const geos = useMemo(() => ({ unitBox: new BoxGeometry(1, 1, 1), unitCyl: new CylinderGeometry(1, 1, 1, 16, 1, true), dot: new CylinderGeometry(0.18, 0.18, 0.3, 8) }), []);
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geos, mats],
  );

  // Static colliders: one instanced box mesh (axis-aligned + oriented) and one cylinder mesh (round).
  const staticBoxes = useMemo(() => obstacles.filter((o) => o.kind !== "round"), []);
  const staticRounds = useMemo(() => obstacles.filter((o) => o.kind === "round"), []);
  const refBoxes = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    const o = new Object3D();
    staticBoxes.forEach((b, i) => {
      if (b.kind === "box") {
        o.position.set((b.minX + b.maxX) / 2, H / 2, (b.minZ + b.maxZ) / 2);
        o.rotation.set(0, 0, 0);
        o.scale.set(b.maxX - b.minX, H, b.maxZ - b.minZ);
      } else if (b.kind === "obb") {
        o.position.set(b.x, H / 2, b.z);
        o.rotation.set(0, b.rotation, 0);
        o.scale.set(b.hx * 2, H, b.hz * 2);
      }
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  const refRounds = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    const o = new Object3D();
    staticRounds.forEach((r, i) => {
      if (r.kind !== "round") return;
      o.position.set(r.x, H / 2, r.z);
      o.scale.set(r.r, H, r.r);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  // Outlines: drive areas, ramps (corridor + slope), beaches (footprint, enter / exit depth not drawn: see the HUD).
  const lines = useMemo(() => {
    const y0 = () => 0.08;
    const out: { g: BufferGeometry; m: LineBasicMaterial }[] = [];
    for (const a of DRIVE_AREAS) out.push({ g: outline(rect(a.minX, a.maxX, a.minZ, a.maxZ), y0), m: mats.cyan });
    for (const r of ramps) {
      out.push({ g: outline([rampPoint(r, -r.approach, -r.width / 2), rampPoint(r, r.length, -r.width / 2), rampPoint(r, r.length, r.width / 2), rampPoint(r, -r.approach, r.width / 2)], (x, z) => groundHeightAt(x, z) + 0.1), m: mats.amber });
    }
    for (const b of beaches) {
      const [c0, c1] = beachOuterCorners(b);
      out.push({ g: outline([b.edge.from, b.edge.to, c1, c0], (x, z) => groundHeightAt(x, z) + 0.1), m: mats.sand });
    }
    return out;
  }, [mats]);
  useEffect(() => () => lines.forEach((l) => l.g.dispose()), [lines]);

  // Live: trees, props, car, contacts.
  const trees = useRef<InstancedMesh>(null);
  const propCircles = useRef<InstancedMesh>(null);
  const propBoxes = useRef<InstancedMesh>(null);
  const car = useRef<InstancedMesh>(null);
  const contacts = useRef<InstancedMesh>(null);
  const scratch = useRef({ o: new Object3D(), m: new Matrix4(), c: new Color() });
  const propCount = propWorld.defs.length;
  useFrame(() => {
    const { o, c } = scratch.current;
    const t = trees.current;
    if (t) {
      let n = 0;
      for (const d of treeWorld.defs) {
        if (!treeWorld.isObstacle(d.id)) continue;
        o.position.set(d.x, H / 2, d.z);
        o.rotation.set(0, 0, 0);
        o.scale.set(trunkRadius(d.scale), H, trunkRadius(d.scale));
        o.updateMatrix();
        t.setMatrixAt(n, o.matrix);
        t.setColorAt(n, RED);
        n++;
      }
      t.count = n;
      t.instanceMatrix.needsUpdate = true;
      if (t.instanceColor) t.instanceColor.needsUpdate = true;
    }
    const pc = propCircles.current;
    const pb = propBoxes.current;
    if (pc && pb) {
      let nc = 0;
      let nb = 0;
      for (const d of propWorld.defs) {
        if (!propWorld.active.has(d.category)) continue;
        const ob = propWorld.obstacleOf(d.id);
        const solid = propWorld.isObstacle(d.id);
        c.copy(solid ? RED : GREY);
        if (ob.kind === "round") {
          o.position.set(ob.x, H / 2, ob.z);
          o.rotation.set(0, 0, 0);
          o.scale.set(ob.r, H, ob.r);
          o.updateMatrix();
          pc.setMatrixAt(nc, o.matrix);
          pc.setColorAt(nc, c);
          nc++;
        } else if (ob.kind === "obb") {
          o.position.set(ob.x, H / 2, ob.z);
          o.rotation.set(0, ob.rotation, 0);
          o.scale.set(ob.hx * 2, H, ob.hz * 2);
          o.updateMatrix();
          pb.setMatrixAt(nb, o.matrix);
          pb.setColorAt(nb, c);
          nb++;
        }
      }
      pc.count = nc;
      pb.count = nb;
      pc.instanceMatrix.needsUpdate = true;
      pb.instanceMatrix.needsUpdate = true;
      if (pc.instanceColor) pc.instanceColor.needsUpdate = true;
      if (pb.instanceColor) pb.instanceColor.needsUpdate = true;
    }
    const cm = car.current;
    if (cm) {
      const s = liveCar.state;
      o.position.set(s.x, groundHeightAt(s.x, s.z) + H / 2, s.z);
      o.rotation.set(0, 0, 0);
      o.scale.set(CAR_RADIUS, H, CAR_RADIUS);
      o.updateMatrix();
      cm.setMatrixAt(0, o.matrix);
      cm.count = 1;
      cm.instanceMatrix.needsUpdate = true;
    }
    const ct = contacts.current;
    if (ct) {
      contactLog.items.forEach((p, i) => {
        o.position.set(p.x, groundHeightAt(p.x, p.z) + 0.2, p.z);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(1);
        o.updateMatrix();
        ct.setMatrixAt(i, o.matrix);
      });
      ct.count = contactLog.items.length;
      ct.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group name="debug-colliders">
      <instancedMesh ref={refBoxes} args={[geos.unitBox, mats.red, Math.max(1, staticBoxes.length)]} frustumCulled={false} />
      <instancedMesh ref={refRounds} args={[geos.unitCyl, mats.red, Math.max(1, staticRounds.length)]} frustumCulled={false} />
      {lines.map((l, i) => (
        <primitive key={i} object={new LineSegments(l.g, l.m)} />
      ))}
      <instancedMesh ref={trees} args={[geos.unitCyl, mats.live, Math.max(1, treeWorld.defs.length)]} frustumCulled={false} />
      <instancedMesh ref={propCircles} args={[geos.unitCyl, mats.live, Math.max(1, propCount)]} frustumCulled={false} />
      <instancedMesh ref={propBoxes} args={[geos.unitBox, mats.live, Math.max(1, propCount)]} frustumCulled={false} />
      <instancedMesh ref={car} args={[geos.unitCyl, mats.car, 1]} frustumCulled={false} />
      <instancedMesh ref={contacts} args={[geos.dot, mats.contact, 24]} frustumCulled={false} />
    </group>
  );
}
