# PAU WORLD · Design

## Concept
A **technological diorama city** floating in the dark: a square island with a central plaza, a ring road and districts that each stand for one part of Pau Ramos' professional work. The player drives an orange car; arriving at a district opens an HTML panel with its real content. The feel is "indie premium" (clean low-poly, deliberate lighting), the function is a serious, accessible portfolio.

## Visual identity
- **Mood:** night, calm, futuristic, elegant. No bloom, no particles, no neon overload. Accent light comes from a few emissive surfaces and point lights, not post-processing.
- **Geometry:** flat-shaded primitives only (boxes, cylinders with 8 segments, cones). Every district has a distinct silhouette so it reads from the road.
- **Palette (locked):**

| token | hex | use |
|---|---|---|
| background | `#080F1D` | sky, fog, page background |
| ground | `#142538` | island top |
| buildings | `#24394F` | building bodies |
| primary cyan | `#4DD5DE` | hub, OVI, UI accent, plaza ring |
| secondary amber | `#FFAE70` | DUPLEX, lamps, warm windows |
| text | `#F4F7FA` | text |
| muted text | `#9BAFC2` | secondary text |
| car | `#FF7A3D` | the only saturated orange in the scene |

- **Lighting:** one cool directional "moonlight" with a 2048 shadow map covering the island (high quality only), a hemisphere fill, low ambient, linear fog that fades into the background colour. Accent point lights: one per built building (cyan at the hub and OVI, amber at DUPLEX). Car headlights are a single spot light.
- **Typography (HTML):** system UI stack (no font downloads). Labels use tracked uppercase small caps for a "control room" feel.
- **Signs:** canvas-rendered textures (district name + tagline) on posts at each entrance; the hub sign hangs on the pavilion wall. Sprint 02 raised the contrast: near-black panel, 104 px extra-bold title, lighter subtitle, anisotropy 8.

## District silhouettes
| district | silhouette | accent |
|---|---|---|
| Central Hub | round two-tier pavilion, cyan ring, tall antenna, bollards | cyan |
| DUPLEX | two offset stacked blocks (a duplex), amber strip over the entrance, diagnostic mast with amber beacon | amber |
| OVI | octagonal tower with three floor rings, vertical cyan seams, glowing "assistant orb" on top | cyan |
| BROKI / TrustOS / 42 Madrid / Contact | reserved foundation slabs only (data defined, not built in this phase) | — |

## Map (world units, +X east, +Z south)
```
                      42 Madrid (0,-57)  [planned]
                             │ spur
   ┌──────────── ring road z=-40 ────────────┐
   │   DUPLEX (-28,-17)        OVI (28,-17)  │
   │        ╲ entrance (-28,-3)  ╱ (28,-3)   │
 x=-40 ─── west road ──(plaza r 7.5–14.5)── east road ─── x=40
   │        ╱ (-28,3)            ╲ (28,3)    │
   │   TrustOS (-28,17)       BROKI (28,17)  │
   └──────────── ring road z=40 ─────────────┘
                             │ spur
                      Contact (0,57)  [planned]
                 car spawn (0,27) facing north
```
- Island: 132 × 132, drivable ±62. Roads 7 wide. Plaza roundabout around the hub pavilion.
- Every entrance lies on a road (tested). No building touches a road (tested). No dead ends: the ring road closes, the cross roads join the plaza, the spurs end at the planned districts' entrances.
- Interaction zones: a circle at each entrance (radius 9 for projects, 6.5 for the hub) with 1.25× exit hysteresis.
- Trees (150) and lamps are placed deterministically from a seed, off roads and off every plot, so the layout is reproducible from data.

## Camera
Third-person follow: 13 units behind, 7 up, pulls back slightly with speed, looks a few units ahead of the car. Exponential damping (`1 - e^(-k·dt)`), so it feels the same at 30 and 144 fps.

## Car
Low-poly orange car: chassis, sloped hood, darker cabin, dark glass, warm headlights, red tail light bar, four wheels (front pair steers, all spin). Arcade handling: max 20 u/s, strong brakes, turn authority grows with speed, reversing flips steering.

## Intro (sprint 02)
Two-column hero. Left: who (name, role, location), what he builds (verified summary), three focus areas each backed by a project, actions (Explore the 3D city, View projects, Contact), CV links when published, social links. Right: a still JPEG preview of the city (47 KB, captured from the real scene) that also starts the game on click. WebGL is never initialised until the visitor asks. On phones the preview sits under the actions.

## Navigation aids (sprint 02)
- **Signposts** at the four plaza exits list the districts down that road with left/right/ahead arrows; planned districts show muted with "planned district". Positions are derived from district data (`src/game/world/signposts.ts`).
- **Minimap** (HUD, bottom-right on desktop, under the buttons on touch) draws roads, plaza and district plots from the same data; built plots are filled with their accent, planned plots dashed; the car marker is updated outside React.
- **Reset car** (R key or HUD button) teleports to the spawn and snaps the camera.

## HUD and panels
- HUD: brand line with the one-line instruction, Graphics toggle, Reset car (R), Projects (M), key hints (desktop ≥ lg), interaction prompt (E or click), touch pad on coarse pointers, minimap.
- Panel: accessible modal. Full-screen sheet with a sticky header on phones; centred 44rem card from `sm:` up. Header = eyebrow + title + meta + close; body scrolls; footer = Back to the road / Open as page. Focus goes to the close button on open and back to the opener on close; Tab and Shift+Tab cycle inside; the rest of the page is `inert`. Driving pauses while open and resumes on close.
- Menu: two groups, "On the map" (built, accent dot) and "Content ready · building planned" (outline dot); every entry opens the panel and has a "Page ↗" link.

## Case-study template (sprint 02)
Order in `ProjectContent`: header (chapter, title, org · period · role, confidentiality badge) → tagline → summary → **How it works** (flow diagram from `project.flow`, labels only) → technical highlights (2-col grid) → challenge → decisions (why / trade-off) → delivered → technologies → quality → public captures (`project.media`, only files that exist under `public/`) → boundary → internal pending (dev builds only). Diagrams are data-driven HTML/CSS, so a project can get one without any asset.
