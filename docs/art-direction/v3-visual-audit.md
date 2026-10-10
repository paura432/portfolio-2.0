# V3 Visual Audit — baseline (Phase 0)

Branch `feat/world-art-direction-v3`, created from `sprint-02/ux-content-quality` @ `1833ca2` (latest functional state; `main` @ `71fdaf3` is behind it). Working tree was clean, no stash, no unpublished changes.

Baseline tests at branch point: lint 0 errors, typecheck clean, Vitest 49/49.

Captures: `docs/screenshots/v3/before/` (production build, Chromium + SwiftShader, 1280×800 desktop / 390×844 mobile DPR 2). Cameras are fixed through the photo-mode probe (`window.__pauWorld.photo`) so the `after/` set uses identical framing. Renderer counters per shot in `before/stats.json`.

## Confirmed defects (evidence)

| # | Defect | Evidence | Root cause in code |
|---|--------|----------|--------------------|
| 1 | Car is three boxes | `05-car-rear`, `07-car-three-quarter` | `Car.tsx`: chassis box + hood box + cabin box, no arches, no bumpers, no mirrors |
| 2 | Buildings built from 2–4 primitives | `09-central-hub`, `10-duplex`, `11-ovi` | `Buildings.tsx`: hub = 2 cylinders + torus + mast; DUPLEX = 2 boxes; OVI = cylinder + 3 rings |
| 3 | Road vs terrain contrast insufficient | `13-roads-intersection`, `12-aerial` | `palette.ground #142538` vs `palette.road #1D3249`; no curbs, no sidewalks |
| 4 | Vegetation repetitive | `10-duplex`, `12-aerial` | one cone canopy instanced 150× with scale/rotation only, uniform colour |
| 5 | Flat, dark lighting | `12-aerial`, `10-duplex` | single key light + hemisphere, no fill, no exposure control; large surfaces fall to near-black |
| 6 | No architectural depth | `10-duplex` | flat faces, windows are flat quads, no overhangs, pilasters or recesses |
| 7 | Mirrored sign text | `09-central-hub` ("CONTACT STATION" reversed), `04-spawn-mobile` | `DistrictSigns.tsx` / `Signposts.tsx` use `side={2}` (DoubleSide) on single text planes |
| 8 | Signs occlude the car / are too close to the road | `07-car-three-quarter` (lamp post in front of the car), `14-signs` | lamps at 4.6 from road centre (road half-width 3.5), signposts 5.2 from centre |
| 9 | Visually empty environment | `12-aerial` | quadrants hold only random trees; no sidewalks, plots, planters, benches |
| 10 | Mobile camera: car too large | `04-spawn-mobile` | one `FOLLOW_CONFIG` for every aspect ratio; fov 50 at 390×844 |
| 11 | Mobile HUD invades the top | `04-spawn-mobile` | three full-size buttons + minimap stacked over the horizon |
| 12 | Districts not differentiated without signs | `10-duplex`, `11-ovi` | same `palette.building` material everywhere; shape language identical |

Extra findings:
- Signposts overlap the district sign of DUPLEX from the west exit (`14-signs`).
- Lane dashes are ~70 individual meshes (draw calls), window grids are instanced (good).
- `gl.info.memory.geometries` rises during a session (122 → 170 across the baseline run) — to be investigated in Phase 6.
- Only two quality tiers exist (`high`, `low`); MEDIUM is missing, so the baseline has no MEDIUM capture.

## Baseline renderer counters (SwiftShader, 1280×800, DPR 1)

| Shot | Draw calls | Triangles |
|------|-----------:|----------:|
| 03-spawn-desktop | 150 | 21 588 |
| 12-aerial | 198 | 22 632 |
| 16-quality-high | 117 | 21 580 |
| 16-quality-low | 88 | 14 908 |

Textures: 12 (canvas-rendered signs). Programs: 15–21.
