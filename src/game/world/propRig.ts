import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { PartLocal } from "./propCatalog";

/**
 * One rig for every destructible prop representation (V9), the same idea as
 * the tree rig: the instanced meshes take their matrices from here, so a prop
 * is drawn exactly where it collides, standing, shoved, tilting or flat.
 *
 *   world = T(x + slide·dir, 0, z + slide·dir) · Tilt(dir, tilt, pivot = base) · R_y(rotation) · S(scale, squash·scale, scale) · T(part.pos) · R(part.euler) · S(part.scale)
 */
export interface PropPose {
  x: number;
  z: number;
  rotation: number;
  scale: number;
  /** Tilt from vertical around the axis perpendicular to `dir`, pivoting at the base (0 when standing). */
  tilt: number;
  dirX: number;
  dirZ: number;
  /** Displacement along `dir` (shoved props). */
  slide: number;
  /** Vertical squash 0..1 (flattened bushes); 1 = intact. */
  squash: number;
  /** Uniform regrow / restore scale 0 → 1. */
  growth: number;
}

export const HIDDEN_MATRIX: Readonly<Matrix4> = new Matrix4().makeScale(0, 0, 0);

const tmpPos = new Vector3();
const tmpScale = new Vector3();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();
const tmpAxis = new Vector3();
const tmpA = new Matrix4();
const tmpB = new Matrix4();
const tmpC = new Matrix4();

/** World matrix of one part for a pose; `out` is reused, nothing is allocated per call. */
export function propPartMatrix(part: PartLocal, pose: PropPose, out: Matrix4): Matrix4 {
  const s = pose.scale * pose.growth;
  // Part in the prop frame: T(pos) · R(euler) · S(scale).
  tmpPos.set(part.pos[0] * s, part.pos[1] * s * pose.squash, part.pos[2] * s);
  const e = part.euler ?? [0, 0, 0];
  tmpQuat.setFromEuler(tmpEuler.set(e[0], e[1], e[2]));
  const ps = part.scale ?? [1, 1, 1];
  tmpScale.set(ps[0] * s, ps[1] * s * pose.squash, ps[2] * s);
  out.compose(tmpPos, tmpQuat, tmpScale);
  // Prop yaw.
  tmpA.makeRotationY(pose.rotation);
  out.premultiply(tmpA);
  // Tilt about the base along the fall direction.
  if (pose.tilt !== 0) {
    tmpAxis.set(pose.dirZ, 0, -pose.dirX);
    if (tmpAxis.lengthSq() < 1e-9) tmpAxis.set(1, 0, 0);
    else tmpAxis.normalize();
    tmpB.makeRotationAxis(tmpAxis, pose.tilt);
    out.premultiply(tmpB);
  }
  tmpC.makeTranslation(pose.x + pose.dirX * pose.slide, 0, pose.z + pose.dirZ * pose.slide);
  return out.premultiply(tmpC);
}
