# V5 — 4GEEKS AI Engineering Campus: concept, placement and architecture

## Concept

A small research campus for applied AI engineering: one hall with an atrium and a data mast, four laboratories named after the real 4Geeks labs, a paved research plaza in front, gardens between the buildings and a pedestrian spine with light links. Visual language = V3 (octagonal/rectangular low-poly volumes, flat shading, concrete slabs, warm entrances) plus a **violet accent** (`#8B7CFF` lights, `#5B4FD6` deep) reserved for the campus's emitters so it is recognisable from the air without reading a sign. Cyan/amber/orange stay as they are.

## Placement: two proposals

| | A · East wing | B · North wing (chosen) |
|---|---|---|
| Site | strip beyond the east ring road, x 46…62, z −40…40 | strip beyond the north ring road, x 10…62, z −46…−62, next to 42 Madrid |
| Access | spur from (40, 0) to (47, 0), entrance at the spur end | spur from (30, −40) to (30, −47), entrance at the spur end |
| Frontage | 80 units long, 16 deep: five buildings in a north–south line | 50 units long, 16 deep (corner adds a second row at the east end) |
| Drive from the hub | 47 units east | 47 units north + 30 east along the ring, same order as 42 Madrid |
| Composition | a long single row; the plaza is a 6-unit strip | a hall in the middle, labs stepped back at different depths, two stacked labs closing the east corner, plaza 6 deep across the whole front |
| Urban logic | isolated wing | **education quarter**: 42 Madrid (systems foundations) and 4Geeks (AI engineering) share the north edge but keep distinct silhouettes and accents |
| Impact on existing systems | none beyond a new spur | none beyond a new spur; the north signpost gains an entry |

B was chosen for the composition (hall in the middle, labs on both sides, a closed corner) and for the urban story. Nothing on the island is enlarged; all plots stay inside the platform (half size 66) and the campus plots touch the drive limit (62) only at the east corner, like 42 Madrid does at the north.

## Plots (world units, +X east, +Z south)

| Element | Centre | Footprint | Notes |
|---|---|---|---|
| Spur road | (30, −40) → (30, −47) | width 7 | joins the north ring road; crossing + curbs generated |
| Entrance / interaction zone | (30, −47), radius 8 | | "Explore 4Geeks AI Campus" |
| Research plaza (paved) | x 12…60, z −52…−46 | | sidewalk material, violet inset line, benches, planters |
| Hall — 4Geeks AI Engineering Campus | (30, −57) | 12 × 10 | three storeys, glazed atrium, cantilevered top floor, data mast with violet rings |
| Lab 01 — TrackFlow | (15, −57) | 8 × 10 | logistics shed: dock, two containers, conveyor, flow-arrow light strip |
| Lab 02 — Financial Dashboard | (44, −57) | 8 × 10 | glazed analytics box with a 3D bar-chart crown and a data screen |
| Lab 03 — Back-office | (58, −58) | 8 × 8 | ops block: server fins behind glass, status LEDs, pipe rack, stack; entrance faces west |
| Lab 04 — AI Workflow | (58, −49) | 8 × 6 | automation pavilion: five node pylons on a light rail with a travelling pulse, consoles; entrance faces west |

Lab entrances face the plaza (south for the row, west for the corner pair); entrance points sit on the plaza at (15, −49.5), (44, −49.5), (51, −58) and (51, −49), each with a 4.5-unit zone that opens that lab directly ("Open lab · Lab 0n"). They are optional: the hall zone (radius 8 at the spur end) opens the whole campus. The corner pair was shifted one unit east during the data phase so the car fits between Lab 02 and Lab 03 (collision padding 1 + car radius 1.3).

Plots, zones, collisions, sidewalks, vegetation exclusion, the minimap and the menu all derive from `districts.ts` (`plots[]`, `allPlots()`) and from `PAVED_AREAS` in `world.ts`; the 3D file only places geometry at those coordinates.

## Materials and light

- Violet accent (`palette.violet #8B7CFF`, `violetDeep`) on emitters only: hall light bar, cantilever strip, data-mast rings, plaza guide line and light paths, bollard caps, lab plaques and screens, workflow nodes. `glassViolet` is the hall's ground-floor glass (low emissive). Everything else uses the V3 library (facade, concrete, glass, metal, shutter, hazard, doorWarm/doorCool).
- No new lights. Entrance warm pool from V4 appears at the campus entrance like every district; lamps follow the spur automatically.
- Ambient activity: mast rings rotate and bob (hall), a pulse travels along the node rail (Lab 04), both `userData.dynamic` and gated by `ambientMotion`; everything else is merged by `StaticBatch` (one batch per building).
- Plaques per lab use the V3 single-sided `SignPanel` (label texture on a plate); the campus sign hangs on the hall's cantilevered top floor facing the spur, validated by the signage test.

## Adding a lab later

1. Add a `Lab` entry in `src/data/education/fourgeeks.ts` (status from the fixed vocabulary, evidence paths, verified repository).
2. Add a plot with the same id to the `fourgeeks` district (`plots[]`): collisions, zone, minimap, HTML route and panel navigation follow automatically (`fourgeeks.test.ts` fails if the ids do not match).
3. Optionally add a pavilion component in `FourGeeks.tsx` at the plot's coordinates. No engine code changes.

## Data and code structure

```
src/data/education/fourgeeks.ts        academy metadata + lab list (status vocabulary)
src/data/education/labs/*.ts           one case study per lab (same schema as projects + status/evidence)
src/data/districts.ts                  district "fourgeeks" (kind "education", plots[], labZones[])
src/components/portfolio/education/    CampusContent (overview + lab navigation), LabContent (case study)
src/components/game/buildings/FourGeeks.tsx   hall + labs + plaza + mast (StaticBatch, instanced nodes)
src/app/education/4geeks/page.tsx, [slug]/page.tsx   HTML routes (no WebGL needed)
```

Adding a lab = one data file + one entry in the lab list (+ optionally a 3D pavilion). The engine (collisions, zones, minimap, menu, signage) derives everything from the district's `plots` and `labZones`.
