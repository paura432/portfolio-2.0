/**
 * Photo mode: a fixed camera used by the capture tooling (and by nothing else)
 * so before/after screenshots share the exact same framing. Mutable module
 * state read by FollowCamera every frame; never touched by the UI.
 */
export interface PhotoCamera {
  position: [x: number, y: number, z: number];
  target: [x: number, y: number, z: number];
  fov?: number;
}

export const photoMode: { camera: PhotoCamera | null } = { camera: null };

/** When true the performance monitor must not downgrade the quality tier (captures only). */
export const probeState = { lockQuality: false };
