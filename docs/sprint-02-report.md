# Sprint 02 · UX, Content & Quality · Report

Branch: `sprint-02/ux-content-quality` · https://github.com/paura432/portfolio-2.0/tree/sprint-02/ux-content-quality
Base: `main` @ `71fdaf3`. Sprint commit: `94f4da5` (this report is committed on top; the branch head is the final SHA).
Not merged, not deployed. Verified 2026-10-10 on the production build, Node 24, Chromium headless with software WebGL.

## 1. Files and changes
| area | files | change |
|---|---|---|
| Content | `src/data/projects.ts`, `src/data/profile.ts`, `src/data/districts.ts` | Case-study structure (`tagline`, `highlights`, `flow`, `media`, `pending`); verified additions for DUPLEX, OVI, TrustOS; BROKI reconciled; `profile.focus`; CV entries with `available` flags; district taglines |
| Content docs | `docs/content-audit.md` | Sources, BROKI evidence, verified additions, not-claimed list, pending list, CV plan |
| Case-study template | `components/portfolio/{ProjectContent,FlowDiagram,CvLinks,ProfileContent,ContactContent,DistrictBody}.tsx`, `src/lib/internal.ts` | Shared template for panel and pages; data-driven flow diagram; media gallery hook; pending rendered only in dev |
| Intro | `components/hud/IntroScreen.tsx`, `public/preview/city.jpg` (47 KB), `city-portrait.jpg` | Who / what / focus areas / 3D city preview / direct access to projects and contact |
| Dialog | `components/hud/Dialog.tsx`, `ProjectPanel.tsx`, `ProjectsMenu.tsx`, `src/app/globals.css` | Full-width sheet on phones with sticky header and footer; focus cycle fixed; `inert` background; grouped menu |
| HUD | `components/hud/{Hud,Minimap,TouchControls}.tsx` | Larger controls, minimap, reset car, one-line instruction |
| Navigation aids | `src/game/world/signposts.ts`, `components/game/Signposts.tsx`, `src/lib/labelTexture.ts` | Plaza-exit signposts with arrows; higher-contrast sign textures |
| Game quality | `src/game/vehicle/carPhysics.ts`, `carState.ts`, `world/obstacles.ts`, `components/game/{Car,FollowCamera,SceneSignals,GameCanvas,GameShell}.tsx`, `stores/gameStore.ts`, `hooks/useKeyboardControls.ts` | Collision per sub-step; reset with camera snap; first-frame signal; context-loss handling; R key |
| Metadata | `src/lib/site.ts`, `src/app/{layout,sitemap,robots}.ts(x)`, project/contact pages | OG/Twitter cards, descriptions, canonicals, sitemap and robots gated on `NEXT_PUBLIC_SITE_URL` |
| CI | `.github/workflows/ci.yml` | lint → typecheck → unit → build → Playwright |
| Tests | `src/game/vehicle/carCollision.test.ts`, `src/game/world/signposts.test.ts`, `src/data/content.test.ts`, `e2e/{helpers,smoke,dialog,context-loss,mobile}.spec.ts`, `playwright.config.ts` | +12 unit, +7 e2e, mobile Playwright project, single worker |
| Docs | `docs/{design,architecture}.md`, `README.md`, `docs/screenshots/{before,after}/` | Updated for the sprint; comparison captures |

## 2. Defects fixed, with evidence
| # | defect | fix | evidence |
|---|---|---|---|
| D1 | Dialog focus could leave the panel: Tab from the container went to HUD buttons behind it; initial focus on a non-interactive container | Close button receives focus; Tab/Shift+Tab wrap on the real focusable ring; rest of page `inert`; focus restored to opener | `e2e/dialog.spec.ts` (ring walk of N+2 tabs stays inside; Shift+Tab wraps to last; opener focused after Esc) |
| D2 | "Pending information" lists were visible to the public | Rendered only when `INTERNAL_VIEW` (development) | `smoke.spec.ts` asserts the text is absent in the panel and on `/projects/duplex` |
| D3 | Loading overlay removed on `onCreated`, i.e. before any frame was drawn | `FirstFrameSignal` flips `sceneReady` after the first rendered frame | `helpers.startGame` waits for `loading` to hide before polling the car |
| D4 | Collision resolved once per frame after up to three sub-steps: at low fps the car could sink ~2 u into a wall before being pushed out | Constraint runs after every sub-step inside `stepCar` | `carCollision.test.ts`: 200 frames at dt = 0.1 into a wall, penetration never > 0, jump ≤ maxSpeed·maxDt·3 |
| D5 | WebGL context loss left a frozen canvas with no message | `ContextLossHandler` + overlay with Reload / View projects | `context-loss.spec.ts` with `WEBGL_lose_context` lose → overlay → restore → hidden |
| D6 | Mobile panel: title and close inside a scrolling card, kbd hints shown on touch | Sticky header, full-width sheet, footer buttons share a row, `.kbd` hidden under `sm` (component CSS moved into `@layer components` so utilities win) | `mobile.spec.ts`: sheet width = viewport, close button in viewport after scrolling the body |
| D7 | Stuck car had no recovery | `resetCar()` on R / HUD button; camera snaps via `generation` | `smoke.spec.ts` "reset car" |
| D8 | No orientation inside the city | Signposts at plaza exits + minimap from the same data | `signposts.test.ts`, `after/04-driving.png`, minimap visible in smoke test |
| D9 | BROKI copy mixed "airport platform" and "legacy modernization" without saying how they relate | Reconciled from the BROKI checkout: operations platform that replaces a legacy stack, verified by parity audits and cutover/rollback runbooks | `docs/content-audit.md` lists the source paths |
| D10 | Intro was two buttons on an empty page | New intro: who, what, three focus areas, city preview image, project/contact access; no WebGL before "Explore" | `smoke.spec.ts` asserts no `<canvas>` before clicking Explore; `after/01-intro-desktop.png` |

## 3. Tests executed
| suite | result |
|---|---|
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm typecheck` | clean |
| `pnpm test` (Vitest) | 49 / 49 in 11 files |
| `pnpm build` | ok: `/`, `/projects`, 5 project pages, `/contact`, `/robots.txt`, `/sitemap.xml` |
| `pnpm test:e2e` (Playwright) | 10 / 10: 7 desktop, 3 mobile (Pixel 7 emulation) |

Two flaky steps found while writing the e2e suite were made deterministic (drive-until conditions instead of fixed waits; single worker because software WebGL is CPU-bound). Console during the full run: 0 errors; the only warnings are two three.js deprecation notices emitted by fiber internals.

## 4. Before / after captures
`docs/screenshots/before/` (main @ 71fdaf3) vs `docs/screenshots/after/` (this branch):

| capture | before | after |
|---|---|---|
| Intro desktop | `01-intro-desktop.png`: name, role, two buttons | hero with focus areas, city preview, three actions, social links |
| Intro mobile | `02-intro-mobile.png`: centred buttons | stacked hero; preview under the actions; no horizontal overflow |
| Spawn | `03-spawn.png` | same composition, signposts visible at exits, minimap bottom-right, brighter signs |
| Driving | `04-driving.png` | signposts "DUPLEX →" / "← TRUSTOS" at the west exit; minimap tracks the car |
| Panel DUPLEX desktop | `05-panel-duplex-desktop.png`: single column list | sticky header, flow diagram in one row, highlights grid, footer actions |
| Panel OVI mobile | `06-panel-ovi-mobile.png`: card with inner title | full-width sheet, sticky header with close, footer row |
| Projects menu | `07-menu.png`: flat list with "On the map/Planned" labels | two groups, accent dots, "Page ↗" links |
| HTML project page | `08-html-project.png` | tagline, flow, highlights; no pending section |
| WebGL fallback | `09-webgl-fallback.png` | unchanged |

## 5. Pending risks
- **Real GPU not tested in this environment.** All captures come from SwiftShader at ~15 fps, so "Graphics: Reduced" is auto-selected in them. The quality monitor may behave differently on real hardware; a manual check on a laptop and a phone is still needed.
- **Signpost / entrance sign overlap** at the west and east exits from some camera angles (cosmetic).
- **BROKI public wording** now mentions the legacy migration explicitly; confirm the owner is comfortable with that level of detail.
- **Public repository.** `paura432/portfolio-2.0` is public; the content boundary rules keep private data out, but the repo visibility was not the brief's intent.
- **CV files** still absent; links stay hidden until `public/cv/*.pdf` is added and the flags flipped.
- **No `NEXT_PUBLIC_SITE_URL` yet**, so canonical/OG absolute URLs and the sitemap are empty until deployment config sets it.
- **Playwright on CI** uses SwiftShader flags from the config; first CI run on GitHub has not happened yet (workflow triggers on PR / push to main).

## 6. Visual proposal for the art phase
1. **Materials.** Keep flat shading but add a second tone per building (base + lighter top band) and a 1-px darker edge line via a thin outline mesh or vertex-colour gradient, no post-processing.
2. **Ground.** Replace the single slab colour with a subtle two-tone grid of plot tiles (data-driven from districts), and a lighter curb along roads for readability at speed.
3. **Light.** Keep the cool key light; add a slow 2-minute colour drift (cyan ↔ amber temperature) on the hemisphere light, disabled under reduced motion.
4. **Districts.** One signature silhouette each for BROKI (hangar + control tower), TrustOS (twin pylons with a bridge), 42 Madrid (stepped campus block), Contact Station (antenna dish). All procedural, no external assets.
5. **Car.** Wheels with hub caps, a roof light bar, brake lights that react to the brake input, headlight cones only in high quality.
6. **Props.** Benches, bollards and planters as instanced sets placed by the same seeded generator; a few parked cars in the planned plots.
7. **Audio (optional, off by default).** Low engine hum + UI ticks, with a visible toggle.
