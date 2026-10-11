# V8.1 · Final integration and quality gate

Branch `integration/v8-editorial-final-qa`. Everything below was re-run on this branch; nothing is carried over from earlier reports as evidence.

## 1. Preflight (as found, before any change)

| Item | Value |
|---|---|
| Main checkout | `~/pau/portfolio-2.0` on `feat/v8-seamless-transformations` at `89140fe`, clean (0 uncommitted files) |
| Editorial worktree | `~/pau/portfolio-editorial` on `editorial/copy-review` at `3a2abbe`, clean |
| Merge-base | `4445ce0` (V8 phase 4: HUD modes, pier prompt, minimap) |
| V8 since the merge-base | `dbb97ae` (shore-foam fix: ground, ocean, vehicle), `89140fe` (phase 5: E2E, captures, perf scripts, docs, report) |
| Editorial since the merge-base | six commits `3a0f8ed` … `3a2abbe`: copy in `profile.ts`, `projects.ts`, `districts.ts`, `archipelago.ts` taglines, `skyport.ts` tagline, `IntroScreen`, `PoiPanel`, `Hud` (badge), `TouchControls` (button names), `ProfileContent` (Education section), `/projects` metadata, `scripts/visual-qa/copycheck.mjs`, `docs/editorial/*` |
| Files changed by both sides | none |
| Running test or server processes | none |
| Dependencies | `pnpm install --offline --frozen-lockfile` satisfied in both worktrees; no dependency added by either branch |

## 2. Integration

Strategy: a three-way merge (`git merge --no-ff`) of `editorial/copy-review` into a branch created at `89140fe`. Chosen because the editorial branch is a descendant of the V8 history (merge-base `4445ce0`) and the two sides touch disjoint files, so the merge preserves both histories without rewriting anything and without cherry-picking. Result: merge commit `7a02479`, no conflicts, working tree clean.

Post-merge checks on `7a02479`: lint 0 problems, typecheck clean, unit tests 222/222.

Obsolete-mechanic scan of every public string (board/parked/moored boat, speedboat, hangar, "transform for flight", pad, disembark, "boats to"): no hit outside geometry keys (`SKYPORT.hangar` is the building's position). The editorial fixes (Skyport sign, island panel, pier taglines) are present on the integrated branch.

## 3. Functional corrections on the integration branch

| id | where | change | why |
|---|---|---|---|
| F1 | `e2e/smoke.spec.ts` "car moves again after closing the panel" | a fixed 1.2 s hold of S followed by a distance check → a condition-based hold (same assertion: moved > 0.5 u; bounded at 10 s) | the fixed delay was one physics step under software rendering (0.44 u measured in the last V8 pass); no assertion removed, no test skipped |

## 4. Regression audit of the vehicle (by code, then by execution in §7)

| Requirement | Where it lives | Checked |
|---|---|---|
| One logical state | `useGameStore.vehicleState` (one field; `setVehicleState` refuses any edge not in `EDGES`, `transformer.ts`) | by reading and by `gameStore.test.ts` ("moves only along the designed edges") |
| One active physics controller | `authorityOf(state)` in `transformer.ts`; `Vehicle.tsx` has exactly one `if (authority === "car") … else if ("boat") … else` branch per frame; `poseOf(state)` reads that model only | by reading and by `vehicleManager.test.ts` ("poseOf reads the physics model that owns the position") |
| Three configurations | `bodyModeOf`: car, boat, plane; parts progress `partsProgress(state, t, duration)` | `transformer.test.ts` |
| Explicit transitions | nine states, `EDGES` table; every store transition in `Vehicle.tsx` goes through `setVehicleState` (flying at the lip, transforming-to-boat on the beach or on splashdown, exiting-water on the beach, landing on touchdown) | grep of `setVehicleState(` in `Vehicle.tsx` (lines 287, 306, 374, 406, 415) |
| Position and velocity transfer | `launchPose` (lip), `boatVelocityFromCar` (beach entry, splashdown), `carSpeedFromBoat` (beach exit), airspeed → ground speed capped at 20 on touchdown | `transformer.test.ts` ("hand-over maths"), E2E state sequences in §7 |
| Recovery | `resetActiveVehicle` (nearest recovery point, every sequence cancelled), stuck-hull nudge, shore push, altitude floor; HUD notices for refused takeoffs | `resetVehicle.test.ts`, E2E guards |
| Articulated transformation, not a model swap | one mesh in `Vehicle.tsx`: car body static batch + 30 dynamic parts (wings on hinge groups at the belt line, side panels, stabiliser, twin fins, thruster, nav lights, two float groups hinged on the sills, keel-plate group, stern jet group); wheels tuck via group `position.y`; all driven from one eased progress (`partsProgress` × `transformStages`); reversible (`transforming-to-car`, `exiting-water` play the same progress backwards, continuing from where the parts are: `VehicleController.stepTransform`) | by reading; frames `04-wings-deploying`, `14-hull-deploying`, `19-wheels-down` in §8 |
| Interruptions | a running sequence can only be completed or reversed (`EDGES`); abort folds the wings from their current angle (`t0 = duration · (1 − wings)`); panels/menu stop the authority's integration and the clocks | `transformer.test.ts`, E2E guards (menu mid-flight) |

## 5. Editorial audit after the merge

Scan of every public string for the removed mechanics (board a parked boat, pick the boat up at the harbor, press E in a hangar / on the pad, mandatory Skyport, switching between three separate vehicles): no occurrence. The editorial corrections are present on the integrated branch: Skyport sign "Runway · launch ramp · landing strip", island panel ("Reachable only by sea: drive into the water off any beach and the car becomes a boat" / "No beach to drive out on: cast off and sail back to the city"), pier taglines "Pier and moorings" / "Moorings at the aerial district", intro line "Speed up a ramp to fly; drive into the sea off a beach to sail.", HUD legends per state, badge "Transforming" while parts move, touch names per body. Metadata, Open Graph and the preview alt derive from `profile`/`site.ts` and read the corrected summary. The site is English-only; Spanish exists in the CV only.

## 6. Professional content

Checked against the two CV PDFs (text extracted during the editorial loop) and the sprint-02 content audit:

| Claim on the site | Source | Status |
|---|---|---|
| Full Stack Product Engineer, Madrid; takes B2B products from definition to production, works directly with clients | CV-EN/ES professional profile | matches |
| Performanze, Jan 2026 – now: DUPLEX (technical lead, SAT module; elevator technicians; RAG with embeddings and a vector database; client meetings and live demos) and OVI (Microsoft 365 from a chat; Graph and Gamma; short- and long-term memory, semantic retrieval) | CV-EN/ES bullets | matches; no metric, customer or production claim |
| Telefónica Tech, 2025 – 2026: TrustOS, frontend and backend, REST APIs with OpenAPI, providers PrivadoID / Procivis / Idenfy, QR flows | CV-EN/ES | matches |
| BROKI, independent, 2026: airport ground operations platform replacing a legacy dashboard and automation stack, parity audits and runbooks | CV ("end to end") + the BROKI checkout audited in `docs/content-audit.md` | matches; no airport name, records or URLs |
| Education apart from experience: 4Geeks AI Engineering programme (in progress), 42 Madrid (Fundación Telefónica), ASIR (ITEP) | CV Education section; `profile.education` rendered in its own section | matches |
| 4Geeks labs: template vs student work, "author-run" checks, nothing deployed or certified | `docs/education/4geeks-content-audit.md`, `fourgeeks.ts` status notes | attribution explicit |

CV links: `profile.cv.es/en.available = false`; `CvLinks` renders nothing when no CV is available (no link, so no broken link); there is no `public/cv/` directory and nothing was copied. **USER INPUT REQUIRED:** publish the PDFs (they exist in the previous portfolio's `public/`) and flip the flags, or leave them off.

## 7. Validation on the integrated build

| Check | Result |
|---|---|
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm typecheck` | clean |
| `pnpm test` | 222/222 unit tests (40 files) |
| `pnpm build` | compiled, 18 routes |
| `pnpm test:e2e`, pass 1 | **18/18** in 7.5 min (desktop: campus 2, context loss 1, dialog 2, smoke 4, transformer 3, trees 2; mobile 4) |
| `pnpm test:e2e`, pass 2 (consecutive, same build, no change in between) | **18/18** in 5.9 min |

### E2E stability, the two failures of the last V8 pass

| Test | Error then | Cause | Fix on this branch |
|---|---|---|---|
| smoke › "car moves again after closing the panel" | moved 0.44 u, expected > 0.5 u | a fixed 1.2 s hold of S: under SwiftShader at ~1 fps that is one physics step (`dt` clamped), so the distance covered is a property of the frame rate, not of the mechanic | condition-based hold (`holdKeyUntil` until the car has moved > 0.5 u, bounded at 10 s); same assertion |
| transformer › guards "left the lip" | max height 3.3 m, expected > 5 m | an 8 s wall-clock budget for the whole run-up and hop: under load the car was still climbing when the budget ran out, so the apex was never sampled | the loop ends on the observable state (landed past the lip as a car) with a 40 s safety net, W released on position (z > 50), not on time |

Why the mechanics themselves are not frame-rate dependent: every physics model sub-steps at ≤ 1/30 s and clamps large frames (`stepCar`, `stepBoat`, `stepPlane`; unit-tested for frame-rate independence), and the transformation clocks advance by wall time capped at 0.4 s per frame. No test uses `waitForTimeout` as a correctness condition for a mechanic any more; the remaining fixed waits are settle delays before screenshots and the deliberate "the car does not move while a panel is open" check (which only gets easier when slow). Scenarios are isolated: each test starts from `startGame` in a fresh page; WebGL context loss has its own test and did not occur in either pass (no `pageerror` collected by `collectErrors`).

## 8. Visual QA on the integrated build

All 39 frames under `docs/screenshots/v8/` and the 18 editorial screens under `docs/editorial/screens/` were re-captured on the integrated build after both E2E passes (file timestamps follow the merge; the earlier V8 captures were overwritten). Checked by eye:

| Frame | Tier | What it shows | Verdict |
|---|---|---|---|
| `01`–`03` ramp structure, approach, car at the ramp | HIGH | deck plates, rails, legs, chevrons, sign "WEST CITY RAMP · Takeoff · ≥ 40 km/h", lip bar | ok, structure reads, no clipping |
| `04` wings deploying | HIGH | 65 km/h on the approach, badge "Transforming", wings hinging out | ok |
| `05` lip launch | HIGH, MEDIUM, LOW, mobile | wings out over the lip, "Airborne" | ok at every tier; on the phone the deck plates and the aircraft are clear in portrait |
| `06`–`08` climb, bank, city from the air | HIGH, MEDIUM, LOW | flight profile, city districts and trees under the aircraft | ok |
| `09`–`11` approach, touchdown, roll-out | HIGH | descent over the south turf, roll-out among the garden trees with the wings folding, car again | ok; trees are the V4 destructible ones and react to the rolling car |
| `12`–`13` beach structure, car on the sand | HIGH, MEDIUM, LOW | sand strip, waterline, car on dry sand | ok; the foam band follows the sand (the earlier rectangle is gone) |
| `14`–`18` hull deploying, afloat, wake, hull side and rear | HIGH, MEDIUM, LOW, mobile | floats down on their hinge arms, keel plate, stern jet, wake | ok; parts are visibly the car's, not a swapped model |
| `19`–`21` wheels down, back on land, East Beach aerial | HIGH, MEDIUM, LOW, mobile | hull coming ashore on East Beach, wheels coming down, car driving off | ok |
| Editorial screens (intro, projects, DUPLEX, OVI, contact, 4Geeks, menu, hub panel, HUD) | 1280 and 390 px | corrected copy, Education section, badge, touch names | ok, no element with overflowing text (18/18) |

Found (cosmetic): in `19-wheels-down` an old "Tree shaken" impact toast reappears when the body changes back to car, because the HUD re-mounts the toast element on body change and the stored impact is never cleared. P2; no change made to the validated build. Proposal: clear `lastImpact` on vehicle-state transitions or render it only within a few seconds of its timestamp.

No camera cut, geometry gap or part overlap was seen at any tier; LOW keeps every mechanic and transformation visible with shadows and lamp pools off.

## 9. Performance on the integrated build (SwiftShader, relative only)

Re-measured on the integrated build (`perf/perf-v8.json`, label `v8.1`, `scripts/visual-qa/v8perf.mjs`). Renderer: ANGLE SwiftShader (Vulkan, software). First frame after "Explore": 1 394 ms. V7 reference, same machine, same day: city HIGH 402 calls / 122 341 triangles / 317 geometries / 27 programs (`docs/qa/v7-flight-validation.md`).

| Scenario | Tier | Build | FPS | Frame ms | Draw calls | Triangles | Geometries | Textures | Programs |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| City (drive north from spawn) | High | V8 | 2.5 | 407 | 418 | 126 300 | 336 | 27 | 28 |
| City (drive north from spawn) | Medium | V8 | 2.1 | 468.6 | 422 | 96 828 | 336 | 27 | 28 |
| City (drive north from spawn) | Low | V8 | 3.2 | 316.8 | 259 | 45 548 | 332 | 25 | 43 |
| West City Ramp from its entry | High | V8 | 10.3 | 97.1 | 288 | 116 334 | 369 | 28 | 48 |
| West City Ramp from its entry | Medium | V8 | 3.8 | 263.5 | 288 | 86 770 | 369 | 28 | 48 |
| West City Ramp from its entry | Low | V8 | 4.1 | 246 | 133 | 35 610 | 365 | 26 | 49 |
| Hull afloat off South Beach | High | V8 | 7 | 142.2 | 514 | 133 630 | 418 | 31 | 49 |
| Hull afloat off South Beach | Medium | V8 | 3.5 | 283.1 | 517 | 104 536 | 418 | 31 | 49 |
| Hull afloat off South Beach | Low | V8 | 3.6 | 277.9 | 363 | 53 856 | 413 | 29 | 49 |
| Flight over the city (42 u) | High | V8 | 4.2 | 239.7 | 458 | 130 734 | 479 | 35 | 49 |
| Flight over the city (42 u) | Medium | V8 | 5.3 | 189.9 | 432 | 97 912 | 479 | 35 | 49 |
| Flight over the city (42 u) | Low | V8 | 7.2 | 138.3 | 225 | 42 588 | 463 | 33 | 49 |

- **Structural cost of V8 from the spawn (HIGH): +16 draw calls, 3 959 triangles, +19 geometries, +1 program** over V7: the three ramp structures (one static batch each plus their emissive strips and lip bars), the three beach strips, the marine parts on the car (dynamic, outside the static batch). The parked speedboat and its harbor boarding are gone, which gives some of that back.
- **FPS is noise-dominated in software** (the V7 A/B on this machine showed a 2× spread between identical runs); read the counters. The city scenario ran at 2.5 fps this time against 1.0–1.9 for V7 earlier today.
- **The hull off South Beach facing the city** is the heaviest view (514 calls at HIGH): the whole city skyline, its trees, the sea and the beach strip are in the frustum. LOW drops it to 363 calls.
- **Flight over the city** stays within V7's range (458 calls at HIGH, V7: 516).
- Ramp → flight → splashdown → beach-exit loop, counters before and after: geometries +9, textures +1, programs +1 (first-time uploads of the marine parts' material variants and the beach foam); the draw-call and triangle deltas (+212 / 16 900) are a change of viewpoint (the loop ends on the beach facing the city, it started at the ramp facing the sea), not growth. A second identical loop was NOT MEASURED; "no known leak" rests on the quality-cycle test below.
- Nine quality cycles while afloat: geometries -16, textures +0, programs +0, still afloat afterwards.
- No LOD was added for the ramps or the beaches; both are small static batches. The altitude floor keeps the aircraft over the roofs so the far camera's cost is bounded as in V7.

## 10. Independent critical review

**Senior engineer.** State: one field, one authority, no duplicate position owner (§4). Colliders: the car uses buildings + drive rectangles + trees + ramp bodies; the hull uses coast polygons with beach gaps + piers + the shore push; the aircraft uses the landing rules (floor over everything not landable). Found: (1) the three live physics states (`liveCar`, `liveBoat`, `livePlane`) still exist as separate objects; only one is live at a time and the others are overwritten at hand-over, which is documented, but a future reader could mutate a frozen one; a single tagged union would make the invariant structural (proposal, not a defect). (2) Phase commits 1–3 of V8 do not typecheck alone (consumers updated in phase 4); documented in the V8 report, history not rewritten on purpose. (3) No new dependency on either branch. (4) Physics is frame-rate independent by unit test; the only time-based behaviour is the transformation clocks (wall time, capped per frame), intended.

**Game designer.** The ramps read as events: a sign with the speed to beat, chevrons, the lip bar, the wings coming out at 40 km/h while still driving, the lip at 50 km/h (frames 02–05). The failure modes are legible (a hop, "Too slow to take off", the wings folding back). Returning to the ground is intuitive in two ways: descend over any open ground (the HUD says "Landing zone detected") or over the sea (the hull comes out). Found: the first flight has no destination cue; the minimap shows the ramps and beaches, but nothing says "the city turf is a runway too" until the landing-zone banner appears. Proposal for later: a one-time hint on the first flight.

**UX designer.** Driving, sailing and flying use the same four actions plus brake; the HUD legend names the keys per body, the badge names the body (or "Transforming"), touch buttons are named per body for screen readers. Reset is one key or one button and says where it goes. Found: on phones the legend is hidden by design, so the ramp/beach hint lives only in the intro line; acceptable, documented in the editorial audit.

**Technical recruiter.** The first screen says who Pau is, what he builds and for whom, then three cards each naming the system that proves it; experience and education are separate lists; each project page has the problem, the mechanism, the decisions with trade-offs, the technologies and an explicit boundary of what is not disclosed. No metric or customer is claimed. Found: TrustOS has a single decision because the CV gives no more; the CV links are absent until the owner publishes the PDFs.

No P0 or P1 found in this review; the items above are proposals.

## 11. Limitations, risks and decisions

- SwiftShader only: every measurement and every capture is software rendering; hardware FPS was not measured and is not claimed.
- Two full E2E passes green consecutively on this build; earlier single-pass failures were timing checks, now condition-based. Stability on a loaded machine beyond two passes is not claimed.
- V8 phase commits 1–3 do not typecheck alone (documented; history intentionally untouched).
- Not done, out of scope for this close: sand particles and traction change on sand, audio, a second Skyport transformation surface, hardware feel.
- **USER INPUT REQUIRED:** publish the CV PDFs (flags `profile.cv.*.available`), decide whether to keep the three-vehicle history commits as is or squash before publishing, and whether a Spanish UI is wanted.
- Not pushed, not merged to main, not deployed; worktrees and branches left in place.

## 12. Acceptance

| Criterion | Status | Evidence |
|---|---|---|
| Integration branch from `89140fe`, editorial merged without rewriting history | PASS | merge commit `7a02479`, no conflicts (§2) |
| One logical state, one authority, three bodies, explicit transitions, velocity transfer, recovery | PASS | §4 (code) and the three transformer E2E tests in both passes (§7) |
| Ramp: real slope, wings on the move, launch, controllable flight, landing on valid ground, car again | PASS | E2E ramp loop ×2, frames 01–11 |
| Beach: sand, hull out, floats, buoyancy, sailing, exit at another beach, wheels down, driving on | PASS | E2E beach loop ×2, frames 12–21 |
| Articulated, reversible transformation (not a model swap) | PASS | §4, frames 04, 14, 19; `transformer.test.ts` |
| No obsolete mechanic in any public text | PASS | §5 scan |
| Professional content matches the CVs and earlier audits; academic work attributed | PASS | §6 |
| CV links: flag off, no broken link, PDFs not copied | PASS (decision pending) | §6; USER INPUT REQUIRED |
| Two consecutive full E2E passes 18/18 | PASS | §7: 18/18 and 18/18 on the same build |
| Fragile tests fixed without large timeouts, skips or removed assertions | PASS | §7 (F1 and the guard's state-based budget) |
| Visual QA on the integrated build at HIGH/MEDIUM/LOW and mobile | PASS | §8 (one P2 cosmetic noted) |
| Performance measured and compared with V7 | PASS (SwiftShader only) | §9; hardware NOT VERIFIED |
| lint, typecheck, unit tests, build | PASS | §7 |
| Git tree clean at the end, nothing pushed, merged or deployed | PASS | final `git status` below |
| Hardware feel and frame rate | NOT VERIFIED | no GPU in this environment |
| Sand particles, traction on sand, audio | NOT DONE (out of scope for the close) | §11 |

Final SHA: the commit that adds this report ("v8.1: final integration and quality gate") on `integration/v8-editorial-final-qa`; `git status` clean at that commit.

