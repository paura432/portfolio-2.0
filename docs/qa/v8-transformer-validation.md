# V8 · Transformer-X validation

Branch `feat/v8-seamless-transformations`. Baseline `b06559c` (V7 final: lint, typecheck, 193 unit tests, build, V7 flight E2E all green before any change; V6 and V7 verified present in the code, not assumed). Final SHA at the end of this document.

## 1. What was built

| Phase | Commit | Content |
|---|---|---|
| 0 | — | Audit: branches, V6 + V7 found and green, probe API, physics, colliders, coast and ocean read before design |
| 1 | `10c78a6` | Beach and ramp data, the ground height field, the transformer rule set (state machine, authority, ramp and shore rules with hysteresis, hand-over maths), ramp bodies and beach gaps in the colliders, coastline bays |
| 2 | `3afeb04` | The single vehicle: store state machine, vehicle manager and live vehicle, `Vehicle.tsx` (car + AERO-X + marine parts, three physics branches, the rules), controller, sensor, camera, landing rules, reset |
| 3 | `6c4a714`, fix `dbb97ae` | Ramp structures, beach terrain strips, trees and furniture kept out of corridors and sand |
| 4 | `4445ce0` | HUD modes and legends, pier prompt, minimap with ramps and beaches, probe |
| 5 | see §6 | Unit tests, E2E, captures, perf scenarios, docs, this report |

## 2. Automated checks

| Check | Result |
|---|---|
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm typecheck` | clean |
| `pnpm test` | 222 unit tests (193 in V7 + 29 new): transformer state machine (edges, authority, durations), ramp rule (prepare / deploy / abort / launch / hop / lockout), shore rule (both thresholds, direction, reversal, lockout), hand-over maths (launch pose, hop, car ⇄ hull velocity, parts progress), beaches (monotonic slopes, local frames, rectangles, no overlap), ramps (profile, lip angle, corridor, no road / building / beach crossing), ground field (ramps as terrain, beach bands, platform rim), landing rules (landable, splashdown, floor, look-ahead), ramp bodies (climb passes, side and end face block), coastline bays (simple polygons, corners on the coast, piers intact), recovery points, free ground (no trees in corridors or on sand), store (edges only, roll-out, E per body, docking guards, reset, pause), vehicle manager (modes, control, docking, poseOf by authority), plus the V3–V7 suites that still apply |
| `pnpm build` | 18 routes, unchanged |
| `e2e/transformer.spec.ts` (desktop, SwiftShader) | 3/3: ramp loop (31 s), beach loop (27 s), guards (18 s), each green in its latest run; the final full pass is in §6 |
| Existing E2E suites (campus, context loss, dialog, smoke, trees, mobile) | see §6 |

### The E2E, step by step (teleports only stage the car; every transformation comes from driving)

**Ramp loop.** 1. Car staged 8 u before the West City Ramp's corridor, facing it. 2. W held: the states seen are exactly `car → preparing-flight → transforming-to-plane → flying`; at the launch the authority is the flight model, y > 4, speed ≥ 14 u/s, the badge says Flight and the minimap is in air mode. 3. Keyboard flight: south over the sea to 28 u, a wide left turn east and north, a final west along z = 50 held level at 16 u until over the island's east edge. 4. S held: touchdown on the south turf (authority car, x < 62), state `landing` / `transforming-to-car` / `car`. 5. Space to a stop: the state is `car` on its own, the badge says Car; S drives the car backwards.

**Beach loop.** 1. Car staged on the south ring road facing South Beach. 2. W held: `car → transforming-to-boat → floating`, z > 70 (past the enter depth), speed > 5, badge Boat, minimap sea. 3. Sail (W + A/D steering from the probe) south, east round the corner, north to x = 100 off East Beach. 4. W + steering toward the sand: `floating → exiting-water → car`, x < 70 inside East Beach's band, badge Car, minimap city.

**Guards.** A short push of W half-way up the slope: the body rises over the lip (y > 5), never becomes an aircraft, lands past the lip as a car. A car stopped on wet sand (between the exit and enter depths) stays a car with the beach named. Airborne: the menu freezes the aircraft in place, Escape resumes it, Reset lands the car at the nearest recovery point (the top of South Beach). Quality cycled high → medium → low while afloat keeps the hull afloat.

## 3. Acceptance criteria

PASS = verified by a test or a capture in this branch; PARTIAL = verified in part; NOT VERIFIED = not verified.

| Criterion | Status | Evidence |
|---|---|---|
| One vehicle, one state machine, one authority | PASS (nine states, edges enforced by the store; `authorityOf`; `poseOf` reads the authority) | `transformer.test.ts`, `gameStore.test.ts`, `vehicleManager.test.ts` |
| Transformable model, not a swap | PASS (one mesh: car body, AERO-X parts, floats / keel / jet; staged, eased, FPS-independent progress; reversible) | `04-wings-deploying`, `14-hull-deploying`, `19-wheels-down` captures; `transformer.test.ts` parts progress |
| Ramps are real terrain, three locations, access by road, signage, lights, colliders | PASS (height field + ramp bodies; West City, Campus, Skyport; the hub location replaced and documented) | `ground.test.ts`, `rampColliders.test.ts`, `ramps.test.ts`, `01-ramp-structure` |
| Takeoff from a ramp with deployment before the lip, no teleport, no arbitrary impulse | PASS (E2E states in order on the move; launch pose = own speed + lip slope) | E2E ramp loop, `05-lip-launch` |
| Too slow / wrong way: no fake flight | PASS (hop guard E2E; alignment unit test) | E2E guards, `transformer.test.ts` |
| Arcade flight | PASS (V7 model unchanged, its unit tests still pass) | `planePhysics.test.ts` |
| Landing on flat clear ground, not on buildings, not through terrain, back to car | PASS (landing rules; E2E touchdown on the south turf, roll-out, fold) | `landing.test.ts`, E2E ramp loop, `10-touchdown`, `11-rolled-out-car` |
| Beach entry → boat with depth sampling, not by material | PASS (`terrainClassAt` from the height field; E2E) | `ground.test.ts`, E2E beach loop, `14`–`16` captures |
| Exit at a different beach, no teleport, no sudden stop | PASS (E2E: in at South Beach, out at East Beach, speed carried over) | E2E beach loop, `19`–`20` captures |
| Hysteresis: no flapping, reversible sequences, no two at once | PASS (two depths, direction, lockout, reversal-only unit tests; wet-sand E2E guard) | `transformer.test.ts`, E2E guards |
| Colliders per body, no crossing buildings mid-transformation | PASS for the cases tested (car: buildings, trees, drive areas, ramp bodies; hull: coasts with beach gaps, piers, shore push; aircraft: altitude floor over buildings) | `rampColliders.test.ts`, `seaObstacles.test.ts`, `landing.test.ts` |
| Camera per body with interpolation, no cuts | PASS in captures (feel on real hardware NOT VERIFIED) | `05`, `10`, `14`, `19` captures |
| HUD shows the mode and the controls per mode; touch unchanged | PASS (badge, legend, banners; the four hold buttons + brake drive every body) | captures, `mobile-high-*` |
| Minimap evolves (ramps, beaches, air / sea / city) | PASS | captures |
| Existing mechanics intact | PASS for what the suites cover (districts, labs, trees, dialogs, context loss, mobile, piers) | §6 |
| Performance measured | PASS (SwiftShader, relative) | §4 |
| Captures | PASS | `docs/screenshots/v8/` |
| No locked states, reset recovers | PASS for the cases tested (menu mid-flight, reset mid-flight, quality cycles afloat, slow lip) | E2E guards |
| Audio | NOT DONE (optional in the brief) | — |
| Sand particles on the beach | NOT DONE (the brief's "pequeñas partículas de arena"; the V4 dust system fires on turf, not on sand) | §5 |

## 4. Performance (SwiftShader, relative only — never a statement about real GPUs)

Filled from `docs/screenshots/v8/perf/perf-v8.json` (`scripts/visual-qa/v8perf.mjs`). Renderer: ANGLE SwiftShader (Vulkan, software). First frame after "Explore": 2 614 ms. V7 reference, same machine, same day: city HIGH 402 calls / 122 341 triangles / 317 geometries / 27 programs (`docs/qa/v7-flight-validation.md`).

| Scenario | Tier | Build | FPS | Frame ms | Draw calls | Triangles | Geometries | Textures | Programs |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| City (drive north from spawn) | High | V8 | 0.8 | 1222 | 424 | 126 610 | 333 | 27 | 28 |
| City (drive north from spawn) | Medium | V8 | 0.5 | 1888 | 424 | 97 046 | 333 | 27 | 28 |
| City (drive north from spawn) | Low | V8 | 0.9 | 1122 | 270 | 46 318 | 330 | 25 | 43 |
| West City Ramp from its entry | High | V8 | 3.9 | 257.5 | 288 | 116 334 | 367 | 28 | 48 |
| West City Ramp from its entry | Medium | V8 | 4.6 | 216.2 | 288 | 86 770 | 367 | 28 | 48 |
| West City Ramp from its entry | Low | V8 | 3.7 | 267.7 | 133 | 35 610 | 363 | 26 | 49 |
| Hull afloat off South Beach | High | V8 | 3.1 | 321.3 | 517 | 134 100 | 417 | 31 | 49 |
| Hull afloat off South Beach | Medium | V8 | 2.7 | 369.2 | 518 | 105 016 | 418 | 31 | 49 |
| Hull afloat off South Beach | Low | V8 | 1.1 | 891.4 | 363 | 53 856 | 413 | 29 | 49 |
| Flight over the city (42 u) | High | V8 | 1 | 1012.6 | 561 | 138 320 | 477 | 35 | 49 |
| Flight over the city (42 u) | Medium | V8 | 3.9 | 257.7 | 461 | 101 284 | 478 | 35 | 49 |
| Flight over the city (42 u) | Low | V8 | 6.9 | 144.1 | 188 | 40 598 | 463 | 33 | 49 |

- **Structural cost of V8 from the spawn (HIGH): +22 draw calls, 4 269 triangles, +16 geometries, +1 program** over V7: the three ramp structures (one static batch each plus their emissive strips and lip bars), the three beach strips, the marine parts on the car (dynamic, outside the static batch). The parked speedboat and its harbor boarding are gone, which gives some of that back.
- **FPS is noise-dominated in software** (the V7 A/B on this machine showed a 2× spread between identical runs); read the counters. The city scenario ran at 0.8 fps this time against 1.0–1.9 for V7 earlier today.
- **The hull off South Beach facing the city** is the heaviest view (517 calls at HIGH): the whole city skyline, its trees, the sea and the beach strip are in the frustum. LOW drops it to 363 calls.
- **Flight over the city** stays within V7's range (561 calls at HIGH, V7: 516).
- Ramp → flight → splashdown → beach-exit loop, counters before and after: geometries +9, textures +1, programs +1 (first-time uploads of the marine parts' material variants and the beach foam); the draw-call and triangle deltas (+212 / 16 864) are a change of viewpoint (the loop ends on the beach facing the city, it started at the ramp facing the sea), not growth. A second identical loop was NOT MEASURED; "no known leak" rests on the quality-cycle test below.
- Nine quality cycles while afloat: geometries -16, textures +0, programs +0, still afloat afterwards.
- No LOD was added for the ramps or the beaches; both are small static batches. The altitude floor keeps the aircraft over the roofs so the far camera's cost is bounded as in V7.

## 5. Pending risks and known limits

- **Feel on real hardware NOT VERIFIED.** Every ramp run, flight, splashdown and beach crossing in this branch happened under SwiftShader at 1–7 fps. The three models are sub-stepped and frame-rate independent (unit-tested), so the trajectories are the same at 60 fps; the hand feel of the lip, the roll-out and the sea entry was judged from captures.
- **Sand particles and traction change on sand NOT DONE.** The brief asks for small sand particles and a lighter traction on the beach; the V4 dust system fires on turf only and the car's grip model has no surface factor. The terrain classes (sand, wet sand) exist, so both are a short follow-up on `surfaceAt` / `driveFx`.
- **Audio NOT DONE** (optional in the brief).
- **Flight keys kept from V7** (W/S pitch, Space brake) instead of the brief's Space-to-climb proposal; the resolution is documented in `docs/gameplay/v8-flight-and-sea.md`.
- **The hub ramp is on the west turf**, not beside the Central Hub: no 45 u straight near the hub avoids a road or a building (`ramps.test.ts` enforces the no-crossing rule for every corridor).
- **Touchdown with any attitude** (arcade rule from V7): no crash state; a steep arrival shows the body pitch catching up over the roll-out.
- **Transformation banners under SwiftShader** are captured at whatever instant the slow screenshot lands; the staged timeline is verified by unit tests (`partsProgress`, `transformStages`) rather than by frame-exact captures.
- **Counters:** +22 draw calls over V7 from the spawn (ramps, beach strips, marine parts). No LOD on the ramps or beaches.
- **Three fixed-time E2E checks of older suites are marginal under SwiftShader** (campus/smoke "keeps driving", trees, mobile; see the V7 report); the V8 E2E uses state-based waits only.
- **Playwright trace artefacts** from failed intermediate runs remain in `test-results/` locally (ignored by git).

## 6. Final verification

| Check | Result |
|---|---|
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm typecheck` | clean |
| `pnpm test` | 222/222 |
| `pnpm build` | 18 routes, unchanged |
| Phase commits on their own | `4445ce0` (phase 4) and `dbb97ae` (fix) typecheck clean when checked out alone; `10c78a6`, `3afeb04`, `6c4a714` do not (2 / 23 / 22 errors): the HUD, prompt, minimap and probe consumers of the new store were updated in phase 4, so the sequence compiles from phase 4 onward. Kept as is because the editorial branch already builds on these SHAs; a squash of phases 1–4 would restore per-commit integrity if the history is rewritten before publishing. Unit tests at `10c78a6`: 230/230 (the pure modules). |
| Full Playwright suite (desktop + mobile, 18 tests: campus, context loss, dialog, smoke, trees, mobile, transformer) | 16/18 in one pass (7.8 min, machine loaded by other sessions): the two failures were the V5-era smoke "keeps driving" fixed-time check (0.44 u in its 1.2 s budget, documented as marginal since V7) and the hop guard, whose 8 s wall budget ran out while the car was still climbing under load (it sampled 3.3 m on the slope). The guard's budget was made state-based (40 s safety net); rerun of both: 2/2. Every one of the 18 tests is green in its latest run; **no single pass had all 18 green at once** on this software renderer. |

### Capture set (`docs/screenshots/v8/`, real renders of this build, SwiftShader)

`high-01-ramp-structure` · `02-ramp-approach` · `03-car-at-ramp` · `04-wings-deploying` · `05-lip-launch` · `06-climb` · `07-banking` · `08-flight-over-city` · `09-approach` · `10-touchdown` · `11-rolled-out-car` · `12-beach-structure` · `13-car-on-sand` · `14-hull-deploying` · `15-afloat` · `16-sailing-wake` · `17-hull-side` · `18-hull-rear` · `19-wheels-down` · `20-back-on-land` · `21-east-beach-aerial`; `medium-` and `low-` for 01, 05, 08, 12, 15, 20; `mobile-high-` for 03, 05, 08, 13, 15, 20; `*-stats.json` with the renderer counters and the vehicle state at each shot; `perf/perf-v8.json`.

Before/after: V7's `docs/screenshots/v7/high-07-plane-ready-three-quarter` (wings out on the pad after pressing E) against `high-04-wings-deploying` (wings out at 65 km/h on the ramp approach); V6's `high-09-boat-active` (the separate speedboat) against `high-15-afloat` (the car afloat on its floats).

Final SHA: the commit that adds this file (v8 phase 5) on `feat/v8-seamless-transformations`; not merged, not pushed, not deployed.
