# V4 — Reactive world

What moved, what was polished, and the cost of each item. V3 art direction (Blue Hour, palette, material library, building designs) is unchanged; V4 adds motion and depth on top.

## Vegetation

- **Canopy sway** (`materials.ts`, `canopyUniforms`): the instanced canopy material injects a vertex displacement after `begin_vertex`. Phase comes from the instance position (`instanceMatrix[3]`), amplitude grows quadratically with height, two slow sines plus a faster "rustle" term that fades in within 6 units of the car. One clock uniform and the car position are written per frame; 140 trees stay 4 canopy draw calls and no instance matrix is touched. Bushes share the material and sway a little too.
- Off in LOW (`worldFx: false`) and under `prefers-reduced-motion` (uSway = 0).
- Dynamic (pooled) canopies and leaf particles use plain materials: a falling tree does not sway.

## Driving feedback (`src/game/fx/driving.ts`, `surface.ts`)

| Surface | Dust | Skid |
|---|---|---|
| asphalt | no | yes, when braking hard (brake + decel ≥ 12 u/s²) or steering hard above 7 u/s (|steer|·v ≥ 11) |
| pavement (curb + sidewalk band, parking pads, plaza island) | no | no |
| turf | yes, 14 puffs/s at full speed, none below 2.5 u/s | no |

- Dust puffs reuse the impact dust pool (additive glow discs that face the camera, grow and fade through instance colour).
- Skid marks: one instanced mesh, 160-slot ring buffer, a pair of marks every 0.42 units while skidding; the oldest is overwritten, so marks never accumulate.
- Brake feedback: brake lights (V3) + skid marks; nothing is emitted while the car is stopped (tested).

## Impact feedback

Splinters (dark boxes with gravity and bounce), geometric leaves (tetrahedra tinted with the tree's canopy colour, light gravity), dust (at the break point and where the canopy lands). Budget: HIGH 48 + 72 + 28, MEDIUM half, LOW none. Three draw calls, pools packed in typed arrays, deterministic seeds. Car-body shudder and a ≤ 0.12-unit camera nudge decay in ~0.5 s; both skipped under reduced motion.

## Depth and lighting (measured changes)

| Item | Change | Why |
|---|---|---|
| Blue Hour preset | hemisphere 1.35 → 1.5 (ground `#2C4866`), ambient 0.45 → 0.52, fill 0.9 → 1.05 | shadow-side facades in the V3 captures sat below the sidewalk value; key light unchanged so the direction and shadows stay |
| Car contact | additive-free black radial blob under the car (`shadowBlob`, 3.4 × 5.4) | the key-light shadow alone let the car float at low sun angles |
| Trees | instanced contact blobs under every rendered tree (1 draw call) | grounds vegetation on turf, reads from the follow camera |
| Entrances | warm light pool at each district entrance (1 instanced draw call, HIGH/MEDIUM) | "iluminación de entradas": the door and canopy lights now reach the ground |

Not done on purpose: no bloom/post-processing, no new textures, no building rebuilds.

## Ambient activity (section 11)

| District | V3 | V4 addition |
|---|---|---|
| Central Hub | core pulse | — |
| DUPLEX | — | lift cab riding the shaft (16 s cycle, eased), two panel status LEDs alternating |
| OVI | orbiting rings + pulse | — |
| BROKI | — | gantry trolley crawling along the north beam (12 s cycle) |
| TrustOS | verification ring rotation | — |
| 42 Madrid | — | — (static campus by design) |
| Contact Station | dish sweep, red beacon | — |

All animated parts are flagged `userData.dynamic` so `StaticBatch` leaves them out, and all are gated by `ambientMotion` (off in LOW).

## Quality tiers (V4 columns)

| Tier | Vegetation | Sway / skid | Particles | Ambient motion | Dynamic trees |
|---|---|---|---|---|---|
| High | 100 % | on | 100 % | on | up to 8 |
| Medium | 80 % | on | 50 % | on | up to 8 |
| Low | 55 % | off | none | off | up to 8 (fall still animates) |

Trees hidden by a tier are not colliders (`activeCount`), so there are no invisible trunks; their state is kept and shown again when the tier goes back up.
