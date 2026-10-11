# V7 · Air transform architecture

Branch `feat/v7-air-transform`, built on `feat/v6-ocean-multivehicle` (V6 exists: ocean, PAU Harbor, PAU SPEEDBOAT, Creative Lab Island, vehicle manager; it is local only, not merged, not on the remote at the time of branching). V7 extends V6's vehicle manager; nothing is duplicated.

## The one decision that shapes everything

The aircraft is **not a third vehicle**. It is the car in another *form*. The store keeps `activeVehicle: "car" | "boat"` from V6 and adds:

| Field | Meaning |
|---|---|
| `carForm` | `"car"` or `"plane"`: which body the car currently has |
| `flight` | `ground · transforming-to-plane · plane-ready · flying · landing · transforming-to-car` |
| `nearbyPad` | the car (as a car) is inside the Skyport transformation pad |
| `landingZone` | the aircraft is low, slow and near the runway ("Landing zone detected") |

The car's live state (`liveCar`) stays the ground model's state; the aircraft has its own live state (`livePlane`: x, y, z, heading, pitch, roll, speed, onGround). The two are **synchronised at the transformation instants**: car → plane copies position and heading onto the runway threshold, plane → car copies them back. One vehicle, two physics models, one mesh (`Car.tsx`) whose animated parts read a single transformation progress.

Derived modes (`resolveVehicleMode`) gain the flight phases; `canControl("car")` is false while a transformation runs, so the hand-over rules from V6 (only one thing answers to input, panels pause everything, reset lands in a controllable state) hold unchanged. The boat side is untouched.

```
car (ground)  ──E on the pad, stopped──►  transforming-to-plane (2.0 s)  ──►  plane-ready (on the runway)
plane-ready   ──W: run-up ≥ 15 u/s, nose rotates──►  flying
flying        ──over the runway, low──►  touchdown → landing (roll-out)  ──stopped──►  E (or auto) → transforming-to-car (1.8 s) → car
```

## Modules

- `src/game/vehicle/planePhysics.ts`: arcade flight model (ground run, rotation, auto-throttle cruise, climb/dive by pitch, coordinated turns by bank, gentle stall, ceiling, altitude floor outside landing spots, touchdown and roll-out). Pure, sub-stepped, tested.
- `src/game/vehicle/transform.ts`: flight phases, eligibility (`canTransformToPlane`: playing, no transition, on the pad, stopped, not colliding; `canTransformToCar`: rolled out and stopped), durations (2.0 / 1.8 s), the staged timeline `transformStages(progress)` (panels → wings → tail → wheels → thruster), runway rectangle and landing-zone detection. Pure, tested.
- `src/data/skyport.ts`: Skyport Island layout (slab, causeway, pad, runway, floor altitude, buildings, roads, drive rectangles, coastline, lights). Pure, tested.
- `src/game/vehicle/planeState.ts`: `livePlane` + reset.
- `Car.tsx`: the PAU AERO-X parts (wings, winglets, tail, fins, thruster, nav lights, wheel bays) animated from the progress; the plane controller branch of its `useFrame`.
- `Skyport.tsx`: the island (slab + skirt, causeway on piles, runway with markings and lights, pad ring, hangar, tower, terminal, approach lights, signage).
- Camera: `profilesFor("plane")` adds the flight profile; the transformation uses the car profile pulled back; the takeoff/landing blend is continuous by altitude.

## Where the aircraft may fly and land

- Takeoff only from the Skyport runway (the pad is on its threshold). The car cannot transform anywhere else: no pad, no prompt.
- In the air the aircraft keeps at least `SKYPORT.floorY` (16 u) above the ground everywhere except over the runway: it cannot clip buildings, the sea, the piers or the islands; outside the runway a descent simply flattens out at the floor with a HUD note ("Find the runway to land").
- Landing: inside the runway rectangle the floor is the runway itself; wheels on it means touchdown, whatever the attitude (arcade: no crash). The roll-out brakes to a stop; E (or the HUD button) folds the aircraft back into the car. Rolling off the runway on the ground is clamped to the island slab like the car.
- Ceiling 95 u: the nose levels at the top.

## Connection with the world

Skyport Island sits east of the city (x 104…202, z ±36). The car reaches it by the **causeway** that continues the east cross road over the sea (the V6 brief's rule that a land vehicle can only be driven where it physically is holds: the orange car drives there itself). The boat reaches the island's south pier like any V6 harbor (`landVehicles: ["car"]`, so docking there hands the controls to the car only if it was driven there). The brief's "connect by boat if V6 exists" is therefore satisfied without breaking the premise that it is the player's own car that transforms.

## Error states

- Transformation while fast, colliding, in a panel/menu or during a V6 transition: refused with a reason the HUD shows.
- Reset while flying: the aircraft is put back on the pad as a car (`reset` cancels the flight and the transformation).
- Panel/menu while flying: the aircraft freezes in place (same pause semantics as the boat) and resumes.
- Quality change while flying: nothing in the flight state depends on the renderer.
- Window blur: inputs clear; a running transformation completes on its own.
- Stuck on the ground off the runway (drove off the strip after landing): E is still offered once stopped, so the car form is always reachable.
