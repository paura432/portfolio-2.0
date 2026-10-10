# V3 Visual QA — before / after

Same cameras, same viewport (1280×800 desktop, 390×844 @2× phone), same renderer (Chromium + SwiftShader), production build. `before/` is `sprint-02/ux-content-quality` @ `1833ca2`; `after/` is the head of `feat/world-art-direction-v3`. Cameras are driven by the photo-mode probe so framing is identical; the scripts live in `scripts/visual-qa/`.

## Shot list

| # | Shot | Before | After | Verdict |
|---|------|--------|-------|---------|
| 1 | Intro desktop | `before/01-intro-desktop.png` | `after/01-intro-desktop.png` | preview now shows the real V3 render (Nexus, OVI, DUPLEX, car) |
| 2 | Intro mobile | `before/02-intro-mobile.png` | `after/02-intro-mobile.png` | portrait preview regenerated |
| 3 | Spawn desktop | `before/03-spawn-desktop.png` | `after/03-spawn-desktop.png` | crossing, curbs, lamps with pools, Nexus ahead; fov 52 |
| 4 | Spawn mobile | `before/04-spawn-mobile.png` | `after/04-spawn-mobile.png` | car ≈ 1/8 of frame height (was ≈ 1/4), road and hub visible, minimap top-left, compact buttons |
| 5 | Car rear | `before/05-car-rear.png` | `after/05-car-rear.png` | light bar, spoiler lip, exhausts, arches |
| 6 | Car side | `before/06-car-side.png` | `after/06-car-side.png` | sloped hood, fast windshield, belt trim, pentagon rims |
| 7 | Car three-quarter | `before/07-car-three-quarter.png` | `after/07-car-three-quarter.png` | silhouette reads; lamp post no longer in front of the car |
| 7b | Car top | `before/07b-car-top.png` | `after/07b-car-top.png` | roof panel, glass, mirrors |
| 8 | Car turning | `before/08-car-turning.png` | `after/08-car-turning.png` | front wheels steer, body roll (visual layer) |
| 9 | Central Hub | `before/09-central-hub.png` | `after/09-central-hub.png` | Engineering Nexus; no mirrored "CONTACT STATION" in frame |
| 10 | DUPLEX | `before/10-duplex.png` | `after/10-duplex.png` | Industrial Intelligence Lab |
| 11 | OVI | `before/11-ovi.png` | `after/11-ovi.png` | AI Intelligence Core |
| 12 | Aerial | `before/12-aerial.png` | `after/12-aerial.png`, `after/12b-aerial-low.png` | whole city, seven districts, boulevards, gardens |
| 13 | Roads & intersection | `before/13-roads-intersection.png` | `after/13-roads-intersection.png` | asphalt / curb / sidewalk hierarchy, zebra, dashes cleared at the junction |
| 14 | Signs | `before/14-signs.png` | `after/14-signs.png` | post beyond the sidewalk, single-sided panels on plates, DUPLEX sign on its tower |
| 15 | Night driving | `before/15-night-driving.png` | `after/15-night-driving.png` | bollards, crossing, planters, lit entrance |
| 16 | Quality LOW / MEDIUM / HIGH | `before/16-quality-{low,high}.png` (no MEDIUM existed) | `after/16-quality-{low,medium,high}.png` | LOW keeps every building and sign; no shadows, no pools, 55 % vegetation |
| 17–20 | BROKI, TrustOS, 42 Madrid, Contact Station | — (reserved plots) | `after/17-broki.png` … `after/20-contact.png` | new |

Lighting presets from identical cameras: `docs/screenshots/v3/lighting-presets/` (Phase 1, baseline geometry) and `docs/screenshots/v3/lighting/` (final world).

## Defect checklist (section 2 of the brief)

| # | Defect | Status | Evidence |
|---|--------|--------|----------|
| 1 | Boxy car | fixed | 05–08 |
| 2 | Buildings from few primitives | fixed | 09–11, 17–20 |
| 3 | Ground/road contrast | fixed | 13, 12 |
| 4 | Repetitive vegetation | fixed | 12, 13 (3 families, 4 tints, scales) |
| 5 | Flat, dark lighting | fixed | 09–11 (Blue Hour, three-point rig) |
| 6 | No architectural depth | fixed | 10 (pilasters, catwalk, sawtooth), 09 (overhangs, ring) |
| 7 | Mirrored sign text | fixed | 09, 15 (single-sided + plate; `signage.test.ts`) |
| 8 | Signs hiding the car / too close to the road | fixed | 07, 14 (posts ≥ 2.5 from asphalt, validated) |
| 9 | Empty environment | fixed | 12, 13 (sidewalks, gardens, benches, planters, bollards, pads) |
| 10 | Mobile car too large | fixed | 04 (portrait camera profile) |
| 11 | Mobile HUD over the top | fixed | 04 (minimap under the brand, compact buttons) |
| 12 | Districts undifferentiated | fixed | 10 vs 11 vs 17–20 |

## Review notes (silhouette, contrast, materials, shading, scale, depth, composition, overlaps, sharpness, legibility, coherence)

- Silhouettes: each district has a unique skyline element (spire, lift tower, orb+rings, barrel roof+gantry, rotated vault+ring, stacked modules+42 plate, lattice mast+dish).
- Contrast: asphalt is the darkest value, sidewalks the lightest ground value, terrain textured in between; accents only on emitters.
- Materials: one shared library; glass has low emissive so it reads as glass, metals have low metalness (no env map) so they read.
- Shading: flat shading on architecture and vegetation; PCF shadows from one key light; fake pools and blob instead of extra lights.
- Scale: hub spire 17 units, lift tower 15, OVI orb 16 — none hides the city from the spawn camera (03).
- Overlaps: signposts moved; the east post no longer fronts OVI; BROKI's roof end is a gable wall after a defect found in close-up (`scripts/visual-qa/closeup.mjs`).
- Legibility: label text auto-shrinks to the plate; "CONTACT STATION" fits.
- Coherence: all tiers keep the same palette and every building.

## Tests

| Suite | Result |
|---|---|
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm typecheck` | clean |
| `pnpm test` (Vitest) | 61 / 61 (new: carVisual, urban, signage, aspect camera, tree variety) |
| `pnpm build` | 13 static routes |
| `pnpm test:e2e` (Playwright, desktop + Pixel 7) | 10 / 10 |

## Performance (Chromium 156 headless, SwiftShader software renderer, 1280×800, DPR 1)

These are **software-rendering** numbers for relative comparison only. Real-GPU performance: **NOT VERIFIED** (no GPU in this environment).

| Build | Tier | FPS (driving, 4 s) | Frame ms | Draw calls | Triangles | Geometries | Textures | Programs |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| sprint-02 @ 1833ca2 | high | 9.8 | 102 | 150 | 21 588 | 122 | 12 | 15 |
| V3 | high | 3.7 | 267 | 267 | 47 334 | 201 | 18 | 20 |
| V3 | medium | 5.8 | 174 | 252 | 44 156 | 201 | 18 | 20 |
| V3 | low | 7.1 | 141 | 141 | 21 024 | 200 | 16 | 31 |

- First frame after "Explore": ≈ 1.0 s (V3) vs ≈ 1.2 s (baseline) in this environment.
- Static batching cut the spawn view from 407 to ≈ 270 draw calls at high; instancing keeps vegetation/furniture at 19 calls.
- The scene is still small for any hardware GPU (≈ 48 k triangles, ≤ 280 draw calls, 18 textures all ≤ 1024²); the performance monitor steps the tier down automatically when the frame rate drops.
- `scripts/visual-qa/leak.mjs`: geometry/texture/program counters stay flat across idle, teleports, tier changes, driving and menus; they rise only when a new camera reveals meshes for the first time (lazy upload, not a leak). Programs grow once when shadows toggle (shader variants), then stay flat.
- Approximate GPU memory: 18 textures (≈ 6 MB at 2048² shadow map + 1024² labels + 256² tiles), ≈ 48 k triangles of geometry (< 6 MB). NOT MEASURED on hardware.

## Known limitations and risks

1. Real-GPU frame rate, mobile touch feel and shadow cost on integrated GPUs are NOT VERIFIED; software rendering is 2.5× slower than the baseline at high. The auto-downgrade exists but was not exercised on hardware.
2. Curbs and sidewalks are not obstacles: the car can drive onto them and floats 0.16 units above the pavement (arcade behaviour kept to avoid changing the collision model).
3. All seven districts are now `built`; the "planned" group disappeared from the Projects menu and the smoke test was updated accordingly. Their content pages already existed.
4. 17 MB of screenshots were added to `docs/screenshots/v3/` as required evidence.
5. The translucent Contact pavilion is a single transparent box; from some angles its back faces sort oddly (minor).
6. The three lighting presets remain in code (selectable through the store) and add a small amount of unused data.
