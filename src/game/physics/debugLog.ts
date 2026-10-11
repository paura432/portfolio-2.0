/**
 * Debug telemetry (V9, development and probe only). Two ring buffers that
 * cost nothing while disabled: one vehicle sample per frame (mode, state,
 * pose, speed, inputs, pause, blocked) and one entry per contact the car's
 * constraint resolved (what was hit, position and speed before / after, the
 * correction). Read on demand through `window.__pauWorld.debug.*`; never
 * printed per frame.
 */
export interface VehicleSample {
  n: number;
  t: number;
  state: string;
  authority: string;
  mode: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  throttle: number;
  steer: number;
  brake: boolean;
  driving: boolean;
  phase: string;
  /** Contacts resolved during this frame's physics. */
  contacts: number;
  blocked: boolean;
  /** Beach / ramp the store names this frame, water depth under the body. */
  beach: string | null;
  ramp: string | null;
  depth: number;
}

export interface ContactSample {
  n: number;
  /** Obstacle id, "boundary", "tree", "prop" or "ramp". */
  what: string;
  /** Proposed position (before resolution) and the resolved one. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Correction applied (penetration depth along the push). */
  depth: number;
  /** Unit push direction (the contact normal, from the obstacle toward the car). */
  nx: number;
  nz: number;
  heading: number;
  speedBefore: number;
  speedAfter: number;
  /** Why the step counted as blocked (rigid) rather than yielding. */
  reason: string;
}

class Ring<T> {
  readonly items: T[] = [];
  constructor(readonly capacity: number) {}
  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.capacity) this.items.shift();
  }
  clear(): void {
    this.items.length = 0;
  }
  last(n: number): T[] {
    return this.items.slice(Math.max(0, this.items.length - n));
  }
}

export const debugLog = {
  enabled: false,
  n: 0,
  vehicle: new Ring<VehicleSample>(600),
  contacts: new Ring<ContactSample>(200),
  /** Contacts resolved during the current frame (reset by the vehicle each frame). */
  frameContacts: 0,
  contact(c: Omit<ContactSample, "n">): void {
    if (!this.enabled) return;
    this.n++;
    this.contacts.push({ n: this.n, ...c });
    this.frameContacts++;
  },
  sample(v: Omit<VehicleSample, "n" | "contacts">): void {
    if (!this.enabled) return;
    this.n++;
    this.vehicle.push({ n: this.n, contacts: this.frameContacts, ...v });
    this.frameContacts = 0;
  },
  clear(): void {
    this.vehicle.clear();
    this.contacts.clear();
    this.frameContacts = 0;
  },
};
