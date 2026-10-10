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
useFrame(Car, -3):  stepCar ─► resolveCollisions ─► liveCar.state ─► car mesh
useFrame(Proximity, -2): resolveActiveZone(liveCar) ─► store.setNearby (only on change)
useFrame(Camera, -1):   desiredCamera(liveCar) ─► damp ─► camera
store.phase ──► Car reads it with getState() each frame: "playing" drives, anything else stops
HUD / Panel / Menu ──► subscribe to store slices (React re-renders only on transitions)
```
- Per-frame values never enter React state. The store changes only on transitions (enter/leave zone, open/close panel, phase).
- Negative `useFrame` priorities keep fiber's automatic render loop while fixing the order car → proximity → camera.
- The same `districts.ts` entry produces the building visuals, the collision shape, the interaction zone, the sign, the menu entry and the HTML route. Changing one number moves everything together.

## Rendering and performance
- `dpr` clamped to [1, 1.5] in high quality, 1 in reduced. `PerformanceMonitor` flips to reduced automatically when the frame rate drops; the HUD button toggles it manually.
- Shadows only in high quality (`castShadow` on the directional light; no canvas remount).
- One draw call each for trees (×2), lamp posts, lamp heads and each window grid (`InstancedMesh`).
- No post-processing, no textures or models loaded from the network. The only textures are canvas-rendered signs.
- Fog colour = background colour so the island edge dissolves.

## Client-only rendering
`GameShell` (client component) imports `GameCanvas` through `next/dynamic` with `ssr: false`. WebGL support is read once with `useSyncExternalStore` (server snapshot = "checking") so there is no hydration mismatch and no effect-driven setState. Without WebGL the page renders `WebGLFallback` with a link to `/projects`. Renderer exceptions are caught by `SceneErrorBoundary`.

## Content separation
`src/data/*` contains only verified content and map data. Nothing in `src/game/*` or `src/components/game/*` knows what a project is beyond its id, name and route. Unknown details are listed under `pending` and rendered as "Pending information", never filled in.

## Testing
- **Unit (vitest, 37 tests):** car physics (frame-rate independence, caps, braking, clamped gaps), collisions, proximity hysteresis, input mapping, camera damping, store transitions, data integrity, map reachability (entrances on roads, no building on a road, spawn clear), deterministic props.
- **E2E (Playwright, 3 tests, Chromium with SwiftShader):** full run (intro → drive → prompt → E → panel → driving blocked → Esc → driving resumes → menu → panel → close → page route), HTML routes incl. 404, WebGL-unavailable fallback.
- `pnpm check` runs lint, typecheck, unit tests, build and e2e.
