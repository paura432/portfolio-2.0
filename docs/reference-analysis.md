# Reference analysis: driving-portfolio patterns (PAU WORLD)

Researched 2026-10-10 by fetching each repo's README, package.json, LICENSE and key source files, the npm registry, three.js sources and the cyber-ocean production bundle. Visual identities were not copied; only technical patterns were extracted.

## 1. brunosimon/folio-2025 — MIT
- **Stack:** vanilla three.js ^0.183 (WebGPURenderer + TSL), @dimforge/rapier3d ^0.17, Vite 7, gsap, howler, camera-controls. No React.
- **Architecture:** `Game` singleton owning subsystems. A single `Ticker` emits a `tick` with priority-ordered listeners (inputs → player → vehicle → physics → zones → camera → render). Data-driven world (`data/projects.js`).
- **Game loop:** variable timestep from `setAnimationLoop`; `delta = min(elapsed - prev, 1/30)` so a tab regaining focus does not teleport physics. 30-sample rolling delta average.
- **Rendering:** one directional light with shadows (2048 desktop / 512 mobile) that re-positions each tick around the view focus so the shadow frustum stays tight. Fog colour equals background colour. Custom stylised material. Post: DOF + bloom (the costly part).
- **Vehicle:** Rapier raycast vehicle; engine force scaled by overspeed; idle brake; `updateVehicle(min(1/60, deltaAverage))`.
- **Input:** flat `pressed[]` of `event.code`, ignores typing in inputs, clears on `blur`. Action booleans rebuilt every tick.
- **Camera:** focus point `smoothed.lerp(target, delta * 10)`; spherical offset; speed-based zoom-out; `lookAt(smoothedFocus)`.
- **Proximity:** per-tick distance check against zone radius with an `isIn` flag so enter/leave fire only on transitions. No hysteresis.
- **Performance:** two-level static quality tier (UA sniff) controlling shadow map size and bloom mips. Compressed GLB + KTX2.

## 2. brunosimon/folio-2019 — MIT
- **Stack:** three ^0.164, cannon ^0.6, gsap, Vite 5.
- **Game loop:** rAF, delta in ms clamped to 60 ms.
- **Rendering:** WebGLRenderer, hard-coded pixel ratio 2, EffectComposer blur + glow passes, matcap materials, baked floor shadow.
- **Vehicle:** `CANNON.RaycastVehicle`, variable physics step, engine force on rear wheels, steering ramps by delta.
- **Input:** `actions` object of booleans switched on `event.code` (Arrows + WASD), reset on `visibilitychange`.
- **Camera:** `eased += (target - eased) * 0.15` per tick → frame-rate dependent (anti-pattern we avoid).
- **Proximity:** axis-aligned rectangles tested each tick with `isIn` transition flag.

## 3. pmndrs/racing-game — MIT
- **Stack:** React 18, @react-three/fiber 8, drei 9, @react-three/cannon 6, zustand 3, three 0.139 (old versions).
- **Architecture:** everything is a component under `<Canvas><Physics>`; UI outside Canvas; single Zustand store.
- **State:** UI booleans in reactive state; `controls` in Zustand state (re-render per key change — anti-pattern); a plain `mutation` object for per-frame values (speed, velocity) to avoid overhead.
- **Input:** window keydown/keyup → action map; ignores INPUT targets.
- **Camera:** `camera.position.lerp(target, delta)` + sway (lerp factor = raw dt, not exponential).
- **Rendering:** `<Canvas dpr={[1, dpr]} shadows>`, ambient 0.1 + one directional light (4096 shadow, target attached to vehicle), fog, drei Sky/Environment. No post-processing.
- **Proximity:** cannon sensor boxes with `onCollideBegin` writing to the store. A huge bounding box keeps the car inside the map.

## 4. MMubazar/car-game — NO LICENSE (all rights reserved)
- Derived from folio-2025 structure (same Ticker/priority pattern) with three ^0.183 WebGPU + Rapier, procedural world, vitest + playwright smoke tests.
- **Game loop:** same `min(delta, 1/30)` clamp.
- **Rendering:** directional light used only for the shadow map; stylised TSL material; light follows the car with a ±22 shadow frustum.
- **Camera:** focus point with speed lead; frame-rate-independent damping `x += diff * (1 - pow(smoothing, delta))`; speed-based radius.
- **Proximity:** pure function `resolveActiveZone(zones, pos, currentId, hysteresis = 1.25)`; XZ distance; active zone keeps a larger exit radius; single active zone; unit-tested.
- **HTML panels:** static DOM card filled on enter; CSS class toggles fade; content stays mounted during fade-out.
- **License:** none → ideas only, no code copied.

## 5. pmndrs/react-three-rapier — MIT
- Latest 2.2.0 (rapier3d-compat 0.19). Peers: react ^19, three >=0.159, fiber ^9.0.4.
- `<Physics>` must be inside Suspense (lazy WASM init, ~2 MB). `RigidBody` types fixed/dynamic/kinematic; sensors with `onIntersectionEnter/Exit`; `KinematicCharacterController` available from rapier for move-and-slide.
- Default `timeStep` 1/60; `"vary"` discouraged (unstable, non-deterministic).

## 6. three.js
- Current r186; npm three 0.186.1, @types/three 0.186.0 (keep in lockstep).
- `Fog(color, near, far)` linear; set `scene.background` to the same colour so the horizon dissolves.
- `WebGLRenderer` default toneMapping is `NoToneMapping`; ACESFilmic/AgX/Neutral available.
- `InstancedMesh(geometry, material, count)` → one draw call for N instances; `setMatrixAt` + `instanceMatrix.needsUpdate`.

## 7. cyber-ocean.vercel.app — visual approach only
- Vite + vanilla three.js. Uses FogExp2, ACESFilmic tone mapping, many InstancedMesh, EffectComposer.
- HUD frame, grid overlay and vignette are CSS over the canvas, not post-processing. Takeaway: atmosphere from fog + tone mapping; polish from cheap DOM/CSS.

## Versions verified on the npm registry (2026-10-10)
| package | version | notes |
|---|---|---|
| next | 16.4.0 | peers react ^18.2 or ^19 |
| react / react-dom | 19.3.0 | |
| three | 0.186.1 | |
| @react-three/fiber | 9.8.1 | peers react >=19 <19.4, three >=0.156 |
| @react-three/drei | 10.7.9 | peers react ^19, three >=0.159, fiber ^9 |
| @react-three/rapier | 2.2.0 | not installed (see decision below) |
| zustand | 5.0.15 | fiber already depends on zustand ^5 |
| tailwindcss | 4.3.3 | |
| vitest | 5.0.3 | |
| @playwright/test | 1.64.0 | |
| typescript | 5.9.3 | 7.0.2 exists but the Next 16 toolchain is validated against 5.x |
| @types/three | 0.186.0 | |

## Patterns adopted for PAU WORLD (and why)
1. **Kinematic arcade car, no physics engine.** All references use a raycast vehicle because they want suspension, jumps and flips. PAU WORLD drives on a flat platform against static buildings. A dt-based arcade model (`speed += accel·dt`, drag, `heading += steer·speedFactor·dt`, `pos += forward·speed·dt`) is deterministic, tunable, unit-testable, and avoids ~2 MB of WASM plus Suspense gating. dt is clamped to 1/30 (folio-2025, car-game) so tab switches do not teleport. Upgrade path: @react-three/rapier with a kinematic body if ramps or dynamic props arrive.
2. **Camera follow:** damped focus point + offset behind the car, using `a = 1 - exp(-k·dt)` so it is frame-rate independent (unlike folio-2019 and racing-game). Focus leads the car with speed; slight pull-back with speed.
3. **Proximity:** data-defined zones; XZ distance with hysteresis (exit radius > enter radius); nearest wins; the store is written only on transitions so React re-renders only when the prompt changes. Pure function, unit-tested.
4. **Input:** booleans in a mutable module object written by window keydown/keyup on `event.code` (Arrows + WASD + E + Esc), ignoring editable targets, cleared on `blur`/`visibilitychange`. Nothing per-key goes through React state. Touch buttons write the same object.
5. **Rendering:** hemisphere + one directional light with a modest shadow map in "high" quality, linear fog with the same colour as the background, flat-shaded standard materials, no post-processing, `dpr` clamped to [1, 1.5], InstancedMesh for trees and lamps.
6. **Collisions without physics:** buildings as AABBs derived from the same district data as the visuals; car as a circle; push-out along the shortest axis with velocity damping; platform boundary clamp.

## Licensing summary
folio-2025, folio-2019, racing-game, react-three-rapier and three.js are MIT. MMubazar/car-game has no license and cyber-ocean has none visible: ideas only. No code, models or textures were copied from any reference; all geometry in PAU WORLD is procedural primitives.
