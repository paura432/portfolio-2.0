# V8 · PAU TRANSFORMER-X architecture

Branch `feat/v8-seamless-transformations`, built on `feat/v7-air-transform` (`b06559c`). Audit result: V6 (ocean, PAU SPEEDBOAT, piers) and V7 (AERO-X flight form, Skyport) both exist in the code and were verified green before any change. V8 does not add a vehicle: it folds the three into one.

## One entity, one state, one authority

The store holds a single `vehicleState`:

```
car ──corridor, aligned──► preparing-flight ──≥ 11 u/s──► transforming-to-plane ──lip, wings out, ≥ 14 u/s──► flying
 ▲                               │ left / slowed                │ slowed / turned / lip too slow                     │ touchdown
 │                               ▼                              ▼                                                    ▼
 │◄──────────────────────── car ◄──────── transforming-to-car ◄─────────────────────────── landing (roll-out) ◄──────┘
 │                                                                                                   splashdown ─────┐
 │  beach, depth ≥ 0.55, seaward                                                                                     ▼
 └──────────────────────────► transforming-to-boat ──clock──► floating ──beach, depth ≤ 0.30, landward──► exiting-water ──clock──► car
                                       ▲  depth ≤ 0.30 landward (revert)   │                                     │ depth ≥ 0.55 seaward (revert)
                                       └──────────────────────────────────┘◄────────────────────────────────────┘
```

Nine states, the edges above and no others (`canTransition`, enforced by the store's `setVehicleState`, which refuses anything else). Two transformations can never overlap because every transforming state has exactly two exits: complete, or reverse.

**Authority.** `authorityOf(state)` names the physics model that integrates the position: `flying` → the flight model (V7 `planePhysics`); `transforming-to-boat` and `floating` → the hull model (V6 `boatPhysics`); every other state → the car model (`carPhysics`). The three models keep their own state objects (`liveCar`, `liveBoat`, `livePlane`), but only the authority's is live; the other two are frozen and overwritten at the hand-over, so `poseOf(state)` is the one authoritative pose (camera, HUD, minimap, probe all read it). Hand-overs transfer position, heading and velocity:

| Hand-over | What carries over |
|---|---|
| car → flight (lip) | position, heading, ground speed as airspeed (≥ 14), the lip's slope as the initial pitch (`launchPose`) |
| flight → car (touchdown) | position, heading, airspeed as ground speed (capped at the car's 20), the ground slope as the body pitch |
| flight → hull (splashdown) | position, heading, airspeed as hull velocity (capped at the hull's 16) |
| car → hull (beach) | position, heading, signed speed as a velocity vector (`boatVelocityFromCar`) |
| hull → car (beach) | position, heading, the velocity's component along the heading (`carSpeedFromBoat`) |

Transformations never lock the controls: the wings deploy while the car keeps driving up the ramp, the floats come out while the hull is already moving. Only pier glides and the mooring do (V6 rules).

## The ground is a height field

`src/game/world/ground.ts` is the one authority for "how high is the ground here": ramps (`rampHeightAt`, a `s^1.6` profile up to the lip), beaches (`beachHeightAlong`, a linear sand slope under the water then a run-out to the sea floor), built land (0), the sea floor. The car's body follows it (`liveVehicle.y`), its pitch comes from the slope, and a small vertical model (`stepHop`, arcade gravity 22 u/s²) makes the body airborne whenever the ground drops away: a slow car drives off the lip and lands a few units later as a car. The same field gives the water depth to the beach rule, the terrain to the flight model and the heights to the terrain meshes, so what is seen, driven and sampled is one surface.

## Hysteresis

The beach rule (`shoreDecision`) uses two depths: a ground form becomes a hull at 0.55 u of water heading seaward; a hull becomes a car at 0.30 u heading landward. Between them nothing changes, so a car on wet sand, a hull rocking at the waterline or a wave crest never flips the form. A running sequence can only be reversed by the opposite threshold (the beach demanded it), never restarted. A 1 s lockout after any completed transformation blocks a fresh one; reversals ignore it. The ramp rule (`rampDecision`) has the same shape: deploy from 11 u/s, abort under 7.7 u/s or when the heading leaves ±0.45 rad of the ramp, launch only with the wings fully out and ≥ 14 u/s at the lip.

## Modules

- `src/game/vehicle/transformer.ts`: states, authority, body mode, edges, durations, ramp and shore rules, hand-over maths, parts progress. Pure, tested.
- `src/game/vehicle/landing.ts`: where the aircraft may touch down (open built ground → car, deep water → hull), the altitude floor elsewhere, the HUD's landing-zone look-ahead. Pure, tested.
- `src/game/world/ground.ts`, `src/data/ramps.ts`, `src/data/beaches.ts`: the height field and its sources. Pure, tested.
- `src/game/world/rampColliders.ts`: the slope is solid from every side but its approach (a car whose previous sub-step was already in the corridor passes). Pure.
- `src/game/vehicle/liveVehicle.ts`: the vertical model, the ramp being climbed, the lockout timer and the transformation clock.
- `src/stores/gameStore.ts`: `vehicleState`, `nearbyRamp`, `nearbyBeach`, `landingZone`, `vehicleNotice`; piers keep `nearbyDock`, `mooredAt` and the glide `transition`.
- `src/components/game/Vehicle.tsx`: one mesh, one frame loop with the three physics branches and the rules; replaces `Car.tsx` and `Boat.tsx`.
- `VehicleController.tsx` (clocks), `ProximitySensor.tsx` (districts, piers, landing zone), `FollowCamera.tsx` (profiles by body, altitude blend, pulled back while parts move), `Ramps.tsx`, `Islands.tsx` (`Beach`), `Hud.tsx`, `Minimap.tsx`.

## What V8 removed

The parked PAU SPEEDBOAT, the harbor boarding/disembarking and the Skyport pad transformation (press E) are gone: there is one vehicle and it changes form where the terrain asks for it. Piers keep docking (moor, explore the point of interest, cast off). The Skyport runway stays as a landing strip and as the approach of the Skyport Ramp.

## Error states

- Slow over a lip: a hop, never a flight; a half-deployed wing folds back and the HUD says why.
- Wrong direction in a corridor: nothing happens (alignment is part of the rule).
- Panel or menu in any state: the authority's model stops integrating; sequences pause with the clock.
- Reset (R) in any state: the car at the nearest recovery point (city spawn, Skyport apron, the top of each beach), every sequence and glide cancelled.
- Quality change: nothing in the vehicle state depends on the renderer.
- Stuck hull against a coast: the V6 nudge toward open water; a hull pushed onto sand shallower than 0.12 u is pushed back seaward.
- WebGL context loss: the V5 overlay; the live state survives the restore.
