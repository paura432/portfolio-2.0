# V4 — Destructible trees

How the car knocks trees down: identity, collision, state machine, animation, rendering and restoration. Everything below is implemented and covered by `src/game/world/*.test.ts` and `e2e/trees.spec.ts`; numbers are the shipped defaults in `TREE_CONFIG`.

## 1. Identity (`src/game/world/trees.ts`)

- `generateTrees(140)` is deterministic (seed `20261010`). `treeDefs()` generates it once and gives every tree `id = index` in that list.
- Quality tiers render a **prefix** of the list (`visibleTreeCount(fraction)`: 140 / 112 / 77). Species are split per instanced mesh. Neither changes an id, so dynamic state keyed by id survives HIGH ↔ MEDIUM ↔ LOW and is never attributed to a neighbour.
- Data, identity, dynamic state, colliders and visuals are separate objects: `TreeDef` (data + id), `TreeState` (per id, in `TreeWorld.states`), `TreeGrid` (spatial hash over the defs), `Layout` in `Trees.tsx` (id → instance slots).

## 2. Collision (`treeWorld.ts` + `obstacles.ts`)

- The car constraint is unchanged in shape (`Constrain`), but now receives a `StepInfo` (previous position, speed, heading, sub-step dt) and may return a new `speed`. Simple `(x, z) => …` constraints still work (existing tests untouched).
- `constrainCar` = buildings + island edge (rigid, as before) **then** `treeWorld.constrain`. Trunks are circles of radius `0.34·scale + 0.1`; the car is the same 1.3 circle as before.
- Candidates come from `TreeGrid.query(x, z, carRadius + maxTrunkRadius)` (8-unit cells), never the full list.
- `approach = speed · (forward · n)` where `n` points from the car to the trunk, so reversing into a tree and glancing blows are handled by the same formula.

| Approach speed | Reaction | Car |
|---|---|---|
| < 6 u/s | **shake** (damped oscillation, ≤ 0.14 rad, 0.9 s), trunk stays rigid | pushed out, bumps back (restitution 0.2, as walls) |
| 6 – 13 u/s | **topple**: falls away from the car (forward, plus a sideways component for off-centre hits) | keeps 65 % of its speed and drives through |
| ≥ 13 u/s | **break**: trunk snaps at 0.6 of its height; stump stays, upper trunk + canopy fall and slide | keeps 70 % |

Thresholds were validated by real driving: contact speed from a standing start over a run-up `d` is ≈ √(32·d) (acceleration 16 u/s²), so a 0.8-unit nudge ≈ 4.4 u/s (shake), 3.5 units ≈ 10.6 (topple), 12 units ≈ 19.6 (break). The capture scripts and the E2E test use exactly those starts; measured contact speeds were 4.6 / 11.0 / 19.7–19.8 u/s.

Once a tree is `falling`, `fallen` or `respawning` it is **not** an obstacle and produces no further events (tested: driving over it four more times emits nothing).

## 3. State machine

```
standing ──shake──▶ shaking ──0.9 s──▶ standing
standing ──topple/break──▶ falling ──rest angle──▶ fallen ──time ∧ distance──▶ respawning ──1.1 s──▶ standing
```

- Transitions happen only on impact events or on the fixed-step clock (1/120 s, accumulator), never from React. `Trees.tsx` mirrors state into meshes only for ids in the dirty set.
- `falling`: pivoting trunk under gravity (`ω̇ = 6.5·sin θ`, initial kick 0.45 rad/s or 0.9 when snapped, + 0.03·impact), one bounce at the rest angle (restitution 0.28, max 2), then `fallen`. Rest angle by species: pine 1.32, round 1.22, tiered 1.26 rad (canopy on the ground, nothing through it). Snapped trunks also slide ≤ 0.5 units.
- Frame-rate independence: the same fall at 30, 60 and 144 fps ends at the same angle, bounce count and settle time (± one frame) — tested.
- `prefers-reduced-motion`: linear tilt to rest in 0.35 s, no bounce, no car/camera jolt (particles stay).

## 4. Restoration

- A fallen tree waits 25 s, then regrows the first time the car is ≥ 28 units away (no pop-in in front of the camera; the follow camera sits ~12 units behind the car).
- More than 24 fallen trees: the oldest regrows early (same distance rule).
- **Reset world** (HUD button, enabled only while trees are down): every damaged tree regrows now, except trees within 4.5 units of the car, which regrow the moment the car drives off. **Reset car** does not touch trees (tested).
- Regrowth is a 1.1 s scale-up from the ground, then the tree is a rigid obstacle again.

## 5. Rendering (`src/components/game/Trees.tsx`, `treeRig.ts`)

- Standing **and fallen** trees are instances: five instanced meshes (trunks, pine, round, tierLow, tierHigh). A fallen tree is just a different matrix in the same slot; a snapped trunk uses its slot for the stump and one of 24 spare trunk slots for the upper half.
- While a tree is `shaking`, `falling` or `respawning` its slots are zero-scaled and one of 8 pooled dynamic mesh sets (trunk, stump, upper, two canopies; shared geometries, tinted canopy materials) is driven from the same `partMatrix()` rig, so the tree never changes shape when it switches representation.
- Matrices are written only when a tree is dirty; a tier change rebuilds the layout once and re-applies the live state. The pool and the spare slots are released on restore. Nothing animated is ever inside a `StaticBatch`.
- Ambient canopy sway is a vertex-shader displacement on the instanced canopy material (see `docs/art-direction/v4-reactive-world.md`), not matrix updates.

## 6. Feedback

- Events (`shake`, `topple`, `break`, `settle`, `respawn`, `restore`) go through `impactBus` once per frame: particles (`ImpactParticles.tsx`), a decaying car-body shudder, a small camera nudge, and — only on impacts — a store update for the HUD toast and the "Reset world" counter.
- Audio: none (the brief allows it only behind an explicit preference; not added).

## 7. Probe for tests and tooling

`window.__pauWorld.trees`: `def(id)`, `state(id)`, `nearest(x, z)`, `summary()`, `reset()`, `timeScale(k)` (capture only). `stats()` adds `dynamicTrees`, `fallenTrees`, `particles`.

## 8. Limits and known behaviour

- Max 8 trees animating at once; beyond that a hit is a rigid bump (no fall) rather than an invisible tree.
- Max 24 snapped trees lying with their upper half; a 25th would show stump + canopy only until a slot frees (not reached in testing because of the fallen cap).
- A toppled tree can land across the car if the player stops under it; it is cosmetic (no collision with fallen trees).
- Rapier was not added: the kinematic model above gives the required result with zero WASM, no second physics world and deterministic tests.
