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

A blocked sub-step bounces back softly (20 % of the speed, reversed) only when the contact is head-on (|forward · normal| > 0.6, the normal being the push-out direction); a glancing contact keeps the speed minus a scrape friction proportional to how hard the car presses (`SLIDE_FRICTION` 0.35 · |dot| per sub-step, floor 30 %), so the car slides along facades, kerbs and trunks. With the throttle held a crawling car keeps 35 % of its turn rate (`LOW_SPEED_STEER`), so it can pivot out of a tight spot; a stationary car with no throttle does not rotate. These two rules (iteration 2) closed the wedge P0: `wedgeSweep.ts`.

**Multi-contact resolution (iteration 3).** `resolveCollisions` repeats its pass over the obstacle list until nothing moves the circle (at most `MAX_PASSES` = 4), so pushing out of one body never leaves the car inside its neighbour (corners, touching boxes). The last pass runs in reverse, so in a pocket narrower than the car the earliest obstacles in the list (the buildings) have the final word: the car may overlap a bench, never a facade. `contacts.test.ts` covers the corner, the seam between touching boxes, a rotated bench against a building, reverse into a wall, scrape along a wall, 30/60/144 fps and separation from a pre-existing double penetration.

## Oriented boxes

`resolveCircleObb` takes the circle into the box's frame (inverse yaw), resolves against an axis-aligned box there and rotates the push back. Exact for any yaw; `collision.test.ts` covers the long and short sides and the inside-ejection case. Used for benches (0.85 × 0.3 half extents) and planters (0.95 × 0.95).

## Compound colliders and the aircraft

The hangar's three walls let the car drive in. The aircraft must still not land on the roof, so `landing.ts` adds `SKYPORT_ROOFS` (the hangar's whole footprint) to its exclusion check only; the car never sees it.

## Height field

`groundHeightAt(x, z)` is the one answer to "how high is the ground": ramp profile on a slope, beach profile on the sand (edge → drop over `length`, then run-out to the sea floor), 0 on built land, the sea floor elsewhere. From it: `waterDepthAt`, `terrainClassAt`, `isShoreAt` (ground strictly between the land and the sea floor) and `seawardDirectionAt` (minus the gradient). The vehicle's transformation rules read these, never a beach id.

## Debug tooling

`DebugColliders.tsx` draws every static collider (red wireframe), the drive areas (cyan), the ramp corridors (amber), the beach footprints (sand), the trunks and the live prop colliders (red when solid, grey when down), the car's circle (green), the last 24 contact points (magenta dots) and their contact normals (magenta segments from the penetration point along the push, longer for deeper corrections).

**Telemetry (`src/game/physics/debugLog.ts`, iteration 3).** Two ring buffers, free while disabled: one vehicle sample per frame (state, authority, mode, phase, x / y / z, heading, speed, throttle / steer / brake, driving, number of contacts that frame, blocked) and one entry per contact (what was hit — obstacle id, "tree", "prop", "boundary", "ramp" —, position before and after the resolution, correction depth, normal, heading, speed before and after, and the reason the step counted as blocked or yielded). Read on demand through the probe: `debug.telemetry(true)`, `debug.samples(n)`, `debug.contactLog(n)`, `debug.clearLog()`. Nothing is printed per frame. It mounts only when `debugColliders` is set in the store, which only the probe (`window.__pauWorld.debug.colliders(true)`) or `?debug=colliders` in a development build can do. Production visitors never see it.

## Open points (see the inventory §6)

Bollards, bushes, signposts, masts and sign posts are catalogued but not yet active (COL-02, COL-03); runway lights and approach piles are P2.

## Camera occlusion (iteration 6, CAM-01)

`src/game/camera/cameraClip.ts` casts the segment from the car to the follow camera's wanted position against the static occluders (every static collider except the ramp rails, as vertical prisms: boxes, the round hub, oriented boxes) and returns the fraction of the segment the camera may use, minus 0.8 u of clearance, never below 8 %. `FollowCamera` pulls the wanted position in along that line (eased in with λ 14, let out with λ 2.5, snapped on resets and teleports), and lifts it by up to 3.5 u while pulled in so the car stays in view over the facade. The aircraft above 8 u of ground clearance is exempt. The probe reports the live camera and whether it sits inside an occluder (`debug.camera()`).
