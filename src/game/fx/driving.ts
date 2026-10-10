import type { Surface } from "../world/surface";

/**
 * Pure driving-feedback model: which cosmetic effects a frame of driving
 * produces, from the surface under the car and its motion. No rendering here.
 */
export interface DriveSample {
  surface: Surface;
  /** Signed speed along the heading (units/s). */
  speed: number;
  /** Steering input -1..1. */
  steer: number;
  brake: boolean;
  /** Longitudinal acceleration (units/s²), negative when slowing. */
  accel: number;
}

export interface DriveFx {
  /** Dust puffs per second to emit at the rear wheels (0 when stopped or on hard surfaces). */
  dustRate: number;
  /** Lay skid marks this frame (hard braking or a fast turn on asphalt). */
  skid: boolean;
  /** Brake lights plus skid: a visible "hard stop". */
  hardBrake: boolean;
}

export const DRIVE_FX = {
  /** Below this speed nothing is kicked up. */
  minDustSpeed: 2.5,
  /** Dust per second at full speed on turf. */
  dustAtMax: 14,
  maxSpeed: 20,
  /** Deceleration (units/s²) that counts as hard braking. */
  hardBrakeDecel: 20,
  /** Lateral demand (|steer| · speed) from which tyres skid on asphalt. */
  skidLateral: 11,
  skidMinSpeed: 7,
};

export function driveFx(s: DriveSample, cfg = DRIVE_FX): DriveFx {
  const v = Math.abs(s.speed);
  const moving = v >= cfg.minDustSpeed;
  const hardBrake = moving && s.brake && s.accel <= -cfg.hardBrakeDecel * 0.6;
  const dustRate = s.surface === "turf" && moving ? (cfg.dustAtMax * Math.min(1, v / cfg.maxSpeed)) : 0;
  const lateral = Math.abs(s.steer) * v;
  const skid = s.surface === "asphalt" && v >= cfg.skidMinSpeed && (hardBrake || lateral >= cfg.skidLateral);
  return { dustRate, skid, hardBrake };
}
