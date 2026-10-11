# V9 · World physics and destruction validation

Branch `feat/v9-world-physics-destruction`, created from `9f93b38` (`integration/v8-editorial-final-qa`, the validated V8 + editorial build: lint, typecheck, 222 unit tests, build and 18/18 E2E twice before any V9 change). This document turns the V9 brief's priorities A–G into observable acceptance criteria and records, per iteration, what is verified and how. Status words: PASS = verified by a test, a capture or a measurement on this branch; PARTIAL = verified for a subset, the rest listed; NOT VERIFIED = not yet checked; FAIL = checked and failing. The world state machine of the loop lives in `v9-world-audit-state.json`; the inventory and findings in `v9-world-object-inventory.md`.

## 1. Acceptance criteria

### A. Universal beaches

| # | Criterion (observable) | Status | Evidence |
|---|---|---|---|
| A1 | 100 % of the inventoried drivable beaches (3) turn the car into the boat when driven into the water | PASS (3/3, three points each) | `beachRuns.test.ts` "car → boat at several points": the car drives from 8 u inland down each beach at 12 %, 50 % and 88 % of its width with the real constraint; the hull rule fires inside the beach at the enter depth (0.55–0.95 u), nothing blocks the way |
| A2 | 100 % turn the boat back into the car when sailed up the sand | PASS (3/3, three points each) | `beachRuns.test.ts` "boat → car": the hull sails up with the real sea colliders; the wheels-down rule fires at ≤ 0.3 u depth while still afloat, before the shore push |
| A3 | The transition is derived from topography, depth, water contact and the vehicle's direction, not from a beach list | PASS | `isShoreAt` / `seawardDirectionAt` (height-field only) drive `shoreDecision`'s `onShore` and `seawardSpeed` in `Vehicle.tsx`; `beachRuns.test.ts` "shore topography" proves every beach reads as shore and its downhill direction equals its seaward direction without reading the beach data, while the flat land, the ramps and the open sea do not |
| A4 | Enter by one beach, leave by another | PASS (South → East, real driving) | `e2e/transformer.spec.ts` beach loop (V8, unchanged, green in this run) |
| A5 | Hysteresis and lockout kept: no mode flapping from waves, a hull drifting along the waterline keeps its form | PASS | `transformer.test.ts` (two depths, direction, lockout, reversal only); `beachRuns.test.ts` "drifting sideways" on every beach; depth is still-water depth (waves ignored by design) |
| A6 | No invisible blocks at the entries and exits | PASS (3/3) | `beachRuns` asserts no bump on the way down; the audit found 0 trees, 0 lamps, 0 building colliders inside any beach drive rectangle |
| A7 | Several points per beach stretch verified in the browser | PARTIAL | E2E covers South Beach in (centre) and East Beach out (V8). The nine-point coverage is unit-level; a browser pass over the other beaches is planned for iteration 2 |

### B. Launch ramps

| # | Criterion | Status | Evidence |
|---|---|---|---|
| B1 | 100 % of the inventoried launch ramps (3) are reachable by car along their whole corridor | PASS (3/3) | `rampRuns.test.ts` "whole corridor reachable and free": every 0.5 u of each corridor at three lateral offsets is inside the drive area, clear of buildings, trees and furniture |
| B2 | Each has a working physical slope (the car climbs real terrain) | PASS (3/3) | `rampRuns` "driven from its entry": the ground height under the car reaches ≥ 90 % of the lip height before the launch; `ground.test.ts` (V8) |
| B3 | Wings deploy visibly on the approach / slope before the lip | PASS (3/3 unit, 1/3 browser) | `rampRuns`: states `car → preparing-flight → transforming-to-plane` in order for every ramp; `e2e/transformer.spec.ts` ramp loop (West City Ramp) and the V8 capture `04-wings-deploying` |
| B4 | Launch at the lip when the conditions hold, with the car's own speed, no teleport | PASS (3/3 unit, 1/3 browser) | `rampRuns`: `launch` decision at the lip with speed ≥ 14 u/s and pitch > 0.12 for every ramp, using the same `rampStep` the vehicle runs; E2E West City Ramp flight |
| B5 | Wrong entries are controlled (too slow → hop, side entry blocked, no fake flight) | PASS | `transformer.test.ts`, `rampColliders.test.ts`, E2E guards (slow lip hop) |
| B6 | Flight, landing and recovery of the car | PASS (browser, West City Ramp) | E2E ramp loop: flight, touchdown on the south turf, roll-out, fold |
| B7 | What lies beyond every lip is water or landable ground; a slow hop lands on solid ground | PASS (3/3) | `rampRuns` "beyond the lip" |
| B8 | Campus Ramp and Skyport Ramp flown in the browser | NOT VERIFIED | planned iteration 2 (`e2e/ramps.spec.ts`) |

### C. Coherent collisions

| # | Criterion | Status | Evidence |
|---|---|---|---|
| C1 | Every relevant class of physical object has a coherent collider | PARTIAL | buildings, labs, hangar (3 walls), tower (shaft), terminal, cabin, ramp rails and bodies, trees, lamps, planters, benches: yes. Open: bollards, bushes, signposts, masts and sign posts (COL-02, COL-03) |
| C2 | Collider shapes fit the geometry: circle, oriented box, compound, height field | PASS for the shapes used | circle (hub, trunks, lamp posts), axis-aligned box (buildings, rails), oriented box (benches, planters; `resolveCircleObb`, `collision.test.ts`), compound (hangar), height field (`groundHeightAt` for ramps and beaches) |
| C3 | No known P0/P1 invisible obstacles | PARTIAL | COL-04 (hangar front) fixed; none other known. The captures `14-colliders-hangar-open-front` / `15-car-inside-hangar` show the car entering |
| C4 | No passable solids during normal driving | PARTIAL | lamps / planters / benches now solid (E2E: the car is held outside, `collider` not null); bollards, bushes, signposts, masts still passable (P1, open) |
| C5 | No persistent penetration after a collision | PASS for the cases tested | `carCollision.test.ts` (ejection within one step), `propWorld.test.ts` (car held outside a shoved planter), E2E lamp nudge |
| C6 | Rotated pieces collide in their drawn orientation | PASS | `collision.test.ts` oriented box; `propWorld.test.ts` "collides along its drawn orientation" (bench turned along the road) |
| C7 | Drivable zones keep their accesses (districts, labs, harbor, Skyport, beaches, ramps) | PASS | `data.test.ts` (entrances by road), `rampRuns` corridors, `beachRuns`, spawns free (audit) |
| C8 | Collisions reliable at different frame rates | PASS | `carCollision.test.ts` (no tunnelling at 0.1 s frames), `propWorld.test.ts` "frame-rate independent" (30 vs 120 fps, same rest pose) |
| C9 | Debug tooling to see colliders and contacts, hidden from visitors | PASS | `DebugColliders.tsx`: static colliders, drive areas, ramps, beaches, trunks, live prop colliders (red solid / grey down), the car's circle, the last 24 contact points; switched on only by the probe (`__pauWorld.debug.colliders`) or `?debug=colliders` in development builds; captures `13`–`15` |

### D. Destructible furniture

| # | Criterion | Status | Evidence |
|---|---|---|---|
| D1 | Every identified decorative category has a defined impact behaviour | PARTIAL | catalogue (`propCatalog.ts`) defines lamp, planter, bench, bollard, bush, signpost, mast with thresholds, collider and reaction; active in the simulation: lamp, planter, bench (the vertical slice). Trees: V4 |
| D2 | Applicable instances react by the system's rules | PASS for the active categories (75 lamps, 4 planters, 27 benches) | `propDefs` (stable ids over the V3 placements); E2E `world.spec.ts` drives into one of each |
| D3 | Light and hard impacts are distinguished | PASS | rattle (< shove), shove (heavy props slide along the push, stay solid, capped at `maxSlide`), knock-over (≥ knock, the car keeps `retain` of its speed); E2E lamp: nudge at ≈ 3 u/s rattles and bounces the car, hit at ≈ 11 u/s knocks it over |
| D4 | Objects update their collider correctly | PASS | shoved planter: oriented box moves with it (E2E `collider(id).x ≈ position.x`); down props: no collider, the car drives over (E2E lamp step 3; `propWorld.test.ts` bench) |
| D5 | Destroyed states recover or persist in a controlled way | PASS | down for `downDuration` (20–30 s), never restored within 26 u of the car, early restore of the oldest beyond `maxDown` (40), at most `maxDynamic` (10) animating; `propWorld.test.ts` |
| D6 | Reset world works (trees and furniture) | PASS | HUD "Reset world" resets both worlds, button counts `treesDown + propsDown`; E2E lamp and planter: back standing, solid, at the original place |
| D7 | Buildings and infrastructure stay intact | PASS | only trees and props are destructible; buildings, roads, terrain, ramps, piers and the causeway have no destruction path |
| D8 | Not every object becomes identical fragments | PASS | lamps topple about the base and their light goes out; planters slide then tip; benches flip; bushes (catalogue) flatten; the particles per category are still to do (DES-02) |
| D9 | Reuse of the V4 tree architecture | PASS | `PropWorld` mirrors `TreeWorld` (fixed step, dirty set, events, pooled limits, reset) and the prop rig mirrors the tree rig; both feed the same impact bus, HUD toast and reset |

### E. Intact buildings and essential infrastructure — see D7 (PASS).

### F. Stability and efficiency

| # | Criterion | Status | Evidence |
|---|---|---|---|
| F1 | One physics authority for the vehicle | PASS | unchanged V8 (`authorityOf`, `poseOf`); `vehicleManager.test.ts` |
| F2 | Deterministic sub-steps | PASS | car / boat / plane sub-steps (V8); prop simulation at a fixed 1/120 s step with an accumulator |
| F3 | Reliable collisions at different speeds | PASS | `carCollision.test.ts`; `propWorld.test.ts` at 2.5, 5, 8, 12, 14, 18 u/s |
| F4 | Destructible objects with bounded states | PASS | 6 phases, `maxDynamic` 10, `maxDown` 40 |
| F5 | Instancing where applicable | PASS | one instanced mesh per category part (lamp 4, planter 2, bench 3 → 9 draw calls for 106 props), dirty-only matrix writes |
| F6 | Pools for animation and particles | PASS / PARTIAL | tree pool and particle pools unchanged; prop impacts do not emit particles yet (DES-02) |
| F7 | Recovery without ghost collisions | PASS | a restoring prop is not an obstacle until it is standing again; never restored under the car; `propWorld.test.ts` |
| F8 | HIGH / MEDIUM / LOW with equivalent function | PASS | the simulation is tier-independent; LOW hides the lamp light pools only (as V3 did); E2E runs at low and high |
| F9 | No external physics engine | PASS | none added |

### G. QA and visual review

| # | Criterion | Status | Evidence |
|---|---|---|---|
| G1 | Lint, typecheck, unit tests, build | PASS | see §2 |
| G2 | Full E2E green twice in a row | see §2 | |
| G3 | Visual QA captures | PASS (iteration 1 set) | `docs/screenshots/v9/` |
| G4 | Performance measured | PASS (SwiftShader, relative) | §3 |
| G5 | Responsive | PASS (mobile E2E suite) | §2 |
| G6 | V8 regressions | PASS | the V8 suites (transformer, trees, campus, dialog, smoke, context loss, mobile) in the same full run |
| G7 | Every beach, every ramp, every category, every collider type reviewed in the browser | PARTIAL | this iteration: lamp / planter / bench / hangar in the browser; beaches and ramps at unit level for all, browser for one each |

## 2. Automated checks (iteration 1)

| Check | Result |
|---|---|
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm typecheck` | clean |
| `pnpm test` | 270 unit tests (222 in V8 + 48 new: oriented-box collider, prop simulation, prop inventory counts, shore topography, 18 beach drive-throughs, 3 ramp drive-throughs and corridor audits, landing exclusion for the hangar roof) |
| `pnpm build` | 18 routes, unchanged |
| `e2e/world.spec.ts` (new) | 3/3: street lamp (1.7 min), planter (41 s), bench (33 s) |
| Full E2E, run 1 (desktop + mobile, 21 tests, 10.3 min) | 20/21. The one failure is `campus.spec.ts` "keeps driving" (the V5 fixed-time check: 0.37 u of reverse in 1.2 s wall-clock under SwiftShader while the machine was loaded; the same assertion passed in the isolated re-run of the campus spec, 2/2). Not weakened; recorded as the known load-sensitive check from the V7/V8 reports |
| Full E2E, run 2 | NOT RUN in iteration 1 (the two consecutive full passes are the exit condition of the loop, not of the vertical slice) |

### The new E2E, step by step (teleports only stage the car; every reaction comes from driving)

**Street lamp.** The lamp on the east sidewalk of the south road at (4.8, 31.5). 1. Capture intact. 2. Car staged 0.3 u before contact, W held: the lamp is `wobbling`, the toast says "Street lamp rattled", the car's centre stays ≥ 1.3 u before the post; the lamp settles back to `standing`. 3. Car staged 4 u before contact, W held (≈ 11 u/s at contact): the lamp goes `falling` with `impact ≥ 5`, falls away from the car (+X), has no collider, the toast says "Street lamp knocked over", Reset world is enabled with `data-props-down="1"`; W a little longer and the car is past the post's place; the lamp reaches `down` with angle > 1.3 rad and the capture differs from the intact one (mean pixel difference > 3). 4. Driving straight over the fallen post's place is not blocked. 5. Reset world: `standing`, collider back, button disabled, capture equal to the intact one (difference < 3).

**Planter.** The plaza planter at 22.5°, approached from outside toward the centre. 1. ≈ 5.7 u/s: `shoved`, toast "Planter shoved", then `standing` 0.15–1.2 u further along the push; the oriented-box collider reports the new position and the original rotation; the car is held outside the moved box. 2. ≈ 11 u/s: `falling` / `down`, toast "Planter knocked over", no collider, the car passes the planter's place. 3. Reset world: `standing` at the original position (to 1e-6).

**Bench.** The plaza bench at 67.5°, approached radially (its short side). 1. Creeping contact: `wobbling` or `shoved`, collider is an oriented box 0.85 × 0.3, then `standing`. 2. ≈ 9 u/s: `falling` / `down`, toast "Bench knocked over", no collider, summary `down = 1`, active categories `lamp, planter, bench`. 3. The Central Hub still stops the car from the spawn; the debug overlay toggles on and off through the probe without errors.

## 3. Performance (SwiftShader, relative only; never a statement about real GPUs)

Filled from `docs/screenshots/v9/perf/perf-v9.json` (`scripts/visual-qa/v9perf.mjs`). Renderer: ANGLE SwiftShader (Vulkan, software). First frame after "Explore": 1 299 ms. V8 reference, same machine: city HIGH 424 calls / 126 610 triangles / 333 geometries / 28 programs.

| Scenario | Tier | FPS | Frame ms | Draw calls | Triangles | Geometries | Programs |
|---|---|---:|---:|---:|---:|---:|---:|
| City (drive north from spawn) | High | 2.0 | 497 | 424 | 127 616 | 336 | 28 |
| City | Medium | 3.4 | 292 | 413 | 97 776 | 336 | 28 |
| City | Low | 3.5 | 283 | 260 | 45 550 | 332 | 43 |
| Plaza at rest, all furniture intact | High | 6.8 | 147 | 307 | 121 402 | 373 | 48 |
| Plaza | Medium | 4.7 | 213 | 307 | 91 838 | 373 | 48 |
| Plaza | Low | 4.4 | 228 | 151 | 39 470 | 369 | 49 |
| Knock loop, before (plaza, HIGH) | High | 5.4 | — | 307 | 121 402 | 372 | — |
| Knock loop, during (6 props down, camera on the west plaza side) | High | 4.3 | — | 440 | 128 568 | 535 | — |
| Knock loop, settled | High | 3.2 | — | 441 | 128 580 | 535 | — |
| After Reset world (at the spawn, comparable with "city") | High | 3.7 | — | 426 | 127 834 | 535 | — |
| Collider overlay on (debug only) | High | 4.5 | — | 433 | 127 822 | — | — |

Reading: the destructible furniture costs the city scene +1 006 triangles and 0 draw calls at HIGH versus V8 (the nine instanced part meshes replace the nine static ones); knocked-over props add no draw calls (instances only). The geometry counter rises as new objects enter the frame for the first time (lazy GPU upload: plaza signs, buildings, pooled dynamic trees) and does not fall after the reset; the V6 leak script remains the tool for leak checks. The overlay adds ≈ 9 draw calls. In the knock loop 6 of 8 staged impacts landed (4 lamps, 1 planter, 1 bench); the two misses (the bench at 112.5° and the planter at 202.5°) are a staging error of the script — both start points coincide with a boulevard tree trunk, which deflects the car — not a simulation fault; to be corrected in the script in iteration 2. SwiftShader figures are relative only.

## 4. Visual QA

`docs/screenshots/v9/` (HIGH, 1280 × 800, SwiftShader; all from real driving, the photo camera only frames):

| Capture | Shows | Checked |
|---|---|---|
| `01-lamp-intact` → `02-lamp-rattled` → `03-lamp-knocked-follow` → `04-lamp-down` → `05-lamp-restored` | the lamp on the south road's east sidewalk standing, rattling after a nudge, falling in the follow camera, lying across the sidewalk with its light pool out, back after Reset world | 04: post lies flat toward +X, head on the ground, pool gone; 05 matches 01 |
| `06-planter-intact` → `07-planter-shoved` → `08-planter-tipping-follow` → `09-planter-down` | the plaza planter at 22.5° in place, slid toward the plaza, tipping, lying | 07: box displaced along the push, bush still on it; 09: box on its side |
| `10-bench-intact` → `11-bench-flipped-follow` → `12-bench-down` | the plaza bench at 67.5° | 12: bench on its back |
| `13-colliders-plaza` | the debug overlay over the plaza: building boxes, the hub's cylinder, trunk cylinders, lamp cylinders, bench / planter oriented boxes (grey where down), the car's circle | shapes sit on the drawn objects; no oversized box |
| `14-colliders-hangar-open-front`, `15-car-inside-hangar` | the hangar's three wall colliders and the car parked inside after driving through the open front | the former invisible facade is gone |

Observation for V9.2 (from `04`): in car form the folded wings and floats read as side pieces along the flanks; the new brief lists this and it is queued there, not changed here.

## 5. Known limitations after iteration 1

- Bollards, bushes, signposts, light masts and sign posts are catalogued but not yet simulated: they neither collide nor react (COL-02, COL-03, DES-01). Iteration 2.
- Furniture impacts have no particles yet (DES-02).
- Campus Ramp and Skyport Ramp are verified by the drive-through unit tests (same code path as the vehicle), not yet flown in the browser (B8).
- Runway lights are rolled over (COL-06); approach-light piles are not boat colliders (COL-07); a slow hop off the Skyport lip is pulled back by the drive-area clamp (COL-08); four benches overlap a trunk (GEO-01); two lamps stand inside the runway strip (GEO-03).
- The V8 stale-toast P2 is unchanged.
