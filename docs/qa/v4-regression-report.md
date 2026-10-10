# V4 regression report — destructible & reactive world

Branch `feat/v4-destructible-reactive-world`, base `feat/world-art-direction-v3` @ `9f82fab`. Same renderer for every number below: Chromium headless + SwiftShader (software), 1280×800, DPR 1, production build. **Hardware GPU and physical phones: NOT VERIFIED.**

## 1. Checks

| Suite | V3 base (9f82fab) | V4 |
|---|---|---|
| `pnpm lint` | 0 / 0 | 0 / 0 |
| `pnpm typecheck` | clean | clean |
| `pnpm test` (Vitest) | 61 / 61 | 100 / 100 (18 files) |
| `pnpm build` | 13 routes | 13 routes |
| `pnpm test:e2e` (desktop + Pixel 7) | 10 / 10 | 12 / 12 (2 new in `trees.spec.ts`) |

New unit suites: `trees.test.ts` (identity, prefix per tier, grid vs brute force), `treeWorld.test.ts` (soft / medium / strong impacts from real `stepCar` driving, speed retention, no duplicate impacts, neighbours untouched, reverse hits, fall curve with bounce and rest angle, 30/60/144 fps identical, reduced motion, slide, fallen → respawn by time + distance, manual reset with the car on top, maxDynamic, maxFallen, tier prefix keeps state, no allocation per impact, buildings still block), `treeRig.test.ts` (standing placement = V3, stump + upper = trunk, pivot at base / break point, slide, regrow scale, hidden matrix), `fx/particles.test.ts` (capacity, recycling, lifetime, floor, determinism), `fx/driving.test.ts` (surface classes, dust only on turf while moving, skid only on asphalt when hard, hard-brake rule).

New E2E (`e2e/trees.spec.ts`): the car is placed on the road and the **W key is held** until the tree reacts — no state is injected. Checks: snapped trunk at ≥ 13 u/s, fall direction, car keeps moving, toast + Reset world enabled, angle grows then rests, neighbours standing, pixel difference intact vs fallen > 4 (mean 0–255 over a 680×460 clip) and fallen vs fallen-after-tier-cycles < 3, High → Medium → Low → High keep phase/angle/broken, Reset world regrows (pixel difference restored vs intact < 3), slow nudge only shakes; second test: medium hit topples without snapping, Reset car leaves it down, the Central Hub still blocks.

## 2. Captures (`docs/screenshots/v4/`)

| Folder | Content |
|---|---|
| `baseline/` | V3 FPS probe output at the start of the sprint |
| `sequence/` | soft / medium / strong impacts from a fixed side camera: intact, impact, falling (several angles with `--slow`), fallen, respawning, restored; LOW tier and reduced-motion variants; `video/` holds the strong sequence as webm |
| `driving/` | hard brake (skid + brake lights), skid marks close-up, fast turn, off-road dust, canopy sway pair |
| `after/` | the 18-shot V3 camera set re-captured on V4 (lighting lift, contact blobs, entrance pools, HIGH / MEDIUM / LOW, mobile) — compare with `docs/screenshots/v3/after/` |
| `mobile/` | impact on a phone viewport with the follow camera |

Verdicts are in section 5.

## 3. Performance (SwiftShader, relative only)

Baseline at the start of the sprint (`baseline/v3-fps-start-of-sprint.json`) and the V3 ↔ V4 comparison (`baseline/perf-v3-reference.json`, `perf-v4.json`) were taken with `scripts/visual-qa/v4perf.mjs`, sequentially on the same machine, V3 from a worktree build of `9f82fab`. **SwiftShader frame rates vary a lot between runs** (the same V3 build measured 1.2, 1.9 and 3.7 fps at HIGH across this session), so read the structural counters, not the FPS delta.

### Scenario 1 — world without impacts (driving north from the spawn, 4 s)

| Tier | Build | FPS | Frame ms | Draw calls | Triangles | Geometries | Textures | Programs |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| High | V3 | 1.9 | 540 | 276 | 47 938 | 201 | 18 | 20 |
| High | V4 | 4.2 | 238 | 267 | 49 144 | 213 | 18 | 23 |
| Medium | V3 | 1.2 | 807 | 279 | 46 838 | 201 | 18 | 20 |
| Medium | V4 | 4.2 | 236 | 266 | 46 676 | 213 | 18 | 23 |
| Low | V3 | 2.9 | 345 | 166 | 22 654 | 200 | 16 | 31 |
| Low | V4 | 4.0 | 252 | 160 | 23 410 | 210 | 16 | 36 |

V4 adds ≈ 1 200 triangles at HIGH (+2.5 %: contact blobs, entrance pools, lift cab, trolley), 12 geometries (tree/particle/skid geometries, pooled meshes) and 3 shader programs (canopy sway variant, tinted canopies, dust). Draw calls went *down* by 9 at HIGH because the five tree meshes now share geometries and the blobs are instanced. First frame after "Explore": 1.04 s (V3) vs 1.00 s (V4).

### Scenarios 2–5 (V4 only; V3 has no destructible trees)

| Scenario | FPS | Frame ms | Draw calls | Triangles | Geometries | Programs | Dynamic trees | Fallen | Particles |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 · one tree falling (2.5 s during the fall) | 5.6 | 179 | 194 | 43 268 | 217 | 41 | 1 | 1 | 41 |
| 3 · several trees (5 approaches, tree clock ×0.25) | 4.2 | 241 | 215 | 43 614 | 224 | 41 | 4 | 1 | 42 |
| 4 · prolonged driving (34 s, 10 turns, measured at the end) | 11.5 | 87 | 160 | 39 882 | 224 | 41 | 0 | 2 | 0 |
| 5 · six knock-down + reset cycles (after) | — | — | 286 | 50 874 | 224 | 41 | 0 | 0 | 0 |

- Programs rise from 23 to 41 the first time particles, dynamic trees and shadows of those meshes compile (shader variants), then stay flat: **0 growth** in geometries, textures or programs across the 34 s drive and across six restore cycles. Dynamic trees and particles return to 0 after each reset.
- Peak observed: 4 trees animating + 1 fallen + 42 particles ≈ +21 draw calls over the idle view (dynamic meshes are not batched by design).
- Approximate memory: unchanged texture set (18), +12 small geometries (< 50 KB), particle pools 148 × 11 floats, skid buffer 160 matrices. NOT MEASURED on hardware.
- Rapier was not introduced; the kinematic model costs one grid query per sub-step.

## 4. Known defects

1. A toppled tree can come to rest across the car when the player stops right after the impact (the fallen tree has no collider). Cosmetic; driving away resolves it.
2. In SwiftShader the fall spans 2–4 frames, so the capture scripts use `--slow 0.35`; on hardware the 1–1.5 s fall is expected to show ~60–90 frames (NOT VERIFIED).
3. Skid marks are flat quads on the asphalt plane with polygon offset; from very low angles they can z-fight on some GPUs (not seen in SwiftShader).
4. The canopy sway is not applied to the shadow pass, so shadows of swaying canopies stay still (invisible at the current amplitude).
5. Dust emission is per frame, so at very low frame rates fewer puffs are emitted than the nominal rate.

## 5. Visual verdicts

All sequence frames come from real driving (held W key) with the tree clock slowed ×0.35 where noted; contact speeds recorded in the timelines: soft 4.8 u/s, medium 11.1, strong 19.6–19.9.

| Shot | Verdict |
|---|---|
| `video/strong-00…06` + webm | intact → impact (toast "Trunk snapped", "Reset world 1") → tilt 0.05 → 1.11 rad with leaves and splinters in the air → fallen with the stump standing and the upper trunk + canopy on the ground, dust where the canopy landed → regrow from the ground → restored, identical to intact. Reads as a fall, not a teleport. |
| `sequence/medium-*` | topple without snapping: whole trunk pivots at the base (0.03 → 0.73 → 1.26 rad); the car passes under the canopy. |
| `sequence/soft-*` | shake only: trunk upright, the car bounced back (speed ≤ 0); tree standing again after 0.9 s. |
| `sequence/low-strong-*` | LOW: same fall and fallen pose without particles, shadows or sway; 69 draw calls in the frame. |
| `sequence/reduced-strong-*` | reduced motion: 0.36 rad at the first captured frame, fallen within 0.35 s of simulated time, no bounce, no car/camera jolt. |
| `mobile/mobile-strong-*` | Pixel-class portrait with the follow camera: HUD buttons ("World 1") and touch controls stay clear of the scene; the tree ahead of the car tilts and the sequence completes. |
| `driving/high-01…03` | hard brake: brake lights + two dark marks behind the rear wheels; fast turn on the ring road lays a curved pair of marks; marks are a 160-slot ring buffer (none in LOW: `driving/low-*`). |
| `driving/high-04-offroad-dust` | dust puffs behind the car on turf; faint in a still (4 particles alive at ~3 fps), clearer in motion. No dust on asphalt or while stopped (unit-tested). |
| `driving/high-05-sway-a/b` | two frames one second apart from the same camera: canopy vertices differ, trunks and the rest of the frame do not. |
| `after/03-spawn-desktop`, `09-central-hub`, `10-duplex`, `15-night-driving` vs `docs/screenshots/v3/after/` | shadow sides of facades lifted (hemisphere/ambient/fill), contact blobs under car and trees, warm pools at entrances, lift cab visible in the DUPLEX shaft, trolley on the BROKI gantry. Palette and composition unchanged. |
| `after/16-quality-{low,medium,high}` | every building and sign present in all tiers; LOW drops shadows, pools, sway, particles and 45 % of the trees. |

## 6. Real limitations

- Hardware GPU, real phones and touch feel: **NOT VERIFIED** (no GPU in this environment). The auto-downgrade still exists.
- The video (`docs/screenshots/v4/video/*.webm`) is a Playwright recording of the software renderer at ~3 fps with the tree clock slowed; it documents the sequence, not the real-time feel.
- Audio was not added (the brief makes it optional behind an explicit preference).
- Fallen trees do not collide with the car; curbs and sidewalks remain drive-over, as in V3.
- 8 simultaneous animating trees and 24 snapped trunks are hard caps; beyond them hits become rigid bumps / stump-only poses (not reached in testing).
