import { getRamp, rampLocal, rampSlopeAt, rampZoneAt, type RampDefinition, type RampId } from "@/data/ramps";
import { rampUnder } from "../world/ground";
import { RAMP_ALIGN, rampDecision, type RampDecision, type VehicleState } from "./transformer";

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface RampStepInput {
  x: number;
  z: number;
  heading: number;
  /** Signed ground speed. */
  speed: number;
  state: VehicleState;
  /** Ramp whose slope the car was on during the previous step. */
  onRamp: RampId | null;
  /** Wing deployment progress 0..1 (1 = fully out). */
  wings: number;
  /** Seconds since the last transformation completed. */
  sinceLast: number;
}

export interface RampStepResult {
  /** Ramp whose slope the car is on now. */
  onRamp: RampId | null;
  /** The car has just driven past the lip this step. */
  pastLip: boolean;
  lipSlope: number;
  /** Corridor the car is in (approach or slope), if any. */
  corridor: RampDefinition | null;
  aligned: boolean;
  decision: RampDecision;
}

/**
 * One step of the ramp logic (V8, extracted in V9 so every ramp can be
 * driven in a unit test with the same code the vehicle runs): which slope
 * the car is on, whether it just left a lip, and what the ramp rule decides.
 */
export function rampStep(i: RampStepInput): RampStepResult {
  const ru = rampUnder(i.x, i.z);
  let onRamp: RampId | null = ru ? ru.ramp.id : null;
  let pastLip = false;
  let lipSlope = 0;
  if (!ru && i.onRamp) {
    const r = getRamp(i.onRamp);
    const l = rampLocal(r, i.x, i.z);
    if (l.s > r.length && Math.abs(l.lateral) <= r.width / 2 + 1) {
      pastLip = true;
      lipSlope = rampSlopeAt(r, r.length);
    }
    onRamp = null;
  }
  const corridor = rampZoneAt(i.x, i.z);
  const aligned = corridor ? Math.abs(wrap(i.heading - corridor.heading)) < RAMP_ALIGN && i.speed > 0 : false;
  const decision = rampDecision({ state: i.state, inCorridor: corridor !== null, aligned, speed: i.speed, pastLip, deployed: i.wings >= 0.999, sinceLast: i.sinceLast });
  return { onRamp, pastLip, lipSlope, corridor, aligned, decision };
}
