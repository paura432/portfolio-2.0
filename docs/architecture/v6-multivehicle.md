# V6 · Multi-vehicle architecture

Branch `feat/v6-ocean-multivehicle`, built on `feat/v5-4geeks-ai-campus` at `4d13d9b` (V3 + V4 + V5 are linear on that branch; `main` is 22 commits behind it and has nothing newer).

## Goal

One world, one canvas, one scene. The car and the boat are two vehicles of the same game; the player switches between them at harbors, each vehicle keeps its own position, and only one answers to the controls at a time.

## State: one machine, not two

The game store (`src/stores/gameStore.ts`) already owned the phases `intro · playing · panel · menu`. V6 adds a vehicle slice to the same store instead of a second machine:

| Field | Meaning |
|---|---|
| `activeVehicle` | `"car"` or `"boat"`: the vehicle that owns the camera and the controls |
| `transition` | `null` or `{ kind, from, to, harbor, duration }` while a hand-over runs (`board`, `disembark`, `moor`, `cast-off`) |
| `mooredAt` | harbor id when the boat is tied up at a pier that has no land vehicle (the player is "on the pier") |
| `nearbyHarbor` | harbor whose boarding zone the car is inside |
| `nearbyDock` | harbor whose docking zone the boat is inside |
| `openPoi` | island point of interest whose panel is open (same `panel` phase as districts) |

The explicit vehicle modes requested by the brief are **derived**, never stored, by `resolveVehicleMode(phase, slice)` in `src/game/vehicle/vehicleManager.ts`:

```
phase ≠ playing                     → vehicle-paused
transition.kind = board             → boarding
transition.kind = disembark         → disembarking
transition.kind = moor              → docking
car  + nearbyHarbor                 → approaching-dock
car                                 → driving-car
boat + (mooredAt | nearbyDock)      → docking
boat                                → driving-boat
```

`canControl(vehicle, phase, slice)` is the single rule every controller obeys: active vehicle, playing, no transition, boat not moored. The HUD exposes the mode as `data-vehicle-mode` for tests.

## Modules

```
GameCanvas
 ├─ Ocean            clock, grid, uniforms (wake)          useFrame -5
 ├─ VehicleController transition clock, mooring glide      useFrame -4
 ├─ Car              physics + visuals, gated by canControl useFrame -3
 ├─ Boat             physics + buoyancy + wake trail        useFrame -3
 ├─ BoatSpray        pooled stern puffs                     useFrame -2.3
 ├─ ProximitySensor  districts, labs, harbors, docks        useFrame -2
 └─ FollowCamera     active vehicle profile + blend         useFrame -1
```

- `src/game/vehicle/vehicleManager.ts`: modes, control rule, boarding/docking rules, transition factory, `poseOf(vehicle)` for the camera/minimap/sensors, the transition clock.
- `src/game/vehicle/carState.ts` / `boatState.ts`: live state singletons (mutable, outside React), `resetCar` / `resetBoat` / `placeBoat`.
- `src/game/vehicle/resetVehicle.ts`: the R key / HUD reset for whichever vehicle is active; cancels a transition in flight first.
- `src/game/vehicle/boatPhysics.ts`, `buoyancy.ts`: pure models (see `docs/gameplay/v6-boat-physics.md`).
- `src/game/world/seaObstacles.ts`: boat colliders (coast polygons, pier boxes, navigation bounds).
- `src/game/world/obstacles.ts`: car colliders; the drive area is now the union of the platform and the quay.
- `src/data/archipelago.ts`: islands, coastlines, harbors, docking/boarding zones, moorings, points of interest, water level, sea bounds. One entry per island; nothing else to touch for a new one.

## Transitions

| Trigger | Precondition | Effect |
|---|---|---|
| E in a boarding zone | car active, `|speed| ≤ 2.5` | `board` (1.5 s) → boat active; car stays parked where it stopped |
| E in a docking zone | boat active, `speed ≤ 4`, not moored | `disembark` (1.5 s) if the harbor has a car and the car is parked within 26 u of its pier root → car active; otherwise `moor` (1.0 s) → `mooredAt` |
| E while moored | | opens the island point-of-interest panel |
| W / ▲ / "Cast off" while moored | playing, no transition | `cast-off` (0.6 s) → sailing |
| R / "Reset" | | cancels any transition, lands on the origin vehicle, then resets it (car → spawn, boat → nearest mooring) |

During `moor` and `disembark` the `VehicleController` glides the hull onto the harbor mooring so a docked boat always sits alongside the pier. The car is never moved by a transition. The car cannot be at a harbor it did not drive to, so docking at the second island always moors.

Camera: `FollowCamera` frames the destination vehicle from the first frame of a vehicle-changing transition and eases from its current framing to the new profile (`profilesFor(vehicle)` in `followCamera.ts`, with portrait variants); when the transition ends the usual exponential damping continues with no seam. Vehicle resets snap (generation counter per vehicle).

Prompts: `VehiclePrompt` polls the live speed once per animation frame and shows `Board the boat` / `Dock` / `Dock and drive` only while the rule holds, so a fast drive-through never shows it; the store re-checks the same rule when E is pressed.

## Error states

- Panel or menu open: `canControl` is false, both vehicles stop dead, transitions pause (the transition clock only advances while playing).
- Quality change: the ocean grid is rebuilt and the old one disposed; vehicles, wake and transitions are untouched (unit + E2E coverage).
- WebGL context loss: the live state lives outside React; the canvas remount re-reads it.
- Reset during a transition: `cancelTransition` lands on the `from` vehicle; the player is never left without a controllable vehicle.
- Viewport change: `configForAspect` blends landscape/portrait per vehicle profile.
- Window blur: `inputState.clear()` (existing) releases every key; a running transition completes on its own.
- Boat pressed against a coast with no way through for 2 s: nudged toward open water (`openWaterDirection`).

## Probe (tests and capture tooling)

`window.__pauWorld` gains `boat()`, `vehicle()`, `teleportBoat(x, z, heading)` and `water(x, z)` (the same height function the hull floats on). Teleports stage scenarios; every transition in the E2E runs through the real E key.
