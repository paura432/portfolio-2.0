# V9 · World object inventory

Branch `feat/v9-world-physics-destruction`, from `9f93b38` (the validated V8 + editorial integration). Every count below was produced by walking the generators and data that the renderer itself consumes (`src/data/*.ts`, `src/game/world/props.ts`, `signposts.ts`, `urban.ts`), not estimated. The script that produced the raw numbers is reproduced as the V9 unit tests (`propWorld.test.ts` asserts the counts; `beachRuns.test.ts` and `rampRuns.test.ts` walk the beaches and ramps). Identifiers are the ones the code uses.

## 1. Beaches (drivable shore stretches)

| Id | Island | Edge (x, z → x, z) | Seaward | Width | Slope length / drop | Enter depth reached at (u from the edge) | Exit depth at | Blockers in the drive rectangle |
|---|---|---|---|---:|---|---:|---:|---|
| `south-beach` | main | (12, 66) → (40, 66) | +Z | 28 | 18 / 2.6 | 11.5 | 9.7 | none (0 trees, 0 lamps, 0 building colliders) |
| `east-beach` | main | (66, 14) → (66, 42) | +X | 28 | 18 / 2.6 | 11.5 | 9.7 | none |
| `skyport-beach` | skyport | (112, 36) → (138, 36) | +Z | 26 | 16 / 2.6 | 10.2 | 8.7 | none |

Shore profile (centre line of each main-island beach): along 0 → sand (depth −1.1), 4 → wet sand (−0.52), 8 → shallow water (0.06), 12 → shallow (0.63), 16 → deep (1.21), 18 → deep (1.5); the car's drive rectangle ends at ≈ 21 u (depth ≈ 2.1). Skyport Beach is 2 u shorter and reaches the same depths earlier.

**Other shore stretches reachable by car:** none. The rest of the main island's edge is the rocky skirt behind a 4 u margin (`PLATFORM.driveHalfSize` 62 vs 66), the quay is a vertical concrete face with coping (the car stops 2.5 u before it), the causeway has railings, the Skyport slab has a 2 u margin to its skirt. Creative Lab Island is reached by boat only (no car surface). Three beaches is therefore the complete inventory; V9 makes the rule independent of this list (see `docs/gameplay/v9-universal-beaches.md` when written): the shore is detected from the height field (`isShoreAt`, `seawardDirectionAt`), so a fourth beach is one data entry with no rule change.

## 2. Launch ramps

| Id | Entry (x, z) | Lip (x, z) | Heading | Approach / slope / lip height | Lip angle | Entry to nearest road | Corridor clear | Beyond the lip |
|---|---|---|---|---|---:|---:|---|---|
| `west-ramp` | (−53, 10) | (−53, 54) | +Z (south) | 22 / 22 / 5.5 | 21.8° | 6.5 u | yes (0 buildings, 0 trees, 0 lamps, 0 unreachable samples) | turf 4–10 u, then the skirt and the open sea (depth 3.1) |
| `campus-ramp` | (53, −42) | (53, −8) | +Z (south) | 12 / 22 / 5.5 | 21.8° | 9.5 u (turf from the ring road corner) | yes | pavement 4 u, the east cross road at 10 u, turf 20–45 u, then the south coast |
| `skyport-ramp` | (124, −9) = the pad | (194, −9) | +X (east) | 50 (the runway) / 20 / 5 | 21.8° | 0 (on the apron road) | yes | slab 4 u, then the open sea (depth 3.1 from 10 u) |

Gate masts (2 per ramp) and sign posts (1 per ramp): `west-ramp` masts (−57.4, 10) (−48.6, 10), sign (−47.3, 11); `campus-ramp` masts (48.6, −42) (57.4, −42), sign (58.7, −41); `skyport-ramp` masts (124, −4.6) (124, −13.4), sign (125, −14.7). None has a collider yet (see §6).

There are no other slopes in the world: the only non-flat drivable ground is the three ramps and the three beaches (`groundHeightAt` returns 0 everywhere else on land), so an ordinary street slope cannot be mistaken for a launch ramp.

## 3. Street furniture and vegetation (main island, generated)

| Category | Count | Reachable by car | On a road | In a building | In a ramp corridor / beach rectangle | Notes |
|---|---:|---:|---:|---:|---|---|
| Trees (`treeDefs`) | 140 | 140 | 0 | 0 | 0 / 0 | 49 pine, 42 round, 49 tiered; destructible since V4 |
| Street lamps (`generateLamps`) | 75 | 67 | 0 | 0 | 0 / 0 | 6 on the causeway deck (x 70–94, z ±4.8), 4 on the Skyport (two inside the runway strip at (120, −13.8) and (120, −4.2)); the 8 unreachable ones stand outside the drive rectangles |
| Bushes | 110 | 110 | 0 | 0 | 0 / 0 | 19 within 0.9 u of a trunk (undergrowth under cluster trees; accepted) |
| Benches | 27 | 27 | 0 | 0 | 0 / 0 | 23 in gardens, 4 on the plaza ring; 4 within 0.9 u of a trunk (GEO-01) |
| Planters | 4 | 4 | 0 | 0 | 0 / 0 | plaza ring at 22.5°, 112.5°, 202.5°, 292.5°, rotated |
| Bollards | 16 | 16 | 0 | 0 | 0 / 0 | two pairs at each of the four plaza exits |
| Gardens (turf discs) | 40 | — | — | — | — | decals, no body |
| Signposts (`buildSignposts`) | 4 posts, 9 panels | 4 | 0 | 0 | — | west (−20, 6.7) 3 panels, east (20, −6.7) 3, north (−6.7, −20) 2, south (6.7, 20) 1 |

Categories named in the brief that do not exist in this world: litter bins (0), crates / boxes (0), decorative fences other than the ramp rails, pier railings and causeway railings (which are structural trim). They are recorded as 0, not invented.

## 4. Other decoration reachable by car (component-defined, not generated)

| Object | Position(s) | Reachable | Collider before V9 | Status |
|---|---|---|---|---|
| Skyport pad masts (4) | (128.7, −4.3) (119.3, −4.3) (119.3, −13.7) (128.7, −13.7) | yes | none | fixed (COL-03, `mast`) |
| Runway edge lights (20), threshold lights (10) | along the runway edges / ends | yes (20 edge lights) | none | open, P2 (COL-06): 0.28 u high fixtures the car rolls over |
| Hangar sign post | (152.2, 11) | yes | none | fixed (COL-03, `signpost`) |
| Harbor gate sign post | (−64.4, −5.6) | yes | none | fixed (COL-03, `signpost`) |
| Windsock | (204, −18) | no (off the slab) | — | n/a |
| Quay bollards, quay lamps, fenders, harbor cabin | quay face x ≈ −75 | no (drive limit x ≥ −73.5); cabin has a box | — | n/a |
| Piers (3) and their bollards, railings, lamps, beacons | pier decks | no (car never reaches a deck) | pier boxes for the boat | n/a |
| Approach-light piles (4) | (206–224, −9), in the sea | boat only | none for the boat | open, P2 (COL-07) |

## 5. Buildings and infrastructure (must stay intact)

| Group | Count | Collider | Visual vs collider |
|---|---:|---|---|
| District buildings | 8 (hub round r 5 + 1.0 padding; 7 boxes, footprint + 1.0 padding) | yes | footprints from `districts.ts`; the hub is drawn as an octagon of radius ≈ 5.4, the box buildings fill their footprints |
| Campus labs (plots) | 4 | yes (boxes + 1.0) | match |
| Skyport | hangar (3 walls, V9), tower shaft (V9), terminal | yes | hangar open front now open to the car; tower cab overhang above the car |
| Harbor cabin | 1 | yes (box + 0.6) | match |
| Ramp rails | 6 (two per ramp) + ramp bodies (`constrainRampBodies`) | yes | match the drawn rails and the slope's footprint |
| Roads (15 segments), paved areas, parking pads (4), curbs, sidewalks, crossings | — | drive-over (no body) | curbs 0.16 u high are rolled over on purpose |
| Drive areas | 7 rectangles (platform, quay, causeway, slab, 3 beaches) | boundary clamp | the car never leaves them |
| Spawns | car (0, 27), Skyport (124, −9) | both free of colliders and inside the drive area | — |

Static collider set: 1 round + 25 boxes (V9: 23 boxes before the hangar split and the tower change). Rotated furniture now uses oriented boxes (benches, planters) resolved in their local frame.

## 6. Findings (P0 none)

| Id | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| NAV-01 | P0 | The car could get wedged on sidewalks between a building's padding box and a trunk or a bench (295 grid points, incl. Duplex and TrustOS forecourt corners): turn authority ∝ speed and every bump reversed the speed | `wedgeSweep.ts` (iteration 2) | **fixed, iteration 2** (car model: low-speed steering floor, sliding contacts; `wedge.test.ts` 0 wedges; `navigation.spec.ts`) |
| COL-01 | P1 | 75 lamps, 27 benches and 4 planters had no collider: the car drove through them | audit script (`reachable`, `collider: []`), V8 `obstacles.ts` | **fixed, iteration 1** (`propWorld`, active categories lamp / planter / bench; E2E `world.spec.ts`) |
| COL-02 | P1 | 16 bollards, 110 bushes, 4 signposts have no collider | same | **fixed, iteration 4** (all catalogue categories active in `propWorld`; bushes yield at walking pace so foliage never traps the car) |
| COL-03 | P1 | Skyport pad masts (4), ramp gate masts (6), ramp sign posts (3), hangar sign post, harbor gate sign post have no collider | §4 | **fixed, iteration 4** (`fixtures.ts` shares the 19 positions between the components and the simulation; `DynamicFixture` places and tilts the drawn posts from the prop pose; `fixtures.test.ts`) |
| COL-04 | P1 | The hangar's box collider closed its 16.8 u open front: an invisible wall | `hangarOpenFront` in the audit, `Skyport.tsx` | **fixed, iteration 1** (three wall colliders; `SKYPORT_ROOFS` keeps the aircraft's floor over it; `landing.test.ts`) |
| COL-05 | P2 | Tower collider 5 × 5 + 0.8 around a 3.8 × 3.8 shaft | `SKYPORT.tower` | **fixed, iteration 1** (shaft footprint) |
| COL-06 | P2 | Runway edge / threshold lights (30) have no collider | §4 | open (decision: fixtures 0.28 u high, rolled over; a `fixture` category would be cosmetic) |
| COL-07 | P2 | Approach-light piles (4) are not boat colliders | §4 | open |
| COL-08 | P2 | A slow hop off the Skyport ramp lip is pulled back onto the slab by the drive-area clamp while airborne | `rampRuns` "beyond the lip" + `clampToDriveArea` | open |
| GEO-01 | P2 | 4 benches overlap a tree trunk: (54.9, 40.0), (−51.4, −19.9), (−49.6, −46.1), (26.8, 52.4) | audit `nearTree` | open |
| GEO-02 | P3 | 19 bushes within 0.9 u of a trunk | audit | accepted (undergrowth) |
| GEO-03 | P2 | Two lamps stand inside the Skyport runway strip, beside the pad road: (120, −13.8), (120, −4.2) | `lampsOnSkyport` | open (destructible now, so no longer a passable ghost; placement to review) |
| DES-01 | P1 | Only trees were destructible | V8 | **fixed, iteration 4**: lamps, planters, benches (iteration 1), bollards, bushes (flattened), signposts, light masts (iteration 4) all react per category |
| DES-02 | P2 | No particles for furniture impacts | `ImpactParticles.tsx` | **fixed, iteration 4** (fragments + dust on a knock-over, planter foliage scatter, leaves for a flattened bush, dust on a shove / settle; same pooled meshes) |
| V8-P2-01 | P2 | A stale impact toast can reappear after a body change | V8 report | open (unchanged) |
