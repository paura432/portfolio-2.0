# PAU WORLD · Architecture

## Stack (versions pinned in package.json)
| package | version | why |
|---|---|---|
| next | 16.4.0 | App Router, static routes for the HTML portfolio, Turbopack build |
| react / react-dom | 19.3.0 | required by fiber 9 |
| three | 0.186.1 | renderer |
| @react-three/fiber | 9.8.1 | declarative scene graph, `useFrame` loop |
| @react-three/drei | 10.7.9 | only `PerformanceMonitor` (auto quality downgrade). Kept small on purpose |
| zustand | 5.0.15 | shared game phase / nearby / open panel; fiber already depends on it |
| tailwindcss | 4.3.3 | HUD and HTML pages |
| vitest | 5.0.3 | unit tests for pure game logic and data |
| @playwright/test | 1.64.0 | smoke test through a real browser with software WebGL |
| typescript | 5.9.3 | strict, `noUncheckedIndexedAccess` |

**Not installed:** `@react-three/rapier`. The MVP drives on a flat platform against static boxes; a kinematic arcade model with circle-vs-box resolution is deterministic, unit-testable and avoids ~2 MB of WASM plus Suspense gating. See `docs/reference-analysis.md` for the comparison. Upgrade path is documented there.

Cache Components (`cacheComponents`) is disabled in `next.config.ts`: the app is a client-rendered scene plus static content routes, and the extra constraints bring no value here.

## Folder structure
```
src/
  app/                 routes: / (game), /projects, /projects/[slug], /contact, not-found
  components/
    game/              R3F scene: GameShell (client gate), GameCanvas, World, Buildings,
                       DistrictSigns, Props, Car, FollowCamera, ProximitySensor, SceneLighting,
                       SceneErrorBoundary
    hud/               HTML over the canvas: IntroScreen, Hud, TouchControls, Dialog,
                       ProjectPanel, ProjectsMenu, WebGLFallback
    portfolio/         content rendering shared by panels and routes: ProjectContent,
                       ProfileContent, ContactContent, DistrictBody, SiteFrame
  game/                pure TypeScript, no React, fully unit-tested
    controls/input     key bindings → actions → DriveInput; mutable inputState
    vehicle/carPhysics stepCar(state, input, dt) with sub-stepping and dt clamp
    vehicle/carState   liveCar singleton shared by car, camera and proximity
    physics/collision  circle vs AABB / circle, boundary clamp
    interaction/       resolveActiveZone (hysteresis) + zones derived from districts
    camera/            desiredCamera + exponential damp
    world/obstacles    collision shapes derived from districts
    world/props        deterministic tree / lamp placement
  data/                content and map: profile, projects, districts, world
  stores/gameStore     zustand: phase, nearbyDistrict, openDistrict, quality
  hooks/               useKeyboardControls
  lib/                 palette, webgl detection, label textures, seeded random
```
There are no extra abstraction layers (no ECS, no event bus, no plugin system). Each concern is one file.

## Data flow
```
keyboard / touch ──► inputState (mutable Set)        ┐
                                                      ▼
useFrame(Car, -3):  stepCar(…, constrainCar) ─► liveCar.state ─► car mesh
                    (constraint runs after every physics sub-step: no tunneling)
useFrame(Proximity, -2): resolveActiveZone(liveCar) ─► store.setNearby (only on change)
useFrame(Camera, -1):   desiredCamera(liveCar) ─► damp ─► camera
store.phase ──► Car reads it with getState() each frame: "playing" drives, anything else stops
HUD / Panel / Menu ──► subscribe to store slices (React re-renders only on transitions)
```
- Per-frame values never enter React state. The store changes only on transitions (enter/leave zone, open/close panel, phase).
- Negative `useFrame` priorities keep fiber's automatic render loop while fixing the order car → proximity → camera.
- The same `districts.ts` entry produces the building visuals, the collision shape, the interaction zone, the sign, the menu entry and the HTML route. Changing one number moves everything together.
- V6: the store also carries the vehicle slice (`activeVehicle`, `transition`, `mooredAt`, harbor/dock proximity). `canControl(vehicle)` gates every controller; the car and the boat (`useFrame -3`) each keep a live state, the camera and minimap read `poseOf(activeVehicle)`, and `archipelago.ts` plays for islands/harbors the role `districts.ts` plays for buildings. See `docs/architecture/v6-multivehicle.md`.

## Rendering and performance
- `dpr` clamped to [1, 1.5] in high quality, 1 in reduced. `PerformanceMonitor` flips to reduced automatically when the frame rate drops; the HUD button toggles it manually.
- Shadows only in high quality (`castShadow` on the directional light; no canvas remount).
- One draw call each for trees (×2), lamp posts, lamp heads and each window grid (`InstancedMesh`).
- No post-processing, no textures or models loaded from the network. The only textures are canvas-rendered signs.
- Fog colour = background colour so the island edge dissolves.
- V6: the ocean is one non-uniform grid (dense where the boat sails, coarse to the horizon) displaced in the vertex shader by the same Gerstner table the boat floats on; no reflection pass, no depth texture (`docs/art-direction/v6-ocean-harbor.md`).

## Scene readiness and context loss (sprint 02)
- `FirstFrameSignal` flips `sceneReady` on the second `useFrame` callback, i.e. after the first frame has really been rendered; the loading overlay is removed only then.
- `ContextLossHandler` listens for `webglcontextlost` (calls `preventDefault` so the browser may restore) and `webglcontextrestored`, writing `contextLost` to the store; the shell shows a recovery overlay with Reload and a link to the HTML pages. Covered by an e2e test using `WEBGL_lose_context`.
- `resetCar()` bumps `liveCar.generation`; the follow camera snaps instead of gliding when the generation changes.

## Client-only rendering
`GameShell` (client component) imports `GameCanvas` through `next/dynamic` with `ssr: false`. WebGL support is read once with `useSyncExternalStore` (server snapshot = "checking") so there is no hydration mismatch and no effect-driven setState. Without WebGL the page renders `WebGLFallback` with a link to `/projects`. Renderer exceptions are caught by `SceneErrorBoundary`.

## Content separation
`src/data/*` contains only verified content and map data. Nothing in `src/game/*` or `src/components/game/*` knows what a project is beyond its id, name and route. Unknown details are listed under `pending` and rendered as "Pending information", never filled in.

## CI
`.github/workflows/ci.yml`: pnpm 10 + Node 22, `install --frozen-lockfile`, lint, typecheck, unit tests, build, Playwright (Chromium with SwiftShader flags from the config), report uploaded on failure.

## Metadata
`src/lib/site.ts` reads `NEXT_PUBLIC_SITE_URL`; when set, `metadataBase`, canonical URLs and the sitemap use it, otherwise absolute URLs are omitted (never invented). Root layout defines Open Graph and Twitter cards with the preview image; project pages get per-project descriptions and canonicals; `robots.ts` and `sitemap.ts` are static routes.

## Testing
- **Unit (vitest, 49 tests):** car physics (frame-rate independence, caps, braking, clamped gaps), collisions, proximity hysteresis, input mapping, camera damping, store transitions, data integrity, map reachability (entrances on roads, no building on a road, spawn clear), deterministic props.
  Sprint 02 added: collision inside sub-steps (no tunneling at 10 fps, soft bump, ejection), signposts (coverage, off-road, side detection), content integrity (taglines, flow ids, media and CV files exist, focus→project links, preview image).
- **E2E (Playwright, 10 tests, one worker, Chromium with SwiftShader):** desktop project: full run, reset car, HTML routes + metadata + robots, WebGL fallback, dialog focus cycle (initial focus, Tab/Shift+Tab wrap, inert background, restore to opener), backdrop click, WebGL context loss/restore. Mobile project (Pixel 7 emulation): intro portrait + landscape without overflow, touch controls move the car, full-width sheet with sticky header, reduced motion.
- `pnpm check` runs lint, typecheck, unit tests, build and e2e.
