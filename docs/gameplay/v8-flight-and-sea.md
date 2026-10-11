# V8 · Ramps, flight, beaches

## Ramps: where the car flies

Three ramps, all data in `src/data/ramps.ts`, all real terrain:

| Ramp | Where | Launch direction | Approach + slope | Lip |
|---|---|---|---|---|
| West City Ramp | south-west turf between the ring road and the coast (x −53, z 10 → 54) | south, over the sea | 22 + 22 u | 5.5 u, ≈ 22° |
| Campus Ramp | east strip below the 4Geeks campus (x 53, z −42 → −8) | south, over the causeway road | 12 + 22 u | 5.5 u |
| Skyport Ramp | the runway's east end (x 124 → 194, z −9) | east, over the approach lights and the sea | 50 + 20 u | 5 u |

The brief asked for a ramp near Central Hub: the hub's surroundings (plaza, four districts, the cross roads) leave no 45 u straight that avoids a road or a building, so the city ramp sits on the west turf instead; the campus ramp and the Skyport ramp are where the brief put them.

**Sequence.** Enter the corridor facing the ramp (±0.45 rad): *preparing-flight*, the HUD names the ramp and the speed to beat. From 11 u/s (≈ 40 km/h) the wings deploy while the car keeps driving (*transforming-to-plane*, 1.7 s). Over the lip with the wings out and ≥ 14 u/s (≈ 50 km/h): *flying*, the ground speed becomes airspeed and the lip's slope the initial pitch. Slower, or with the wings still moving: a short hop and the wings fold back (*transforming-to-car*). Slow down, reverse or turn away before the lip: the wings fold back. Wrong direction: nothing. No assist impulse is applied anywhere: the launch speed is the car's own, floored at the takeoff speed so the flight model never starts in a stall.

## Flight (unchanged arcade model from V7)

Auto-throttle cruise 24 u/s, W climb (+5 thrust), S descend, A/D bank (the aircraft turns through its bank), Space air brake, stall under 11 u/s (nose down, bounded sink, recovery), ceiling 95 u.

**Controls, and the brief's proposal.** The brief proposed Space to climb and Ctrl to descend. Space is the brake in the car, in the hull and on the touch pad (one hold button), so giving it a second meaning in the air would make the one key that must always mean "slow down" mean "go up" in one mode. Resolution: W/S pitch, A/D bank, Space brake in every mode, R recover. Touch uses the same four hold buttons plus brake, unchanged.

## Landing: anywhere flat and clear

`src/game/vehicle/landing.ts`. A spot is landable when it is built ground (any drive rectangle: the city platform, the quay, the causeway, Skyport, the beaches down to the waterline), at least 2.4 u clear of every building, not on a ramp slope and dry. Deep water (> 0.55 u) is a splashdown: the hull comes out and the vehicle sails. Everything else (buildings, ramps, coast skirts, the Creative Lab terrain) holds an altitude floor 12 u above it and the HUD says "Too low here". Trees are not landing obstacles: they are the V4 destructible trees and react to the rolling car. The HUD shows "Landing zone detected" when the ground 6 and 14 u ahead is landable (or splashable), the aircraft is under 30 u and ≤ 22 u/s.

Touchdown: the car model takes over at the airspeed (capped at 20 u/s), *landing* until the roll slows under 16 u/s or 1.4 s pass, then *transforming-to-car* folds the wings (1.5 s) while the car keeps rolling and answers the brake. No crash state by design (arcade).

## Beaches: where the car sails

Three beaches, data in `src/data/beaches.ts`:

| Beach | Edge | Seaward | Sand slope |
|---|---|---|---|
| South Beach | main island, z 66, x 12 → 40 | south | 18 u long, 2.6 u drop, then a run-out to the sea floor |
| East Beach | main island, x 66, z 14 → 42 | east | same |
| Skyport Beach | Skyport slab, z 36, x 112 → 138 | south | 16 u, 2.6 u drop |

Terrain classes down the beach: `sand` → `wet-sand` (within 0.55 u of the waterline) → `shallow-water` → `deep-water` (`terrainClassAt`). The classification comes from the height field, never from the material.

**Entering.** Drive down the sand: still a car, the body follows the slope. Past 0.55 u of water and moving seaward: *transforming-to-boat* (1.1 s): the hull model takes the car's velocity, the floats swing down, the keel plate drops, the wheels tuck, the body settles from the sand to the waterline over the sequence, the wake starts once the floats are out. Driving along the shore, stopping on wet sand or rolling through the shallows at the waterline does not transform (hysteresis).

**Leaving.** Sail at any beach heading landward: under 0.30 u of water, *exiting-water* (1.2 s): the car model takes the hull's speed along the heading, the body rises from the waterline to the sand, the wheels come down; then *car*, driving up the slope. Any beach works, not only the one you entered by. A hull pushed onto sand shallower than 0.12 u without heading landward is pushed back seaward.

## Camera

One camera, framings by body: car (close), hull (higher, horizon), flight (far, blended in by altitude so the lip and the touchdown need no cut). While parts move the framing pulls back 60 % of the way to the transformation profile, eased in and out. Position, target and field of view interpolate; resets snap.

## Reset

R or the HUD button in any state: the car, stopped, at the nearest of the city spawn, the Skyport apron and the top of each beach (facing inland).
