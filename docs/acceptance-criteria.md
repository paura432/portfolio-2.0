# PAU WORLD · MVP acceptance criteria and results

Verified on 2026-10-10 against the production build (`next build` + `next start`), Node 24, pnpm 10, Chromium headless with SwiftShader (software WebGL, ~16 fps). "How verified" names the automated check or the manual evidence.

| # | Criterion | Status | How verified |
|---|---|---|---|
| 1 | Intro screen with name, role, Explore World / View Projects | ✅ | e2e `full run`; `docs/screenshots/01-intro.png` |
| 2 | Fully functional 3D scene (island, roads, hub, DUPLEX, OVI, props, lighting) | ✅ | e2e canvas visible + first frame; screenshots 02–04 |
| 3 | Car drivable with WASD and arrows | ✅ | unit `input.test.ts`; e2e drives with W/S |
| 4 | Acceleration, braking, steering, follow camera | ✅ | unit `carPhysics.test.ts`, `followCamera.test.ts`; screenshots |
| 5 | Collisions / limits (cannot cross buildings or leave the island) | ✅ | unit `collision.test.ts`, `data.test.ts` (spawn and entrances clear) |
| 6 | Proximity detection | ✅ | unit `proximity.test.ts`; e2e prompt appears by driving |
| 7 | Contextual prompt: E key or button | ✅ | e2e opens with E and with the HUD button |
| 8 | Accessible HTML project panel | ✅ | `role=dialog`, `aria-modal`, focus in/out, Tab trap, Esc; e2e checks focus |
| 9 | Driving blocked while a panel is open | ✅ | e2e holds W with panel open: car does not move |
| 10 | Control recovered on close | ✅ | e2e: car moves after Esc |
| 11 | Direct menu to all projects | ✅ | e2e: menu lists 7 districts, opens DUPLEX |
| 12 | Individual routes for professional content | ✅ | `/projects`, `/projects/{duplex,ovi,broki,trustos,42-madrid}`, `/contact` prerendered; e2e |
| 13 | Responsive + functional alternative without WebGL | ✅ | touch controls on coarse pointers; e2e WebGL-disabled fallback; mobile screenshot 07 |
| 14 | Loading, error and reduced-graphics states | ✅ | loading overlay until first frame; `SceneErrorBoundary`; quality toggle + auto decline |

## Quality criteria
| Criterion | Status | Evidence |
|---|---|---|
| TypeScript without errors | ✅ | `pnpm typecheck` clean (strict + noUncheckedIndexedAccess) |
| Production build | ✅ | `pnpm build` ok, 11 static pages |
| No important warnings / console errors | ✅ | e2e asserts no console errors; only two three.js deprecation warnings emitted by fiber internals (`THREE.Clock`, `PCFSoftShadowMap`), not by project code |
| Frame-rate independent car | ✅ | unit test compares 30 fps vs 144 fps paths; dt clamped |
| Smooth camera | ✅ | exponential damping; unit test for time consistency |
| Reasonable asset sizes | ✅ | zero external assets; geometry is procedural; first-load JS dominated by three.js |
| Reproducible map and zones | ✅ | all from `src/data/districts.ts` + `world.ts`; seeded props |
| Controls decoupled from UI | ✅ | `inputState` + store actions; HUD and keys call the same actions |
| Keyboard + mouse navigable interactions | ✅ | e2e exercises both |
| View Projects works if WebGL fails | ✅ | server-rendered routes; e2e |
| Basic tests for driving, data, navigation | ✅ | 37 unit tests |
| Playwright full-run smoke test | ✅ | 3 e2e tests pass |
| No secrets in the repo | ✅ | no `.env`, no tokens; `.gitignore` covers env files |

## Not done in this phase (by design)
- BROKI, TrustOS, 42 Madrid and Contact Station exist as data, menu entries, routes and reserved plots, but have no buildings.
- No remote repository: the GitHub CLI's active account is a corporate one and the personal account token is invalid (see the delivery report).
- CV download links are marked pending (files not bundled).
- No audio, no minimap, no gamepad.
