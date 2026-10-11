# V9 · Destructible world

Status: iteration 4 (every catalogued category active).

## What reacts, and how

| Category | Count | Collider | Soft contact | Medium hit | Hard hit | Down state | Speed kept |
|---|---:|---|---|---|---|---|---:|
| Street lamp | 75 | circle r 0.24 | rattles (≥ 0.6 u/s) | — | ≥ 5 u/s: topples about its base, away from the car; the light pool goes out | lying, no collider | 72 % |
| Planter | 4 | oriented box 1.9 × 1.9 | rattles (≥ 1) | ≥ 2.5 u/s: slides along the push (≤ 1.2 u in total), stays solid, its collider moves with it | ≥ 9 u/s: tips over | lying, no collider | 55 % |
| Bench | 27 | oriented box 1.7 × 0.6 | rattles (≥ 0.6) | ≥ 1.5 u/s: slides (≤ 1.8 u) | ≥ 6 u/s: flips | lying, no collider | 80 % |
| Tree (V4) | 140 | circle | shakes | — | ≥ 6 topple, ≥ 13 snap | fallen, no collider | 65–70 % |
| Bollard | 16 | circle r 0.16 | rattles (≥ 0.6) | — | ≥ 4 u/s: falls | lying, no collider | 78 % |
| Bush | 110 | circle r 0.6 · size | rustles (≥ 0.3) | — | ≥ 1 u/s (walking pace): flattened, sheds leaves | flat, no collider | 90 % |
| Signpost / sign post | 9 | circle r 0.2 | rattles (≥ 0.6) | — | ≥ 8 u/s: leans and falls with its panels | lying, no collider | 70 % |
| Light mast (ramp gates, pad) | 10 | circle r 0.22 | rattles (≥ 0.6) | — | ≥ 7 u/s: falls | lying, no collider | 72 % |

Thresholds are approach speeds (the car's velocity component toward the object). The car's own speed is 0–20 u/s, so a rattle is a parking nudge, a shove is a slow roll, a knock-over is normal driving speed.

## Rules

- At most 10 props animate at once; the rest stay rigid. At most 40 props lie down; beyond that the oldest is restored early.
- A down prop comes back after 20–30 s, never within 26 u of the car (no pop-in in front of the camera). **Reset world** (HUD) restores every prop and tree at once, except those under the car, which come back when it leaves; shoved props return to their placed position.
- The simulation runs at a fixed 1/120 s step: the same hit gives the same rest pose at 30 or 120 fps.
- Buildings, roads, terrain, ramps, piers and the causeway never break.

## Feedback

The HUD toast names the object and the reaction ("Street lamp rattled", "Planter shoved", "Bench knocked over", "Bush flattened"); the car jolts through the shared impact bus; the particle pools emit fragments and dust on a knock-over, scattered foliage for a planter, leaves for a flattened bush, dust on a shove or a settle (iteration 4).

## Where it lives

`src/game/world/propCatalog.ts` (categories: parts, collider, reaction), `propWorld.ts` (simulation, the same architecture as the V4 trees), `propRig.ts` (matrices), `fixtures.ts` (the 19 component-drawn posts and masts, keyed, shared with the components), `src/components/game/DynamicProps.tsx` (one instanced mesh per part, dirty-only writes; lamps, planters, benches, bollards, bushes) and `DynamicFixture.tsx` (a group placed and tilted from the prop pose; signposts, ramp masts and signs, pad masts, hangar and harbor signs), `obstacles.ts` (hooked into the car's constraint after the trees). A prop whose footprint contains the car's centre yields instead of ejecting the car (safe recovery). The probe exposes `props.*` for tests and captures.
