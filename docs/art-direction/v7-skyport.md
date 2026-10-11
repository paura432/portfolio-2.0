# V7 · Skyport Island and the PAU AERO-X

## Skyport Island

East of the city, a flat technological slab (x 104…202, z ±36, top at y = 0 like the platform) wrapped in the same coastal skirt and rocks as the other islands, reached by a **causeway**: the east cross road continues past the ring road, over the sea on a bridge deck with piles, cyan guide strips and lamps, and onto the island apron. A south pier makes it a V6 harbor as well.

Layout (world units):

| Element | Position | Notes |
|---|---|---|
| Causeway | x 66 → 104 at z = 0, 9 u wide | road on top, railing both sides, piles every 6 u |
| Apron road | (104, 0) → (114, 0) → (114, −9) → (122, −9) | leads to the pad |
| Transformation pad | centre (124, −9), r 5.5 | cyan ring on the runway threshold, amber "TRANSFORM" markings, four corner masts with amber heads |
| Runway | x 118 → 198, z −14 → −4, heading east | dark composite surface, white centre dashes, threshold bars, numbers "09", edge lights every 8 u (cyan), threshold lights (amber), approach lights on piles out to x = 224 |
| Hangar | (142, 18), 18 × 13 × 7.5 | open front toward the runway, orange door band, cyan roof strip, "SKYPORT" sign |
| Control tower | (118, 16), 5 × 5 × 15 | glass cab with warm windows, red beacon, cyan ring |
| Terminal | (170, 20), 14 × 9 × 4.5 | warm windows, lamp pools |
| Windsock | (205, −18) | orange, static |
| Vegetation | a few pines on the north edge only | the island reads as built, not natural |

Palette: deck/runway `#232C38` family, markings `#CFD8E2`, cyan `#4DD5DE`, amber `#FFAE70`, the car's orange on the doors and the pad lettering. Same materials library; no new textures.

Scale: 98 × 72 u, about half the city's footprint, 40 u off its east coast, visible from the harbor and from the Creative Lab pier across the sea; the runway is long enough for a ≈ 20 u run-up with 60 u to spare.

## PAU AERO-X (the car's flight form)

Everything the car already is stays: orange body shell, dark greenhouse, light bar, wheels. The flight parts are **part of the car mesh from the start**, folded flat against the body, and animate out:

| Stage | Parts | Motion |
|---|---|---|
| Panels (0–30 %) | two side skirt panels | slide down and out 0.25 u (reveal the wing roots) |
| Wings (15–70 %) | main wings, one per side, 3.6 u span each, swept 12°, with winglets | hinge at the belt line: rotate from folded (vertical, along the flank) to horizontal; winglets rise last |
| Tail (40–85 %) | the spoiler becomes the horizontal stabiliser; two fins | spoiler lifts 0.35 u and widens; fins rotate up from the rear deck |
| Wheels (55–90 %) | the four wheel groups | tuck 0.3 u into the arches, bay doors close (dark plates) |
| Thruster (75–100 %) | rear thruster ring + core, flight lights | ring glows cyan, core emissive ramps; red/green wing tips and a white tail light switch on |

The silhouette reads from behind (wings + fins + thruster), from the side (swept wing over the belt line, fins), three-quarter (wing root and winglet), and top (the X of the wings). The parts are flagged `userData.dynamic` so the static batch leaves them alone; the car's draw-call count grows by about ten (shared materials).

In flight the body rolls with the bank, pitches with the nose, and the thruster core pulses with the throttle; on the ground in plane form the wheels are back out (bay doors open) so taxiing reads correctly.
