# V9 · Flight ramps

Status: iteration 1.

## Inventory

| Ramp | Where | Approach → slope → lip | Launches over |
|---|---|---|---|
| West City Ramp | south-west turf, from (−53, 10) south | 22 u flat, 22 u slope to 5.5 u, lip at z = 54 | the south turf edge, then the sea |
| Campus Ramp | east strip below the 4Geeks campus, from (53, −42) south | 12 u flat, 22 u slope to 5.5 u, lip at z = −8 | the east cross road and the island's south half |
| Skyport Ramp | the runway's east end, from the pad (124, −9) east | 50 u runway, 20 u slope to 5 u, lip at x = 194 | the open sea |

These are the only slopes in the world besides the beaches: nothing else rises above the platform, so a street can never be mistaken for a ramp.

## Sequence (unchanged from V8, now shared with the tests)

`rampStep` (`src/game/vehicle/rampRun.ts`) is the one function the vehicle and the unit tests run: slope under the car → lip crossing → `rampDecision`. Entering the corridor aligned and moving: **prepare**; from 11 u/s: **deploy** (wings out over 1.7 s); at the lip with the wings out and ≥ 14 u/s: **launch** with the car's own speed and the lip's slope as pitch. Too slow at the lip: a hop and "Too slow to take off". Leaving the corridor, slowing or turning away: the wings fold.

## Verification

`rampRuns.test.ts` drives each of the three ramps from 4 u before its entry with W held, against the real colliders: the corridor is reachable and clear every 0.5 u at three lateral offsets; the states appear in order; the launch fires at the lip at ≥ 14 u/s; the ground under the car really reached ≥ 90 % of the lip height; what lies beyond each lip is water or landable ground and a slow hop lands on solid ground. The West City Ramp is flown end to end in the browser (`e2e/transformer.spec.ts`). Campus and Skyport browser flights: iteration 2.
