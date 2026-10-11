# V6 · PAU SPEEDBOAT physics

Pure, deterministic models in `src/game/vehicle/boatPhysics.ts` (motion) and `src/game/vehicle/buoyancy.ts` (visual float), driven by `src/components/game/Boat.tsx`. Same discipline as the car: sub-steps of at most 1/30 s, large frame gaps clamped, the collision constraint applied after every sub-step.

## Motion (2D, hull frame)

State: `x, z, heading, vx, vz, yawRate, throttle, rudder, bump`.

Each sub-step the world velocity is split into forward `vf` (along the heading) and lateral slip `vl`.

| Effect | Rule | Default |
|---|---|---|
| Thrust | `vf += thrust · throttle · dt` | 7.5 u/s² |
| Reverse | opposite throttle while moving brakes first (`brakeDeceleration`), then reverses slowly | 3 u/s², cap 4 u/s |
| Brake (Space) | `vf → 0` at `brakeDeceleration` | 9 u/s² |
| Drag | `vf -= (a·vf + b·vf·|vf|)·dt` — never a hard stop | a = 0.22, b = 0.016 → terminal ≈ 15.8 u/s (cap 16) |
| Lateral grip | `vl *= exp(−lateralDrag·dt)` | 1.6 /s |
| Rudder authority | `min(1, |vf| / turnSpeedRef)`, plus `idleTurnAuthority` while accelerating from rest (propeller wash) | ref 7 u/s, idle 0.25 |
| Yaw | `yawRate → −steer · turnRate · authority · direction` (exponential, `yawLambda`) | 1.15 rad/s, λ 4.5 |
| Drift | `vl += −yawRate · vf · drift · dt` — a fast turn sheds forward speed sideways | 0.38 |
| Collision | velocity into the contact normal removed, `restitution` of it bounced back, yaw halved, `bump` = impulse | 0.3 |

Consequences the brief asks for, all covered by `boatPhysics.test.ts`: progressive acceleration, terminal speed below the cap, gliding after releasing the throttle, braking faster than coasting, slow reverse, no spinning in place without throttle, drift in fast turns that decays, frame-rate independence (30 vs 120 Hz within 1.5 u after 5 s), a wall stops the hull without launching it and reverse frees it.

## Buoyancy (visual layer)

Five hull points (bow L/R at +2.3, stern L/R at −1.9, centre; half beam 1.05) sample the **same wave function the water shader renders**: `heightAt(x, z, t, shoreDamp(distanceToCoast))` from `src/game/ocean/waves.ts`. The plane through them gives:

- `y` = mean height (+ `freeboard` 0.05)
- `pitch` = atan2(bow − stern, 4.2), nose-up positive
- `roll` = atan2(starboard − port, 2.1)

The pose is damped toward the samples (height λ 6, angles λ 5), so the hull reads as heavy rather than glued to the surface. Two speed terms are added: **planing** bow lift (up to 0.09 rad at full throttle and speed) and **turn roll** into the turn (up to 0.12 rad at full rudder and speed). Horizontal motion never depends on this layer.

### CPU / GPU consistency

- One table `WAVES` (4 Gerstner waves: 26 / 13 / 7.5 / 3.6 u wavelengths, amplitudes 0.2 / 0.11 / 0.07 / 0.04, Σ Q·w·A ≤ 1).
- `waveUniforms()` uploads the derived numbers (direction, amplitude, w = 2π/L, φ = speed·w, Q) to the shader; `GERSTNER_GLSL` is generated from the same constants.
- `displace()` on the CPU is the GPU vertex formula; `heightAt()` inverts the horizontal Gerstner shift with three fixed-point iterations (error < 1 mm, tested).
- Both sides damp waves toward the coast with the same `shoreDamp()` curve over 10 u; the GPU reads the baked `aShore` attribute, the CPU calls `distanceToCoast()`.
- One clock `oceanClock.time`, advanced once per frame by the ocean, read by the boat.

`waves.test.ts` checks the formula, the inversion, the amplitude bounds and the damping; `buoyancy.test.ts` checks flat water, slopes, heading independence and bounded angles on the real waves.

## Collisions

`src/game/world/seaObstacles.ts`: hull circle (r = 2.4) vs coastline polygons (signed distance, push out along the nearest edge), pier decks (boxes), navigation bounds (soft clamp). Stuck recovery: after 2 s pressed against something at near-zero speed the hull is nudged 0.8 u toward open water. R resets the boat to the nearest mooring.

## Camera

`BOAT_FOLLOW_CONFIG`: distance 16, height 7.6, FOV 54, look-ahead 4.5 scaled by speed, slower position damping (λ 3.2) than the car; portrait variant 21 / 12.5 / 64°. The hull's vertical motion reaches the camera position at 35 % (`SWELL_TO_CAMERA`) and is damped again by the follow lambda, so the swell is felt without seasickness. Reduced motion: the ocean clock runs at 35 %, the collision jolt is off.

## Feedback

- Wake: 24-point trail sampled every 1.2 u of travel, painted by the water shader as a ribbon (segments between consecutive points, width 0.75 + 0.62·age, life 7 s, (1−t)² fade) plus a fresh wash behind the propeller; follows curves; disappears when stopped.
- Spray: up to 36 pooled camera-facing puffs from the stern above 4 u/s, more when fast and turning, additive material shared with the V4 dust, budget scaled by the quality tier (none on low).
- Collision: `bump` drives a short hull shudder (off under reduced motion).
