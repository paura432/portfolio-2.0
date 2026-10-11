# V7 · PAU AERO-X flight system

Pure model in `src/game/vehicle/planePhysics.ts`, rules in `src/game/vehicle/transform.ts`, driven by the car's controller in `Car.tsx` while `carForm = "plane"`. Same discipline as the car and the boat: sub-steps of at most 1/30 s, frame gaps clamped, deterministic, unit-tested.

## Controls (the same four actions everywhere, so touch works unchanged)

| Action | On the ground (plane form) | In the air |
|---|---|---|
| W / ▲ | throttle (run-up) | climb: nose up to 0.42 rad, +5 u/s of thrust |
| S / ▼ | brake | descend: nose down to −0.5 rad |
| A / D | steer (yaw, authority grows with speed) | bank up to 0.85 rad; the aircraft turns through its bank (1.0 rad/s at full bank and cruise) |
| Space | brake | air brake (−9 u/s on the speed target) |
| E | reconfigure to car once stopped | — |
| R | reset: back on the pad as a car | same |

## Ground run and takeoff

- Run-up acceleration 8 u/s², rolling drag 2.2 u/s², brake 11 u/s².
- At **15 u/s with the throttle open** the nose rotates (1.1 rad/s) to 0.22 rad; when it gets there the wheels leave the runway (`liftedOff`). No throttle, no rotation: coasting past the takeoff speed never lifts off. From the pad at the threshold the run uses ≈ 20 u of the 80 u strip.
- The camera does not change mode at lift-off: the flight profile is reached by a continuous blend with altitude (see Camera).

## Flight

- **Auto-throttle**: the airspeed converges (λ 0.55/s) on cruise 24 u/s, +5 with W, −9 with Space; the speed is also pushed by gravity along the flight path (climbing bleeds 7·sin(pitch) u/s², diving gains it). Cap 34 u/s.
- **Pitch** follows W/S at 1.1 rad/s and levels on its own (λ 1.4/s) with no input. **Roll** follows A/D at 2.2 rad/s and levels at λ 2.4/s. Position integrates the nose vector × speed; there is no separate lift force: at or above the stall speed the aircraft goes where its nose points, which is the "simplified lift" the brief allows.
- **Stall** below 11 u/s: the nose is driven down to −0.3 rad and the aircraft sinks up to 6 u/s extra (scaled by how slow it is); speed recovers on the way down and normal control returns. Never a spin, never a flip; tested.
- **Ceiling** 95 u: climbing input is ignored at the top.
- **Floor**: outside a landing spot the world reports a floor altitude (16 u over Skyport and the city, i.e. above every roof and mast); a descent flattens out there (`floorHit`) and the HUD says so. No clipping into buildings, water, piers or islands.

## Landing

- The runway rectangle (`SKYPORT.runway`, 80 × 10 u, heading east) is the only landing spot. Over it the floor is the runway surface; wheels reaching it is a touchdown whatever the attitude (arcade rule: no crashes). Approach reads as **Landing zone detected** when the aircraft is within 12 u of the strip, under 30 u above it and at or below 22 u/s.
- Roll-out: ground model again (brakes 11 u/s², drag 2.2). Rolling off the strip is clamped to the island slab like the car.
- **Reconfigure**: once rolled out and stopped (≤ 1 u/s) the prompt offers E; the HUD also offers a button. The transformation back takes 1.8 s and hands the car model the aircraft's position and heading.

## Transformation

`canTransformToPlane`: playing, no V6 transition, inside the Skyport pad (r 5.5 at the runway threshold), |speed| ≤ 1.5 u/s, not colliding. Any failing condition is reported with a reason the HUD shows ("Stop on the pad to transform", "Too fast", ...). Duration 2.0 s; the staged timeline (`transformStages`) is: side panels 0–30 %, wings 15–70 %, tail/fins 40–85 %, wheels 55–90 %, thruster + flight lights 75–100 %. Plane → car plays it backwards in 1.8 s. Controls are locked during both; the camera pulls back and rises on the car profile.

## Camera

- Flight profile: distance 20, height 8 relative to the aircraft (the camera follows altitude 1:1, plus a damped pitch-following look-ahead of 7 u), FOV 56, slower position damping (λ 3). Portrait: 26 / 11 / 66°.
- The car profile is used on the ground; the blend to the flight profile is by altitude above the ground (0 → 8 u), so takeoff and landing are continuous and need no separate camera mode. The transformation uses the car profile with +4 u distance and +2 u height.
- Reduced motion: the bank is still shown on the aircraft but the camera does not roll with it (it never does).

## Tests

`planePhysics.test.ts` (ground run, rotation, no lift-off without throttle, ground brake/steer, level flight hands-off, climb/dive limits, turn through bank and self-levelling, speed cap and ceiling, gentle stall and recovery, frame-rate independence, floor outside landing zones, touchdown and roll-out, nose vector) and `transform.test.ts` (eligibility with reasons, fold-back rule, durations inside the 1.5–2.5 s budget, staged monotonic timeline, visual progress in both directions, landing zone detection).

E2E `e2e/flight.spec.ts`: the whole loop flown with the keyboard (drive over the causeway, stop on the pad, E, run-up, lift-off, a loop over the sea and the city, a left-hand pattern, centreline final, air brake, touchdown, roll-out, E) with only the car's start on the east road staged; plus the guards (no transformation off the pad or while fast, menu freezes the aircraft, reset mid-air, quality cycles mid-air). Results in `docs/qa/v7-flight-validation.md`.
