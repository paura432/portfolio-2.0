# V3 Architecture — buildings, urbanism, signage

Concept: **PAU WORLD — A Miniature Technological Universe**. One floating slab, a ring road around a central plaza, six districts, each with a silhouette that reads without its sign. Shared language: octagonal and rectangular low-poly volumes, flat shading, concrete slabs that overhang, cyan for computation, amber for operations, warm light at every entrance.

All footprints, entrances and routes are unchanged (`src/data/districts.ts`). Every building stays inside its footprint, so the collision model is untouched. All seven districts are now `built`; their HTML routes already existed, so no new content is exposed.

## Urbanism (`src/game/world/urban.ts`, `World.tsx`)

| Element | Rule | Rendering |
|---|---|---|
| Asphalt | road width 7, square end caps of 3.5 (`distanceToRoad` uses the same extent) | textured planes, `asphalt` material |
| Curbs | 0.3 wide × 0.16 high, hugging the asphalt, broken at junctions and the plaza | instanced runs (28) |
| Sidewalks | 2.2 wide beyond the curb; wrap ring-road corners, never dead ends, never inside a footprint | instanced runs (74) |
| Zebra crossings | 7 stripes; at each plaza exit and 6.5 before each ring junction | instanced (56) |
| Lane dashes | 1.6/3.2 pitch, cleared from crossings and junction boxes | instanced (56) |
| Parking pads | two 3-bay pads beside the DUPLEX and OVI forecourts, off road, off plots | plane + instanced bay lines |
| Forecourts | paved slab from sidewalk edge to each facade (dead-end spurs start at the asphalt edge) | one slab per district |
| Plaza | asphalt ring 7.5–14.5, curb wall, sidewalk ring split into four arcs, stepped concrete island with a cyan inset ring | ring/cylinder geometry |
| Island | textured top slab, concrete rim, cyan seam line, two dark stepped layers below | boxes |

## Vegetation and furniture (`src/game/world/props.ts`, `Props.tsx`)

- Three tree families: pine (cone), round (dodecahedron), tiered (two cones). Four canopy tints via `instanceColor`, scale 0.7–1.4, random yaw.
- Boulevard rows along every road at 1.3 beyond the sidewalk, every 9 units, alternating round/tiered.
- Seeded clusters of 3–7 trees on turf discs ("gardens"), with 2–4 bushes and often a bench.
- Plaza ring: four planters and four benches between the exits; two bollards per side at every crossing.
- Lamps every 12 units on both sidewalks: post, arm toward the road, emissive head, additive light pool on the ground (high/medium).
- Everything is instanced: 19 draw calls for 140 trees, 80 bushes, 30 gardens, 17 benches, 4 planters, 16 bollards, 59 lamps.

## Buildings (`src/components/game/buildings/`)

| District | Concept | Silhouette cues |
|---|---|---|
| Central Hub | **The Engineering Nexus** | octagonal plinth with light strip, glazed ground floor behind 8 pillars, cantilevered slab, upper volume with glass band, architectural ring on struts (cyan underside), glazed core column with pulsing heart, 3 metal rings, spire + beacon, canopy entrance with lanterns, 4 corner gardens |
| DUPLEX | **Industrial Intelligence Lab** | modular hall with 6 pilasters and clerestory band, two sawtooth roof modules with amber glazing, roof HVAC with fans, 13 m lift tower with lit shaft and rails, machine room + amber beacon, front catwalk with railing, pipes, west duct, technical entrance with canopy and light bar, east loading dock with shutter, canopy and hazard chevrons, equipment panels with LED strips |
| OVI | **AI Intelligence Core** | octagonal plinth with radiating data lines, three stacked drums (facade / light facade / glass) separated by floating slabs, 16 cyan light slots revealing the core column, four diagonal struts, glazed top drum, orb with two orbiting rings (slow rotation + pulse), portal entrance (pylons, lintel with cyan strip, lit lobby) |
| BROKI | **Operations & logistics facility** | barrel-roofed warehouse with gable walls and ridge ventilators, raised dock with three shutters, canopies and hazard edges, two-storey operations office with parapet and cool windows, container yard with two gantries, corner mast + beacon. Generic by design: no airport-specific features |
| TrustOS | **Identity & verification lab** | wide secure base with parapet and window bands, scanner-gate portal with cyan beam, 45°-rotated vault cube with corner frame, glass band, lit top edges, rotating verification ring, shield emblem, seven server fins, key mast with three cyan rings |
| 42 Madrid | **Modular technical campus** | two ribbed classroom modules flanking a covered entrance, upper module bridging them with a window band and a "42" monogram plate, stair tower with amber shaft, rooftop solar array, two masts with amber lights |
| Contact Station | **Communications & exit station** | raised deck with cyan edge line and steps, translucent glass pavilion with lit core, 12 m lattice mast with rings, slowly sweeping dish and blinking red beacon, three antenna posts |

Ambient motion (core pulse, ring rotation, dish sweep, beacon blink) is gated by the quality profile (`ambientMotion`).

## Static batching (`StaticBatch.tsx`)

Every building and the car body are wrapped in `StaticBatch`, which merges all static child meshes into one geometry per material at mount (transforms baked relative to the batch group). Instanced meshes, lights and parts flagged `userData.dynamic` (animated or per-frame material changes) stay separate. Effect on the spawn view (high tier): 407 → 260 draw calls.

## Signage (`src/game/world/signage.ts`, `signposts.ts`)

Rules, enforced by `signage.test.ts`:
1. District signs are mounted on the building, facing the entrance (dot ≥ 0.6), panel centre ≥ 2.6 high, never over asphalt.
2. Direction signposts stand on the driver's left, 0.7 beyond the sidewalk outer edge (≥ 2.5 from the asphalt), 5.5 past the plaza edge (after the crossing and bollards, before the forecourts), top panel at 4.0, ≥ 6 from any district sign.
3. All panels are single-sided planes on a dark backing plate — no `DoubleSide`, so text is never mirrored; from behind you see the plate.
4. Label text shrinks to fit the plate (`makeLabelTexture`), so long names never overflow.

## Camera (`src/game/camera/followCamera.ts`)

- Landscape: distance 12.5, height 6.2, look-ahead 3.5, fov 52, target height 1.3.
- Portrait: distance 17, height 10.5, look-ahead 5, fov 62, target height 1.0.
- Blend by aspect between 1.15 and 0.70, continuous (tested), fov damped — resizing never jumps.
- Photo mode (`photoMode.camera`) is capture tooling only.
