/**
 * Visual-only vehicle animation (body roll, pitch, brake state). Pure maths
 * kept apart from the physics so the collision model is untouched.
 */
import { CAR_CONFIG, type CarState } from "./carPhysics";

export interface CarPose {
  roll: number;
  pitch: number;
  braking: boolean;
}

export const VISUAL_CONFIG = {
  maxRoll: 0.07,
  maxPitch: 0.045,
  rollLambda: 8,
  pitchLambda: 6,
} as const;

/** Body roll from lateral load: steer × speed, sign so the body leans out of the turn. */
export function targetRoll(state: CarState, maxSpeed = CAR_CONFIG.maxSpeed): number {
  const load = (state.steerAngle / CAR_CONFIG.maxSteerAngle) * (state.speed / maxSpeed);
  return Math.max(-VISUAL_CONFIG.maxRoll, Math.min(VISUAL_CONFIG.maxRoll, -load * VISUAL_CONFIG.maxRoll * 1.4));
}

/** Pitch from longitudinal acceleration: nose up when accelerating, nose down when braking. */
export function targetPitch(accel: number): number {
  const n = accel / CAR_CONFIG.brakeDeceleration;
  return Math.max(-VISUAL_CONFIG.maxPitch, Math.min(VISUAL_CONFIG.maxPitch, -n * VISUAL_CONFIG.maxPitch * 1.3));
}

/** Brake lights: active brake input, reverse, or clear deceleration while moving. */
export function isBraking(state: CarState, accel: number, brakeInput: boolean): boolean {
  if (brakeInput) return true;
  if (state.speed < -0.2) return true;
  return state.speed > 0.5 && accel < -4;
}

export function dampTo(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
