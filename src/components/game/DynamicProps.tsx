"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CircleGeometry, Color, CylinderGeometry, DodecahedronGeometry, InstancedMesh, Matrix4, type BufferGeometry, type Material } from "three";
import { palette } from "@/lib/palette";
import { QUALITY_PROFILES } from "@/game/render/quality";
import { liveCar } from "@/game/vehicle/carState";
import { impactBus } from "@/game/world/impactBus";
import { ACTIVE_CATEGORIES, PROP_CATALOG, type PartLocal, type PropCategory, type PropPart } from "@/game/world/propCatalog";
import { HIDDEN_MATRIX, propPartMatrix, type PropPose } from "@/game/world/propRig";
import { propWorld, type PropDef, type PropEvent, type PropState } from "@/game/world/propWorld";
import { useGameStore, type ImpactKind } from "@/stores/gameStore";
import { getMaterials, type Materials } from "./materials";

/** Geometry of each category part (the V3 dimensions, unchanged). */
function partGeometry(category: PropCategory, part: PropPart): BufferGeometry {
  switch (`${category}.${part}`) {
    case "lamp.post":
      return new BoxGeometry(0.14, 3.9, 0.14);
    case "lamp.arm":
      return new BoxGeometry(0.08, 0.08, 1.1);
    case "lamp.head":
      return new BoxGeometry(0.46, 0.12, 0.3);
    case "lamp.pool":
      return new CircleGeometry(1, 16);
    case "planter.box":
      return new BoxGeometry(1.9, 0.56, 1.9);
    case "planter.foliage":
      return new DodecahedronGeometry(0.85, 0);
    case "bench.seat":
      return new BoxGeometry(1.7, 0.08, 0.5);
    case "bench.back":
      return new BoxGeometry(1.7, 0.42, 0.06);
    case "bench.legs":
      return new BoxGeometry(1.4, 0.4, 0.36);
    case "bollard.post":
      return new CylinderGeometry(0.1, 0.12, 0.8, 8);
    case "bollard.cap":
      return new CylinderGeometry(0.1, 0.1, 0.05, 8);
    case "bush.foliage":
      return new DodecahedronGeometry(0.7, 0);
    default:
      return new BoxGeometry(0.2, 0.2, 0.2);
  }
}

function partMaterial(m: Materials, category: PropCategory, part: PropPart): Material {
  switch (`${category}.${part}`) {
    case "lamp.head":
      return m.lightAmberSoft;
    case "lamp.pool":
      return m.lampPool;
    case "planter.box":
      return m.planter;
    case "planter.foliage":
      return m.bush;
    case "bench.seat":
    case "bench.back":
      return m.metal;
    case "bollard.cap":
      return m.lightCyan;
    case "bush.foliage":
      return m.canopy;
    default:
      return m.metalDark;
  }
}

const CANOPY_TINTS = [palette.tree, palette.treeTeal, palette.treeGreen, palette.treeBlue];

/** HUD wording per event and weight class. */
export function impactLabel(e: PropEvent): { kind: ImpactKind; label: string } | null {
  const name = PROP_CATALOG[e.category].label;
  switch (e.type) {
    case "wobble":
      return { kind: "wobble", label: `${name} rattled` };
    case "shove":
      return { kind: "shove", label: `${name} shoved` };
    case "knock":
      return { kind: "knock", label: `${name} knocked over` };
    case "flatten":
      return { kind: "flatten", label: `${name} flattened` };
    default:
      return null;
  }
}

interface Slot {
  category: PropCategory;
  part: PartLocal;
  castShadow: boolean;
}

/**
 * Renders the destructible street furniture (V9) from `propWorld`: one
 * instanced mesh per category part, every prop of the category in it, and
 * the matrices rewritten only for the props the simulation marks dirty. A
 * prop is drawn where it collides (shoved props included) and ground decals
 * (lamp light pools) go out when the lamp is down.
 */
export function DynamicProps() {
  const m = getMaterials();
  const profile = QUALITY_PROFILES[useGameStore((s) => s.quality)];
  const defs = propWorld.defs;
  // Instance slot of each prop inside its category (stable; ids never change).
  const layout = useMemo(() => {
    const slotOf = new Int32Array(defs.length).fill(-1);
    const count: Partial<Record<PropCategory, number>> = {};
    for (const d of defs) {
      if (!ACTIVE_CATEGORIES.includes(d.category)) continue;
      slotOf[d.id] = count[d.category] ?? 0;
      count[d.category] = slotOf[d.id]! + 1;
    }
    return { slotOf, count };
  }, [defs]);
  const slots = useMemo<Slot[]>(
    () =>
      ACTIVE_CATEGORIES.flatMap((category) =>
        PROP_CATALOG[category].parts.filter((part) => !(part.ground && !profile.lampPools)).map((part) => ({ category, part, castShadow: !part.light })),
      ),
    [profile.lampPools],
  );
  const geometries = useMemo(() => slots.map((s) => partGeometry(s.category, s.part.part)), [slots]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  /** The instanced mesh of each slot (same index), set by the ref callbacks. */
  const meshes = useRef<(InstancedMesh | null)[]>([]);
  const scratch = useRef({ m: new Matrix4(), pose: { x: 0, z: 0, rotation: 0, scale: 1, tilt: 0, dirX: 0, dirZ: 1, slide: 0, squash: 1, growth: 1 } as PropPose, ids: [] as number[], events: [] as PropEvent[] });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      propWorld.reducedMotion = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const poseOf = (d: PropDef, s: PropState, out: PropPose): PropPose => {
    out.x = d.x + s.offX;
    out.z = d.z + s.offZ;
    out.rotation = d.rotation;
    out.scale = d.scale;
    out.tilt = propWorld.tilt(s);
    out.dirX = s.dirX;
    out.dirZ = s.dirZ;
    out.slide = s.slide;
    out.squash = s.squash;
    out.growth = propWorld.growth(s);
    return out;
  };

  /** Write every part matrix of one prop for its current state. */
  const apply = (id: number) => {
    const d = defs[id]!;
    const slot = layout.slotOf[id]!;
    if (slot < 0) return;
    const s = propWorld.state(id);
    const { m: mat, pose } = scratch.current;
    poseOf(d, s, pose);
    const down = s.phase === "falling" || s.phase === "down" || s.phase === "restoring";
    slots.forEach((sl, i) => {
      const mesh = meshes.current[i];
      if (sl.category !== d.category || !mesh) return;
      if (sl.part.ground) {
        // Decal: upright, in place, gone while the prop is down or coming back.
        if (down) mesh.setMatrixAt(slot, HIDDEN_MATRIX);
        else {
          const tilt = pose.tilt;
          pose.tilt = 0;
          mesh.setMatrixAt(slot, propPartMatrix(sl.part, pose, mat));
          pose.tilt = tilt;
        }
      } else mesh.setMatrixAt(slot, propPartMatrix(sl.part, pose, mat));
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  // Initial (and per-layout) fill of every instance.
  useLayoutEffect(() => {
    for (const mesh of meshes.current) {
      if (!mesh) continue;
      for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, HIDDEN_MATRIX);
    }
    // Bush tints (instance colours), as the V3 static bushes had.
    const color = new Color();
    slots.forEach((sl, i) => {
      const mesh = meshes.current[i];
      if (!mesh || sl.category !== "bush") return;
      for (const d of defs) {
        if (d.category !== "bush") continue;
        mesh.setColorAt(layout.slotOf[d.id]!, color.set(CANOPY_TINTS[d.tint] ?? palette.tree));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    for (const d of defs) apply(d.id);
    for (const mesh of meshes.current) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, layout]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const { x, z } = liveCar.state;
    propWorld.update(dt, x, z);
    const ids = propWorld.takeDirty(scratch.current.ids);
    for (const id of ids) apply(id);
    const events = propWorld.takeEvents(scratch.current.events);
    if (events.length) {
      const store = useGameStore.getState();
      for (const e of events) {
        impactBus.pushProp(e);
        const l = impactLabel(e);
        if (l) store.noteImpact(l.kind, l.label);
      }
      store.setPropsDown(propWorld.downCount());
    }
  }, -2.45);

  return (
    <group>
      {slots.map((sl, i) => (
        <instancedMesh
          key={`${sl.category}.${sl.part.part}`}
          ref={(el) => void (meshes.current[i] = el)}
          args={[geometries[i]!, partMaterial(m, sl.category, sl.part.part), Math.max(1, layout.count[sl.category] ?? 0)]}
          castShadow={sl.castShadow}
          receiveShadow={sl.part.part === "box"}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
