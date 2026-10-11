"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Matrix4 } from "three";
import { propPartMatrix, type PropPose } from "@/game/world/propRig";
import { propIdOf, propWorld } from "@/game/world/propWorld";

const ROOT = { part: "post" as const, pos: [0, 0, 0] as [number, number, number] };

/**
 * A component-drawn destructible prop (V9): a signpost or a light mast whose
 * meshes are authored in local coordinates (base at the origin, y up) and
 * placed by this group at the fixture's position. Each frame the group takes
 * the pose from `propWorld` (wobble, fall, restore), so the drawn post
 * matches its collider exactly like the instanced furniture does.
 */
export function DynamicFixture({ fixtureKey, children }: { fixtureKey: string; children: ReactNode }) {
  const group = useRef<Group>(null);
  const id = propIdOf(fixtureKey);
  const scratch = useRef({ m: new Matrix4(), pose: { x: 0, z: 0, rotation: 0, scale: 1, tilt: 0, dirX: 0, dirZ: 1, slide: 0, squash: 1, growth: 1 } as PropPose, phase: "" });
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const d = propWorld.defs[id]!;
    const s = propWorld.state(id);
    const { m, pose } = scratch.current;
    // Only rewrite while something moves (or once after a phase change).
    if (s.phase === "standing" && scratch.current.phase === "standing") return;
    scratch.current.phase = s.phase;
    pose.x = d.x + s.offX;
    pose.z = d.z + s.offZ;
    pose.rotation = d.rotation;
    pose.scale = d.scale;
    pose.tilt = propWorld.tilt(s);
    pose.dirX = s.dirX;
    pose.dirZ = s.dirZ;
    pose.slide = s.slide;
    pose.squash = s.squash;
    pose.growth = propWorld.growth(s);
    g.matrix.copy(propPartMatrix(ROOT, pose, m));
  });
  return (
    <group ref={group} matrixAutoUpdate={false}>
      {children}
    </group>
  );
}
