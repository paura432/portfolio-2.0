# V9 · Collision system

Status: iteration 1 draft (updated each loop iteration; see `docs/qa/v9-world-audit-state.json`).

## Principles

- **One authority per body, one constraint per sub-step.** The car integrates in sub-steps of at most 1/30 s (`stepCar`) and calls one constraint after each; the constraint returns the corrected position, whether something rigid was hit, and optionally a new speed when something yielded. The boat and the aircraft keep their V6/V7 constraints (coast polygons, pier boxes, altitude floors).
- **Shapes fit the geometry, never triangles.** Circle, axis-aligned box, oriented box, compound (several obstacles with one id), height field (ramps and beaches), polygon (coasts, boat only). Each is a closed-form push-out along the shortest axis (`src/game/physics/collision.ts`).
- **Data drives both the mesh and the body.** Buildings come from `districts.ts` / `skyport.ts`; furniture from `props.ts` placements shared with `propDefs()`; ramps and beaches from `ramps.ts` / `beaches.ts` through `groundHeightAt`. There is no second description of the world for physics.

## The car's constraint (`constrainCar` → `constrainVehicle`)

Order per sub-step:

1. **Static colliders** (`obstacles`): districts (box + 1.0 padding; the hub pavilion round), campus labs, the harbor cabin (+0.6), the Skyport buildings (+0.8) — the hangar as three walls (back, left, right) so its open front is open; the tower as its shaft — and the six ramp side rails.
2. **Drive-area clamp** (`clampToDriveArea`): the union of seven rectangles (platform, quay, causeway, Skyport slab, three beaches). Rectangles overlap by more than a car diameter so seams never trap.
3. **Trees** (`treeWorld.constrain`, V4): standing trunks are rigid circles; above the topple speed they yield and the car keeps 65–70 % of its speed.
4. **Street furniture** (`propWorld.constrain`, V9): solid props push the car out (circle for posts, oriented box for benches and planters, in the prop's local frame); above the category's `knock` speed they yield (`retain` fraction kept); between `shove` and `knock` heavy props slide along the push and stay solid.
5. **Ramp bodies** (`constrainRampBodies`, V8): the slope is solid from every side but its approach.

A blocked sub-step reverses 20 % of the speed (soft bump). The debug contact log records what was touched when the overlay is on.

## Oriented boxes

`resolveCircleObb` takes the circle into the box's frame (inverse yaw), resolves against an axis-aligned box there and rotates the push back. Exact for any yaw; `collision.test.ts` covers the long and short sides and the inside-ejection case. Used for benches (0.85 × 0.3 half extents) and planters (0.95 × 0.95).

## Compound colliders and the aircraft

The hangar's three walls let the car drive in. The aircraft must still not land on the roof, so `landing.ts` adds `SKYPORT_ROOFS` (the hangar's whole footprint) to its exclusion check only; the car never sees it.

## Height field

`groundHeightAt(x, z)` is the one answer to "how high is the ground": ramp profile on a slope, beach profile on the sand (edge → drop over `length`, then run-out to the sea floor), 0 on built land, the sea floor elsewhere. From it: `waterDepthAt`, `terrainClassAt`, `isShoreAt` (ground strictly between the land and the sea floor) and `seawardDirectionAt` (minus the gradient). The vehicle's transformation rules read these, never a beach id.

## Debug tooling

`DebugColliders.tsx` draws every static collider (red wireframe), the drive areas (cyan), the ramp corridors (amber), the beach footprints (sand), the trunks and the live prop colliders (red when solid, grey when down), the car's circle (green) and the last 24 contacts (magenta). It mounts only when `debugColliders` is set in the store, which only the probe (`window.__pauWorld.debug.colliders(true)`) or `?debug=colliders` in a development build can do. Production visitors never see it.

## Open points (see the inventory §6)

Bollards, bushes, signposts, masts and sign posts are catalogued but not yet active (COL-02, COL-03); runway lights and approach piles are P2.
