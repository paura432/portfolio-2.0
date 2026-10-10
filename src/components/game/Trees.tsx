"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, InstancedMesh, Matrix4, Mesh, type BufferGeometry } from "three";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { liveCar } from "@/game/vehicle/carState";
import { HIDDEN_MATRIX, canopyParts, partMatrix, type TreePose } from "@/game/world/treeRig";
import { impactBus } from "@/game/world/impactBus";
import { TREE_CONFIG, treeWorld, type TreeEvent, type TreeState } from "@/game/world/treeWorld";
import { treeDefs, visibleTreeCount, type TreeDef } from "@/game/world/trees";
import { palette } from "@/lib/palette";
import { useGameStore } from "@/stores/gameStore";
import { canopyUniforms, getMaterials } from "./materials";

const CANOPY_TINTS = [palette.tree, palette.treeTeal, palette.treeGreen, palette.treeBlue];
/** Spare trunk instances for the upper halves of snapped trunks (one per fallen broken tree). */
const SPARE_TRUNKS = TREE_CONFIG.maxFallen;

type CanopyMesh = "pine" | "round" | "tierLow" | "tierHigh";

/**
 * Explicit mapping from tree id to instance slots. Each instanced mesh holds a
 * different subset (trunks: every visible tree; canopies: one species), so the
 * slot of a tree differs per mesh and never depends on the state of others.
 */
interface Layout {
  count: number;
  visible: TreeDef[];
  trunkSlot: Int32Array;
  canopySlot: Int32Array;
  canopyMesh: (CanopyMesh | null)[];
  perMesh: Record<CanopyMesh, number>;
}

function buildLayout(defs: readonly TreeDef[], count: number): Layout {
  const visible = defs.slice(0, count);
  const trunkSlot = new Int32Array(defs.length).fill(-1);
  const canopySlot = new Int32Array(defs.length).fill(-1);
  const canopyMesh: (CanopyMesh | null)[] = defs.map(() => null);
  const perMesh: Record<CanopyMesh, number> = { pine: 0, round: 0, tierLow: 0, tierHigh: 0 };
  visible.forEach((t, i) => {
    trunkSlot[t.id] = i;
    const mesh: CanopyMesh = t.kind === "pine" ? "pine" : t.kind === "round" ? "round" : "tierLow";
    canopySlot[t.id] = perMesh[mesh]++;
    canopyMesh[t.id] = mesh;
    if (t.kind === "tiered") perMesh.tierHigh++;
  });
  return { count, visible, trunkSlot, canopySlot, canopyMesh, perMesh };
}

/** A pooled set of meshes that renders one animating tree (shaking, falling, regrowing). */
class DynamicTree {
  readonly group = new Group();
  readonly trunk: Mesh;
  readonly stump: Mesh;
  readonly upper: Mesh;
  readonly canopy: [Mesh, Mesh];
  id = -1;

  constructor(trunkGeo: BufferGeometry, canopyGeos: Record<CanopyMesh, BufferGeometry>, trunkMat: Mesh["material"], canopyMat: Mesh["material"]) {
    const mk = (g: BufferGeometry, mat: Mesh["material"]) => {
      const mesh = new Mesh(g, mat);
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = true;
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    };
    this.trunk = mk(trunkGeo, trunkMat);
    this.stump = mk(trunkGeo, trunkMat);
    this.upper = mk(trunkGeo, trunkMat);
    this.canopy = [mk(canopyGeos.pine, canopyMat), mk(canopyGeos.tierHigh, canopyMat)];
    this.group.visible = false;
  }

  hide(): void {
    this.id = -1;
    this.group.visible = false;
    for (const mesh of [this.trunk, this.stump, this.upper, ...this.canopy]) mesh.visible = false;
  }
}

/** Fully specified pose for a tree state (allocation-free; `out` is reused). */
function poseOf(def: TreeDef, s: TreeState, out: TreePose): TreePose {
  out.x = def.x;
  out.z = def.z;
  out.scale = def.scale;
  out.rotation = def.rotation;
  out.tilt = treeWorld.tilt(s);
  out.dirX = s.dirX;
  out.dirZ = s.dirZ;
  out.broken = s.phase !== "standing" && s.phase !== "respawning" && s.broken;
  out.slide = s.slide;
  out.growth = treeWorld.growth(s);
  return out;
}

/**
 * Hybrid tree renderer. Standing and fallen trees are instances (five draw
 * calls for the whole forest); the few trees that are animating borrow a
 * pooled set of meshes while their instance slots are zero-scaled. State lives
 * in `treeWorld`; this component only mirrors it when a tree is marked dirty.
 */
export function Trees() {
  const m = getMaterials();
  const quality = useGameStore((s) => s.quality);
  const profile = QUALITY_PROFILES[quality];
  const defs = treeDefs();
  const count = visibleTreeCount(profile.vegetation);
  const layout = useMemo(() => buildLayout(defs, count), [defs, count]);

  const geos = useMemo(
    () => ({
      trunk: new CylinderGeometry(0.16, 0.26, 1.4, 6),
      pine: new ConeGeometry(1.15, 3.1, 6),
      round: new DodecahedronGeometry(1.35, 0),
      tierLow: new ConeGeometry(1.35, 1.9, 5),
      tierHigh: new ConeGeometry(1.35, 1.9, 5),
    }),
    [],
  );
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  const trunks = useRef<InstancedMesh>(null);
  const canopies = useRef<Record<CanopyMesh, InstancedMesh | null>>({ pine: null, round: null, tierLow: null, tierHigh: null });
  const poolGroup = useRef<Group>(null);
  const pool = useMemo(
    () => Array.from({ length: TREE_CONFIG.maxDynamic }, () => new DynamicTree(geos.trunk, geos, m.trunk, m.canopyTints[0]!)),
    [geos, m],
  );
  /** id → pooled dynamic tree, id → spare trunk slot (snapped fallen trees). */
  const dynamicOf = useRef(new Map<number, DynamicTree>());
  const upperSlotOf = useRef(new Map<number, number>());
  const freeSpare = useRef<number[]>([]);
  const scratch = useRef({ m: new Matrix4(), pose: {} as TreePose, ids: [] as number[], events: [] as TreeEvent[], color: new Color() });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      treeWorld.reducedMotion = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /** Write the instance matrices of one tree for its current state (or hide them while it is dynamic). */
  const writeInstances = (def: TreeDef, s: TreeState, hidden: boolean) => {
    const { m: mat, pose } = scratch.current;
    const t = trunks.current;
    const meshName = layout.canopyMesh[def.id];
    const slot = layout.trunkSlot[def.id]!;
    if (!t || !meshName || slot < 0) return;
    poseOf(def, s, pose);
    const fallenBroken = s.phase === "fallen" && s.broken;
    // Trunk slot: whole trunk, or the stump once snapped; the upper half takes a spare slot.
    t.setMatrixAt(slot, hidden ? HIDDEN_MATRIX : partMatrix(fallenBroken ? "stump" : "trunk", pose, mat));
    let spare = upperSlotOf.current.get(def.id);
    if (fallenBroken && !hidden) {
      if (spare === undefined && freeSpare.current.length) {
        spare = freeSpare.current.pop()!;
        upperSlotOf.current.set(def.id, spare);
      }
      if (spare !== undefined) t.setMatrixAt(spare, partMatrix("upper", pose, mat));
    } else if (spare !== undefined) {
      t.setMatrixAt(spare, HIDDEN_MATRIX);
      upperSlotOf.current.delete(def.id);
      freeSpare.current.push(spare);
    }
    t.instanceMatrix.needsUpdate = true;
    const parts = canopyParts(def.kind);
    const cslot = layout.canopySlot[def.id]!;
    parts.forEach((part, i) => {
      const mesh = canopies.current[i === 0 ? meshName : "tierHigh"];
      if (!mesh) return;
      mesh.setMatrixAt(cslot, hidden ? HIDDEN_MATRIX : partMatrix(part, pose, mat));
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  const writeDynamic = (def: TreeDef, s: TreeState, d: DynamicTree) => {
    const { m: mat, pose } = scratch.current;
    poseOf(def, s, pose);
    const broken = pose.broken;
    d.trunk.visible = !broken;
    d.stump.visible = broken;
    d.upper.visible = broken;
    if (!broken) d.trunk.matrix.copy(partMatrix("trunk", pose, mat));
    else {
      d.stump.matrix.copy(partMatrix("stump", pose, mat));
      d.upper.matrix.copy(partMatrix("upper", pose, mat));
    }
    const parts = canopyParts(def.kind);
    d.canopy.forEach((mesh, i) => {
      const part = parts[i];
      mesh.visible = !!part;
      if (part) mesh.matrix.copy(partMatrix(part, pose, mat));
    });
  };

  const acquire = (def: TreeDef): DynamicTree | null => {
    const held = dynamicOf.current.get(def.id);
    if (held) return held;
    const free = pool.find((d) => d.id < 0);
    if (!free) return null;
    free.id = def.id;
    free.group.visible = true;
    const parts = canopyParts(def.kind);
    free.canopy[0].geometry = geos[(parts[0] ?? "pine") as CanopyMesh];
    free.canopy[1].geometry = geos.tierHigh;
    const tint = m.canopyTints[def.tint] ?? m.canopyTints[0]!;
    free.canopy[0].material = tint;
    free.canopy[1].material = tint;
    dynamicOf.current.set(def.id, free);
    return free;
  };

  const release = (id: number) => {
    const d = dynamicOf.current.get(id);
    if (!d) return;
    d.hide();
    dynamicOf.current.delete(id);
  };

  /** Mirror one tree's state into instances and/or the pool. */
  const apply = (id: number) => {
    const def = defs[id]!;
    const s = treeWorld.state(id);
    if (id >= layout.count) {
      release(id);
      return;
    }
    switch (s.phase) {
      case "standing":
      case "fallen":
        release(id);
        writeInstances(def, s, false);
        return;
      case "shaking":
      case "falling":
      case "respawning": {
        const d = acquire(def);
        if (!d) {
          // Pool exhausted (should not happen: the simulation caps dynamics): keep it visible as an instance.
          writeInstances(def, s, false);
          return;
        }
        if (!dynamicOf.current.has(id) || d.id !== id) return;
        writeInstances(def, s, true);
        writeDynamic(def, s, d);
      }
    }
  };

  // (Re)build every instance when the layout changes (quality tier), then re-apply the live state.
  useLayoutEffect(() => {
    treeWorld.activeCount = layout.count;
    const t = trunks.current;
    if (!t) return;
    for (const d of pool) d.hide();
    dynamicOf.current.clear();
    upperSlotOf.current.clear();
    freeSpare.current = Array.from({ length: SPARE_TRUNKS }, (_, i) => layout.count + i).reverse();
    for (let i = 0; i < t.count; i++) t.setMatrixAt(i, HIDDEN_MATRIX);
    const { color } = scratch.current;
    for (const mesh of Object.values(canopies.current)) {
      if (!mesh) continue;
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, HIDDEN_MATRIX);
    }
    for (const def of layout.visible) {
      const meshName = layout.canopyMesh[def.id];
      const cslot = layout.canopySlot[def.id]!;
      const tint = color.set(CANOPY_TINTS[def.tint] ?? palette.tree);
      if (meshName) canopies.current[meshName]?.setColorAt(cslot, tint);
      if (def.kind === "tiered") canopies.current.tierHigh?.setColorAt(cslot, tint);
      apply(def.id);
    }
    for (const mesh of [t, ...Object.values(canopies.current)]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    // Trees hidden by the tier must not keep a pooled mesh.
    for (let id = layout.count; id < defs.length; id++) release(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, pool]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const { x, z } = liveCar.state;
    // Ambient canopy sway (shader): one clock + the car position, no per-instance work.
    canopyUniforms.uTime.value = clock.elapsedTime;
    canopyUniforms.uSway.value = profile.worldFx && !treeWorld.reducedMotion ? 1 : 0;
    canopyUniforms.uCar.value.set(x, 0, z);
    treeWorld.update(dt, x, z);
    const ids = treeWorld.takeDirty(scratch.current.ids);
    for (const id of ids) apply(id);
    // Feedback: events go to the bus (particles, car jolt) and, rarely, to the store (HUD).
    impactBus.clear();
    impactBus.decay(dt);
    const events = treeWorld.takeEvents(scratch.current.events);
    if (events.length) {
      const store = useGameStore.getState();
      for (const e of events) {
        impactBus.push(e);
        if (e.type === "shake" || e.type === "topple" || e.type === "break") store.noteImpact(e.type);
      }
      let down = 0;
      for (const s of treeWorld.states) if (s.phase === "falling" || s.phase === "fallen") down++;
      store.setTreesDown(down);
    }
  }, -2.5);

  const cap = (n: number) => Math.max(1, n);
  return (
    <group>
      <instancedMesh ref={trunks} args={[geos.trunk, m.trunk, layout.count + SPARE_TRUNKS]} castShadow frustumCulled={false} />
      <instancedMesh ref={(el) => void (canopies.current.pine = el)} args={[geos.pine, m.canopy, cap(layout.perMesh.pine)]} castShadow frustumCulled={false} />
      <instancedMesh ref={(el) => void (canopies.current.round = el)} args={[geos.round, m.canopy, cap(layout.perMesh.round)]} castShadow frustumCulled={false} />
      <instancedMesh ref={(el) => void (canopies.current.tierLow = el)} args={[geos.tierLow, m.canopy, cap(layout.perMesh.tierLow)]} castShadow frustumCulled={false} />
      <instancedMesh ref={(el) => void (canopies.current.tierHigh = el)} args={[geos.tierHigh, m.canopy, cap(layout.perMesh.tierHigh)]} castShadow frustumCulled={false} />
      <group ref={poolGroup}>
        {pool.map((d, i) => (
          <primitive key={i} object={d.group} />
        ))}
      </group>
    </group>
  );
}
