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

## V3 art direction

The world was rebuilt visually in `feat/world-art-direction-v3` (vehicle, Engineering Nexus, six district buildings, urbanism, props, Blue Hour lighting, quality tiers, mobile framing). Documentation and evidence:

- `docs/art-direction/v3-visual-audit.md` — baseline defects, phase log, acceptance matrix
- `docs/art-direction/v3-materials-lighting.md` — palette, material library, presets, tiers
- `docs/art-direction/v3-architecture.md` — buildings, urbanism rules, signage rules, camera
- `docs/qa/v3-visual-comparison.md` — before/after shots, tests, performance, risks
- `docs/screenshots/v3/{before,after,lighting,lighting-presets}/`
- `scripts/visual-qa/` — reproducible capture and measurement scripts (see its README)
