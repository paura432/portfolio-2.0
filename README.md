# PAU WORLD 3D

Interactive portfolio of **Pau Ramos**, Full Stack Product Engineer: a small low-poly technological city you explore by driving an orange car. Each district is a project; drive up to it and press **E** to open its technical sheet. Everything is also available as plain HTML pages.

## Run
```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Scripts
| command | what |
|---|---|
| `pnpm dev` | development server |
| `pnpm build` / `pnpm start` | production build / server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (game logic, data, store) |
| `pnpm test:e2e` | Playwright smoke test (needs `pnpm build` first; starts `next start` on port 3101) |
| `pnpm check` | all of the above in order |

## Controls
- **W A S D** or arrows: drive · **Space**: brake · **E**: open the nearby district · **Esc**: close · **M**: projects menu · **R**: reset the car to the start.
- Touch devices get on-screen buttons.

## Content rules
Only verified information is published (`docs/content-audit.md`). Missing details live in each project's `pending` list and render only in development builds. CV links appear when `profile.cv.*.available` is true and the PDF exists under `public/cv/`.

## Deployment notes
Set `NEXT_PUBLIC_SITE_URL` to the public origin to enable canonical URLs, Open Graph absolute images and the sitemap. CI runs on every push to `main` and on pull requests (`.github/workflows/ci.yml`).

## Docs
- `docs/design.md`: visual identity, map, camera, car, HUD.
- `docs/architecture.md`: stack, folders, data flow, rendering, testing.
- `docs/reference-analysis.md`: what was learned from the reference projects and what was adopted.
- `docs/acceptance-criteria.md`: MVP criteria with verification results.
- `docs/content-audit.md`: sources, BROKI reconciliation, pending list.
- `docs/sprint-02-report.md`: sprint 02 changes, defects, tests, before/after captures, risks.
- `docs/screenshots/before` and `after`: sprint 02 comparison captures.

## Status
MVP phase: Central Hub, DUPLEX and OVI are built. BROKI, TrustOS, 42 Madrid and Contact Station are defined as data (menu, routes, reserved plots) for the next phase.

## V5 4Geeks AI Engineering Campus

Branch `feat/v5-4geeks-ai-campus`. An eighth district on the north edge next to 42 Madrid: a spur off the ring road, a three-storey hall with a data mast, a research plaza and four lab pavilions for the real 4Geeks AI Engineering work (TrackFlow, Financial Dashboard, Back-office, AI workflow), each with an explicit status and verified repository links. Content lives in `src/data/education/fourgeeks.ts`; adding a lab is one data entry plus one plot. Routes: `/education/4geeks` and `/education/4geeks/[slug]`. Docs: `docs/education/4geeks-content-audit.md`, `docs/art-direction/v5-4geeks-campus.md`, `docs/qa/v5-4geeks-validation.md`; captures in `docs/screenshots/v5/`.

## V4 destructible & reactive world

Branch `feat/v4-destructible-reactive-world`. The car can now knock trees down: soft hits shake them, faster hits topple them away from the car, fast hits snap the trunk; fallen trees stay down and regrow by time + distance or with the HUD "Reset world" button. The forest stays instanced (standing and fallen trees are instances; only animating trees borrow one of eight pooled mesh sets), canopies sway in the vertex shader, the car kicks up dust on turf and leaves skid marks on asphalt. Docs: `docs/gameplay/v4-tree-destruction.md`, `docs/art-direction/v4-reactive-world.md`, `docs/qa/v4-regression-report.md`; captures in `docs/screenshots/v4/`.

## V3 art direction

The world was rebuilt visually in `feat/world-art-direction-v3` (vehicle, Engineering Nexus, six district buildings, urbanism, props, Blue Hour lighting, quality tiers, mobile framing). Documentation and evidence:

- `docs/art-direction/v3-visual-audit.md` — baseline defects, phase log, acceptance matrix
- `docs/art-direction/v3-materials-lighting.md` — palette, material library, presets, tiers
- `docs/art-direction/v3-architecture.md` — buildings, urbanism rules, signage rules, camera
- `docs/qa/v3-visual-comparison.md` — before/after shots, tests, performance, risks
- `docs/screenshots/v3/{before,after,lighting,lighting-presets}/`
- `scripts/visual-qa/` — reproducible capture and measurement scripts (see its README)
