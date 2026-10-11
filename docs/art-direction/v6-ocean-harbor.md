# V6 · Ocean, coast and harbor art direction

## Research (concepts only; no code or assets copied)

| Reference | License | Taken | Rejected |
|---|---|---|---|
| thaslle/stylized-water (MIT) | MIT, `LICENSE.txt` | shore foam keyed on distance to land rather than a depth texture; procedural noise breakup; wet-sand tint on terrain | rigid single-sine bob; radial UV vignette as "depth"; the extra CSM dependency |
| SourabhX16/Contril | **no license file** → concepts only | one wave table compiled once for CPU and GLSL; fixed-point inverse sampling for buoyancy height; probe buoyancy with symmetric layout; hull-frame arcade handling (surge/sway, exponential grip, speed-dependent turn rate); ribbon wake; damped chase camera | 6 waves + 50 k-vertex camera-snapped disc; G-buffer outline pass; depth-difference contact foam; drift/boost tiers |
| three.js `Water.js` (MIT) | MIT | multi-scale scrolling of one noise; Schlick-style Fresnel mix toward a sky colour | the planar reflection pass (one extra full-scene render per frame: rejected outright for mobile and for the low tier) |
| baditaflorin/threejs-water-free (MIT) | MIT | `getHeight(x, z)` API shape; exponential depth colour by coast distance; a quality enum | FFT / WebGPU / TSL; screen-space refraction; kinematic floater without inertia |
| snicholson99/interactive-sailing-game | **no license file** → concepts only | nothing | 10 000² one-segment plane, remote normal map, `speed *= 0.98` per frame, sine bob |
| GPU Gems 1 ch. 1 (Gerstner) | — | the displacement and normal formulas, the steepness budget Σ Q·w·A ≤ 1, attenuating waves shorter than ~4× the vertex spacing | — |

Decision: no Rapier, no FFT, no WebGPU, no reflection pass. One R3F scene, one Canvas, own shader on a lit `MeshStandardMaterial` (fog, tone mapping, shadows and tiers stay unified with the city), 4 Gerstner waves shared with the CPU, arcade physics of our own.

## Ocean

- **Geometry** (`src/game/ocean/oceanMesh.ts`): one non-uniform grid. Dense inside the navigation bounds (370 × 320 u) at 2.5 / 3.5 / 6 u per tier (≈ 38 k / 19 k / 6 k triangles), then four coarse steps (8, 16, 32, 64 u) out to an 840 × 720 u extent that covers the camera far plane from anywhere the boat can go. Two baked attributes: `aShore` (signed distance to the nearest coastline) and `aDense` (1 in the dense region, fading over 35 u to 0 on the coarse ring so no big flat crest ever shows). One draw call, `frustumCulled = false`.
- **Vertex**: Gerstner displacement and analytic normal from the shared table (`waves.ts`), amplitude × `shoreDamp(aShore)` × `aDense`.
- **Fragment**: deep `#0A2644` → shallow `#1A6478` over 24 u of coast distance; value-noise tint variation; shore foam as drifting bands (`sin(shore·2.4 − t·1.6 + noise)`) inside 4.5 u of the coast, gone on the land side; whitecaps on the top ~20 % of crests (high/medium only, `uWhitecaps`); the boat wake ribbon; foam colour `#C4E6EC` mixed at most 85 %; a Fresnel sky tint (`#6E9CCB × 0.1`) toward grazing angles. Roughness 0.62 keeps the three scene lights from blowing the surface out (0.42 did).
- **Water level** −1.1 (platform top at 0, thickness 4): the island's underside is submerged; the quay and pier decks sit above the highest crest (Σ amplitude ≈ 0.42) even before shore damping.
- **Low tier**: fewer vertices, no whitecaps, no spray; the sea and the boat are never hidden.

## Coast

- Main island: the square platform keeps its data (half size 66, drive limit 62) and gets a **coastal skirt** (`buildCoastSkirt`): rings from the platform edge (ground tint) through a jittered sand band to the rock waterline just under the surface and a sea floor 3.4 u down, flat shaded, vertex-coloured. The coastline polygon (`MAIN_COAST`: 12 vertices per side, 7 u skirt ± 3.5 u jitter, bulged corners) is the boat collider and the minimap outline; the west quay face is a straight segment where the harbor stands.
- Rocks: instanced dodecahedrons along every coastline, half submerged, skipped on the quay face and in the pier channel.
- Shore foam comes from the water shader, so it moves; the skirt itself is static.

Palette additions (`materials.ts`): `deck #2B3644`, `deckEdge #3E4C5E`, `pile #232C38`, `fender #121821`, `rock #27384A`, `sand #55606A`, terrain vertex colours (`sea floor #0F1A27 · rock #1F2E3D · sand #3E4A55 · turf #153538 / #1B4744`), hull `orange` (car family) / `navy #17263B` / `deck #C9D3DE`.

## PAU Harbor

West coast at z = 0, where the west cross road already pointed. The road continues from the ring road (x = −40) onto the quay (x = −66 … −76, z = ±11): slab top at 0 like the platform, technical paving, coping with a hazard stripe toward the sea, bollards with cyan caps, hanging fenders, two parking pads with painted bays, the boarding ring on the paving, the harbor master's cabin (collides), two amber lamps with pools, the PAU HARBOR gate sign read by the arriving car. The pier (16 × 5 u) runs west from the quay: composite deck on piles with cross beams, cyan guide strips, bollards with amber caps and fenders on the mooring side, railing and amber lamps on the other, a tip platform with a cyan beacon and red/green navigation lights, a root sign. The same `Pier` component builds the Creative Lab pier from its definition.

## Creative Lab Island

West of the city (centre −178, 30, radius ≈ 24, 28-vertex coastline with a flatter east face for the pier). Terrain from `buildIslandTerrain`: eight rings from a submerged skirt to a plateau 2 u above the land height, vertex-coloured by height. Sixteen pines, rocks along the waterline, a stepped path from the pier root to the lab pavilion (glass front, cyan strip, sloped roof, beacon mast), two amber lamps, a CREATIVE LAB sign. The point-of-interest panel states plainly that the content is pending; no professional content is invented.

## Boat

PAU SPEEDBOAT (`Boat.tsx`): plan-view outline (pointed bow, squared transom) extruded in two bands and tapered toward the keel (V section) with a raked forefoot; navy below the chine, car orange above, light rub rail and deck, dark cockpit well, console with a cyan screen and wheel, raked windshield with frame, two seats with backrests, engine cover with a cyan light bar, side cyan strips, grab rails, fenders, bow cleat, red/green bow lights, white stern light, outboard drive with propeller and a cyan jet ring, transom plate. Readable from behind (transom, engine, light bar), side (chine, rail, windshield rake), three-quarter and top (hull outline, cockpit). Turnaround captures in `docs/screenshots/v6/`.
