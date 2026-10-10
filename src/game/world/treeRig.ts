import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { TreeKind } from "./props";
import { TRUNK_HEIGHT } from "./trees";

/**
 * One rig for every tree representation. The instanced meshes (standing and
 * fallen trees) and the pooled dynamic meshes (shaking, falling, regrowing)
 * all take their matrices from here, so a tree never changes shape when it
 * switches between them.
 *
 * Parts, in tree-local space (unscaled, base at the origin):
 *   trunk   whole trunk (cylinder h 1.4, centred at 0.7)
 *   stump   lower 0.6 of the trunk, stays upright when the trunk snaps
 *   upper   upper 0.8 of the trunk, falls from the break point
 *   canopy  pine cone | round dodecahedron | tiered: two cones (tierLow, tierHigh)
 */
export type TrunkPart = "trunk" | "stump" | "upper";
export type CanopyPart = "pine" | "round" | "tierLow" | "tierHigh";
export type TreePart = TrunkPart | CanopyPart;

/** Height of the break point on an unscaled trunk. */
export const BREAK_HEIGHT = 0.6;

export interface TreePose {
  x: number;
  z: number;
  scale: number;
  /** Yaw of the standing tree. */
  rotation: number;
  /** Tilt from vertical around the fall axis (0 when standing). */
  tilt: number;
  /** Unit fall direction on XZ. */
  dirX: number;
  dirZ: number;
  /** Snapped trunk: stump stays, `upper` + canopy pivot at the break point. */
  broken: boolean;
  /** Slide of the broken part along the fall direction (unscaled units). */
  slide: number;
  /** Uniform regrow scale 0 → 1. */
  growth: number;
}

export function canopyParts(kind: TreeKind): CanopyPart[] {
  return kind === "pine" ? ["pine"] : kind === "round" ? ["round"] : ["tierLow", "tierHigh"];
}

/** Which parts a tree shows: the whole trunk, or stump + upper once snapped. */
export function trunkParts(broken: boolean): TrunkPart[] {
  return broken ? ["stump", "upper"] : ["trunk"];
}

interface Local {
  pos: [number, number, number];
  scale: [number, number, number];
  euler: [number, number, number];
}

/** Local transform of a part for a tree with the given yaw (matches the V3 placers). */
export function localPart(part: TreePart, rotation: number): Local {
  switch (part) {
    case "trunk":
      return { pos: [0, TRUNK_HEIGHT / 2, 0], scale: [1, 1, 1], euler: [0, rotation, 0] };
    case "stump":
      return { pos: [0, BREAK_HEIGHT / 2, 0], scale: [1, BREAK_HEIGHT / TRUNK_HEIGHT, 1], euler: [0, rotation, 0] };
    case "upper":
      return { pos: [0, (BREAK_HEIGHT + TRUNK_HEIGHT) / 2, 0], scale: [1, (TRUNK_HEIGHT - BREAK_HEIGHT) / TRUNK_HEIGHT, 1], euler: [0, rotation, 0] };
    case "pine":
      return { pos: [0, 2.6, 0], scale: [1, 1.05, 1], euler: [0, rotation, 0] };
    case "round":
      return { pos: [0, 2.5, 0], scale: [1.1, 1.25, 1.1], euler: [rotation * 0.3, rotation, 0] };
    case "tierLow":
      return { pos: [0, 1.9, 0], scale: [1, 1, 1], euler: [0, rotation, 0] };
    case "tierHigh":
      return { pos: [0, 3.2, 0], scale: [0.72, 0.9, 0.72], euler: [0, rotation + 0.5, 0] };
  }
}

/** All-zero matrix: an instance that is not rendered. */
export const HIDDEN_MATRIX: Readonly<Matrix4> = new Matrix4().makeScale(0, 0, 0);

const tmpPos = new Vector3();
const tmpScale = new Vector3();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();
const tmpAxis = new Vector3();
const tmpA = new Matrix4();
const tmpB = new Matrix4();

/** World matrix of one part for a pose. `out` is reused; nothing is allocated per call. */
export function partMatrix(part: TreePart, pose: TreePose, out: Matrix4): Matrix4 {
  const s = pose.scale * pose.growth;
  const l = localPart(part, pose.rotation);
  // standing = T(x,0,z) · S(s) · T(local.pos) · R(local.euler) · S(local.scale)
  tmpPos.set(pose.x + l.pos[0] * s, l.pos[1] * s, pose.z + l.pos[2] * s);
  tmpQuat.setFromEuler(tmpEuler.set(l.euler[0], l.euler[1], l.euler[2]));
  tmpScale.set(l.scale[0] * s, l.scale[1] * s, l.scale[2] * s);
  out.compose(tmpPos, tmpQuat, tmpScale);
  if (pose.tilt === 0 || part === "stump") return out;

  // Tilt about the pivot: base, or the break point for a snapped trunk (which also slides).
  const pivotY = pose.broken ? BREAK_HEIGHT * s : 0;
  const slide = pose.broken ? pose.slide * s : 0;
  tmpAxis.set(pose.dirZ, 0, -pose.dirX);
  if (tmpAxis.lengthSq() < 1e-9) tmpAxis.set(1, 0, 0);
  else tmpAxis.normalize();
  tmpA.makeRotationAxis(tmpAxis, pose.tilt);
  tmpB.makeTranslation(-pose.x, -pivotY, -pose.z);
  tmpA.multiply(tmpB); // R · T(-pivot)
  tmpB.makeTranslation(pose.x + pose.dirX * slide, pivotY, pose.z + pose.dirZ * slide);
  tmpB.multiply(tmpA); // T(pivot + slide) · R · T(-pivot)
  return out.premultiply(tmpB);
}
