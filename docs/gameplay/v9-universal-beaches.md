# V9 · Universal beaches

Status: iteration 1.

## The rule no longer knows the beaches

V8 turned the car into the boat when it was *inside a listed beach* and deep enough. V9 derives everything from the terrain:

- **Shore** = ground whose height lies strictly between the built land (0) and the sea floor (−4.2): a slope that meets the water (`isShoreAt`). The flat platform, the Skyport slab, the ramps and the open sea are never shore.
- **Seaward** = the downhill direction of the ground, from the height-field gradient (`seawardDirectionAt`). On a beach this is its seaward axis, but it is computed, not read.
- **Decision** (`shoreDecision`, hysteresis kept from V8): on a shore, a ground form moving toward deeper water into ≥ 0.55 u of water becomes the boat; a floating hull moving toward the land into ≤ 0.3 u becomes the car. Between the two depths nothing changes; a hull drifting along the waterline keeps its form; one second of lockout after each change; a running sequence may only be reversed by the opposite threshold.

Adding a beach is therefore one entry in `beaches.ts` (edge, seaward, length, drop); the terrain mesh, the coastline bay, the drive rectangle, the minimap and the transformation all follow.

## Inventory and verification

Three drivable beaches exist (South, East, Skyport); no other shore stretch is reachable by car (quay face, railings and skirt margins elsewhere). Each is verified at 12 %, 50 % and 88 % of its width in both directions by `beachRuns.test.ts`, driving the real car and boat models against the real colliders; in the browser, `e2e/transformer.spec.ts` drives South in and East out, and `e2e/beaches.spec.ts` (iteration 5) East in, Skyport out and in, and South out at its west third.

## The hull against the coast

A hull scraping the coast keeps its helm (iteration 5): the yaw rate is damped only on a hard head-on hit, so the bow can turn away from a wall (`beachRuns.test.ts`). A hull driven full-throttle into the 90° corner between a bay wall and the coast stays there while the throttle is held, like a car against two walls; reversing frees it (SEA-02, recorded as a P2 note).

## Not done

Sand particles at the waterline (carried from V8's optional list).
