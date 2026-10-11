import type { PropEvent } from "./propWorld";
import type { TreeEvent } from "./treeWorld";

/**
 * Frame-level feedback channel between the tree simulation and the cosmetic
 * systems (car jolt, particles, camera nudge). Written by the Trees system
 * once per frame, read by whoever renders feedback; never React state.
 */
export interface Jolt {
  /** Remaining jolt strength 0..1, decays every frame. */
  strength: number;
  /** Direction the car was pushed from (unit XZ). */
  dirX: number;
  dirZ: number;
}

export const impactBus = {
  /** Events produced during the last simulation step; consumers read them in the same frame. */
  events: [] as TreeEvent[],
  /** V9: street-furniture events of the same frame. */
  propEvents: [] as PropEvent[],
  jolt: { strength: 0, dirX: 0, dirZ: 1 } as Jolt,
  /** Total impacts since the page loaded (diagnostics). */
  count: 0,

  push(e: TreeEvent): void {
    this.events.push(e);
    if (e.type === "shake" || e.type === "topple" || e.type === "break") {
      this.count++;
      const k = e.type === "shake" ? Math.min(0.5, e.impact / 10) : Math.min(1, 0.4 + e.impact / 20);
      if (k > this.jolt.strength) this.jolt = { strength: k, dirX: e.dirX, dirZ: e.dirZ };
    }
  },

  pushProp(e: PropEvent): void {
    this.propEvents.push(e);
    if (e.type === "wobble" || e.type === "shove" || e.type === "knock" || e.type === "flatten") {
      this.count++;
      const k = e.type === "wobble" ? Math.min(0.4, e.impact / 12) : e.type === "flatten" ? Math.min(0.3, e.impact / 20) : Math.min(1, 0.3 + e.impact / 22);
      if (k > this.jolt.strength) this.jolt = { strength: k, dirX: e.dirX, dirZ: e.dirZ };
    }
  },

  /** Exponential decay of the jolt; call once per frame. */
  decay(dt: number): void {
    this.jolt.strength *= Math.exp(-6 * dt);
    if (this.jolt.strength < 0.01) this.jolt.strength = 0;
  },

  clear(): void {
    this.events.length = 0;
    this.propEvents.length = 0;
  },
};
