# V5 validation — 4Geeks AI Engineering Campus

Branch `feat/v5-4geeks-ai-campus`, base `feat/world-art-direction-v4` @ `ef3792a` (V4 verified: lint 0/0, typecheck clean, Vitest 100/100, build, Playwright 12/12). Renderer for every number: Chromium headless + SwiftShader, production build. **Hardware GPU and physical phones: NOT VERIFIED.**

## 1. Checks

| Suite | V4 base | V5 |
|---|---|---|
| `pnpm lint` | 0 / 0 | 0 / 0 |
| `pnpm typecheck` | clean | clean |
| `pnpm test` (Vitest) | 100 / 100 | 106 / 106 (20 files) |
| `pnpm build` | 13 routes | 6 routes (+ /education/4geeks and 4 lab pages) |
| `pnpm test:e2e` | 12 / 12 | 15 / 15 (new: campus ×2, mobile touch ×1) |

## 2. Functional QA (brief §16)

| # | Requirement | How it is checked | Where |
|---|---|---|---|
| 1 | District on the map | `districts` built list includes `fourgeeks`; minimap draws the main plot + 4 lab plots | `data.test.ts`, `campus.spec.ts` |
| 2 | Valid position | entrance on a road; plots inside the island; no overlap with other buildings or roads (incl. plots) | `data.test.ts` |
| 3 | Road connects | spur (30,−40)→(30,−47) in `ROADS`; the car reaches the prompt by holding W from the ring road | `campus.spec.ts` |
| 4 | Buildings do not invade roads | all plot edges > 0.5 from any road | `data.test.ts` |
| 5 | Car reaches the entrance | real driving to the zone; entrance and every plot entrance stand free of collisions | `campus.spec.ts`, `data.test.ts` |
| 6 | No invisible collisions | obstacles are built from the same `allPlots()` the buildings use; forecourt/sidewalk/vegetation use the same list; the car stops at the hall facade at the expected distance | `obstacles.ts`, `campus.spec.ts` |
| 7–9 | E opens the panel, driving pauses | keyboard E and touch tap; car does not move while open | `campus.spec.ts`, `mobile.spec.ts` |
| 10 | Navigate between labs | lab cards → lab content → "← Campus"; all four labs | `campus.spec.ts` |
| 11 | Links = verified repositories | every repo href ∈ the two audited repositories; evidence URLs point into them | `campus.spec.ts`, `fourgeeks.test.ts` |
| 12–13 | Close, driving resumes | Escape / close button, then the car moves | `campus.spec.ts`, `mobile.spec.ts` |
| 14 | Minimap shows the campus | `[data-district=fourgeeks] rect` × 5 | `campus.spec.ts` |
| 15 | Signage legible | facade sign mount validated (height, facing, not over asphalt); north signpost lists "4Geeks AI Campus →"; plaques per lab on the V3 single-sided panel; captures 04/05/07–09 | `signage.test.ts`, screenshots |
| 16 | LOW keeps content and interaction | prompt + panel at LOW; LOW captures of aerial, hall, lab, prompt, panel | `campus.spec.ts`, screenshots |
| 17 | Keyboard and touch | desktop spec uses keys; mobile spec taps prompt, lab card, back and close | both specs |
| 18 | HTML without WebGL | `/education/4geeks`, `/education/4geeks/<slug>`, 404 for unknown, listed in `/projects`, sitemap entries | `campus.spec.ts` |
| 19 | V4 trees unaffected | tree simulation active after the campus loads; no tree or bush inside any plot or on the plaza (unit); `trees.spec.ts` unchanged and passing | `props.test.ts`, `trees.spec.ts` |
| 20 | Previous tests pass | full `pnpm check` | section 1 |

Secondary 3D interaction: standing in front of a lab on the plaza shows "Open lab · Lab 0n" and E opens that lab directly (tested for Lab 01).

## 3. Captures (`docs/screenshots/v5/`)

Fixed cameras through the photo probe (`scripts/visual-qa/v5shots.mjs`), production build, HIGH unless stated.

| File | Content | Verdict |
|---|---|---|
| `high-01-aerial-island.png` | whole island, same camera as the V3/V4 aerial (`docs/screenshots/v4/after/12-aerial.png` is the "before") | the campus closes the north edge next to 42 Madrid; violet reads as a distinct quarter without breaking the palette |
| `high-02-aerial-campus.png` | campus from the south-east | hall with mast, four pavilions with different silhouettes (shed + containers, glass box + bar crown, dark block + stack, pavilion + nodes), plaza line |
| `high-03-access-follow.png` | follow camera at the spur end, prompt visible | entrance, lanterns, planters, bollards; car ≈ 1/8 of the frame |
| `high-04-hall-front.png` | hall facade from the spur | glazed ground floor, pillars, door, light bar, window band, cantilever strip, campus sign |
| `high-05-plaza.png` | along the plaza from the west | hall corner, light paths, Lab 04 at the end |
| `high-06…09` | each lab from its entrance side | plaques legible; each lab recognisable without reading |
| `high-10-campus-east-aerial.png` | from the east | corner pair closes the composition |
| `high-11-prompt.png`, `12-panel-campus.png`, `13-panel-lab01.png`, `14-menu.png` | prompt "Explore · 4Geeks AI Campus", campus panel with status badges, Lab 01 case study, menu grouped by category | |
| `medium-*`, `low-*` | aerial, hall, Lab 01 (+ prompt and panel at LOW) | every building, plaque and interaction present in all tiers; LOW drops shadows, sway, particles |
| `mobile-high-*` | Pixel-class portrait: access, prompt, campus panel, lab panel, menu | full-width sheet, sticky header, no horizontal overflow (asserted in `mobile.spec.ts`) |

## 4. Performance (SwiftShader, relative only)

Measured with `scripts/visual-qa/v4perf.mjs --base-only` (world scenario driving north from the spawn for 4 s per tier, and a 34 s lap), V4 from `docs/screenshots/v4/baseline/perf-v4.json`, V5 from `docs/screenshots/v5/perf/perf-v5.json`. SwiftShader FPS varies ±2× between runs; read the structural counters.

| Tier | Build | FPS | Frame ms | Draw calls | Triangles | Geometries | Textures | Programs |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| High | V4 | 4.2 | 238 | 267 | 49 144 | 213 | 18 | 23 |
| High | V5 | 3.2 | 317 | 336 | 53 398 | 260 | 24 | 23 |
| Medium | V4 | 4.2 | 236 | 266 | 46 676 | 213 | 18 | 23 |
| Medium | V5 | 5.0 | 201 | 320 | 49 610 | 260 | 24 | 23 |
| Low | V4 | 4.0 | 252 | 160 | 23 410 | 210 | 16 | 36 |
| Low | V5 | 5.6 | 178 | 198 | 26 416 | 257 | 22 | 36 |

- From the spawn (campus in the far frustum) the campus costs **+69 draw calls at HIGH (+26 %)**, +4 254 triangles (+9 %), +47 geometries (one merged geometry per campus material, 7 window grids, 4 plaques, mast and pulse), +6 textures (5 label textures, 1 violet pool). The rest of the city (seven buildings) stays at 267, so the campus costs about a quarter of the rest, within the brief's limit.
- Two optimisations were needed to get there: the whole campus is a **single `StaticBatch`** (one merged mesh per material instead of one batch per building: 428 → 370 calls), and merged batches of unlit basic materials (emissive strips, screens, lamps) **no longer cast shadows** (370 → 336). The second applies to every V3 building as well; no visible change in the captures.
- First frame after "Explore": 1.00 s (V4) → 1.05 s (V5) in SwiftShader; the campus merge is included.
- Prolonged lap (34 s, 10 turns): geometries / textures / programs grow by 4 / 2 / 4 during the lap (lazy upload of meshes seen for the first time, same as V4) and are flat afterwards; 13 fps at the end of the lap in this run.
- Campus-only views: hall front 172 calls / 41 k triangles, campus aerial 239 / 46 k, island aerial 388 / 57 k (V4 island aerial: 315 / 47 k).
- Dynamic parts added: 2 animated groups (mast, pulse), no lights, no particles.

## 5. Risks and limitations

- **Hardware GPU, real phones**: NOT VERIFIED (SwiftShader only). The campus adds static geometry only; the auto-downgrade from V3 still applies.
- **Startup cost**: the whole campus is merged into one `StaticBatch` at mount (≈ 300 primitives). In SwiftShader the first frame after "Explore" went from ≈ 1.0 s to ≈ 2.0 s; on hardware the merge is CPU work of the same order (tens of ms expected, NOT MEASURED).
- **Academic claims**: the content states "in progress" and never "completed"; the course status will have to be updated by hand when it changes (`fourGeeks.status` / `statusNote`).
- **Author-run checks**: the build/compose/Playwright results quoted in Labs 01 and 03 are the author's records in the repositories, not re-executed here; the copy says so.
- **Fictional company**: TrackFlow is 4Geeks course material; its named staff and figures are deliberately not reproduced. If 4Geeks changes the public template, the evidence links (blob URLs on `main`) could move.
- **Lab 02 authorship**: the dashboard application belongs to the 4Geeks template; only the documentation layers are the student's. The lab says so in its status note and boundary.
- **Tree ids**: adding plots changes the deterministic tree list (campus positions are now excluded), so V4 tree ids differ from the V4 branch. Ids remain stable within this build; nothing persists ids across builds.
- **Design limits**: the plaza is paved for the car (the player can drive on it, as on sidewalks); fallen trees, curbs and campus plaques have no colliders; the campus sign is readable from the spur only (single-sided by rule).
- **No logo**: the 4Geeks name is used in text only; no trademark artwork is included.
