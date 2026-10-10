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
- **Signs:** canvas-rendered textures (district name + tagline) on posts at each entrance; the hub sign hangs on the pavilion wall.

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

## HUD and panels
- Intro: name, role, **Explore world** / **View projects**.
- HUD: title, graphics toggle, Projects menu (M), key hints (desktop), interaction prompt (E or click), touch pad on coarse pointers.
- Panel: accessible modal (`role="dialog"`, focus moved in and restored, Tab trapped, Esc / backdrop / button close). Driving pauses while open and resumes on close.
- Menu: every district, built or planned, opens its panel directly.
