# World polish (V9.1–V9.3) · running report

Branch `feat/v9-world-physics-destruction`. Starting point `7123491` (V9 iteration 1 on top of `9f93b38`). Brief: `world-polish-brief.md`. Criteria: `world-polish-acceptance.md`. State: `world-polish-state.json`.

## Iteration 0 (2026-10-11) · re-baseline and P0 investigation

**Preflight.** Clean tree on the V9 branch; the editorial worktree and the user's dev server on port 3000 untouched; lint, typecheck, 270 unit tests, build green; full E2E 20/21 (the campus "keeps driving" fixed-time check failed under load and passed 2/2 in isolation). QA reports read: V8 final integration, V8 transformer validation, V9 world validation and inventory. Visual state: `docs/screenshots/v9/` (iteration-1 set) and the V8 set.

**P0 — the wedge.** The screenshot (car blocked beside a building, a planter and the sidewalk) was not reproduced from the image; the physics was instrumented instead. A sweep over every 1.5 u grid point of drivable land that is free for the car and has a collider within 2.6 u in at least two directions (736 spots), from 8 headings, trying each of 6 constant inputs (forward, reverse, each with left/right steer) for 3 s with the real `stepCar` and the vehicle's real constraint, found **295 distinct points where the car never gets 2.5 u away**. They cluster on sidewalks beside building padding boxes with a tree trunk or a bench nearby (Duplex at (−18.5, −17…−20), TrustOS at (−30…−33, 26.5) and (−30.5, 7)), in boulevard tree rows and in garden clusters. Several have a best displacement under 0.7 u: genuinely stuck, not merely awkward.

**Root cause (to be confirmed by the fix).** `carPhysics.ts`: heading change per step is `steer · turnRate · min(1, |speed| / 9)`, and a blocked sub-step sets `speed = −0.2 · speed`. Between two rigid bodies the car bumps within a fraction of a unit, never exceeds ≈ 1 u/s, so it cannot turn out, and reversing meets the second body. Trunks and furniture are rigid below their topple / knock speeds, so any forecourt corner with a tree or a bench next to the facade's 1.0 u padding is a trap. The fix belongs to the car model and the level, not to one location.

**Plan for iteration 1 of this loop.** (1) Low-speed steering floor when the throttle is held, so a crawling car still pivots. (2) Glancing contacts slide along the surface (keep tangential speed) instead of reversing; only head-on bumps reverse. (3) A stuck recovery like the boat's: after ≈ 1.5 s of throttle with no displacement, nudge toward the nearest free direction. (4) Level: keep garden clusters and benches out of building forecourt corners (placement margin). (5) The sweep becomes a unit test asserting 0 wedge points and runs on every change. Then camera obstacle avoidance (CAM-01) and the remaining collider categories (COL-02/03).

## Iteration 1 (2026-10-11) · NAV-01 fixed at the root

**Reproduction.** The sweep of iteration 0 (736 tight spots, 295 wedge points) is now `src/game/world/wedgeSweep.ts`; the worst poses are listed in `wedge.test.ts`.

**Root cause, confirmed by the fix.** `carPhysics.ts`: (1) turn authority was `min(1, |speed| / 9)`, zero for a crawling car; (2) every blocked sub-step set `speed = −0.2 · speed`, so a glancing contact with a kerb-side trunk or a facade padding box killed the speed instead of letting the car slide along it. Between two rigid bodies the car never reached the speed it needed to steer out.

**Fix.** (1) `LOW_SPEED_STEER = 0.35`: while the throttle is held, a crawling car keeps 35 % of its turn rate (an arcade pivot; with no throttle a stationary car still does not rotate); the turn direction follows the throttle sign when the car is still. (2) `bumpSpeed`: the push-out direction is the contact normal; a head-on contact (|forward · normal| > 0.6) still bounces back softly; a glancing one keeps `1 − |dot|` of the speed (at least 30 %), so the car slides along walls, kerbs and trunks. No obstacle was removed or shrunk; buildings, trunks and furniture are as solid as before.

**Evidence.** `wedge.test.ts`: the city on a 1.5 u grid from 8 headings, 736 tight spots, 0 wedges (a wedge = fails both the 3 s / 2.5 u trial and the 6 s / 4 u trial; the tree and prop simulations advance with the car and are restored after each trial, so a rammed trunk falls as in the game). One pose in a four-tree garden cluster at (−44, −54.5) passes only the long trial: the car crawls out at low speed; recorded, not hidden. `e2e/navigation.spec.ts`: the five worst poses (Duplex forecourt corner ×2, TrustOS north and south, plaza south exit) staged by teleport, driven out with plain keys (S, W, S+A, W+D, W+A, S+D) within one or two attempts each; 1/1 green. The attempt at a level-side fix (cluster trees 3.2 u apart) was reverted: it reshuffled the procedural layout, lost a tree and created 14 new pockets.

**Regressions.** Unit 272/272, lint and typecheck clean, build green. Full E2E run 1 of this build: 21/22 — the only failure was again `campus.spec.ts` "keeps driving", with the identical displacement as in the V9 iteration-1 run (0.373 u in 1.2 s of wall-clock) and a pass in isolation: as the first test of a run under SwiftShader it gets few frames per second (the physics clamps each frame to 0.1 s), so the fixed budget measured the frame count, not whether driving resumed. The check is now condition-based with the same 0.5 u threshold (hold S until the car has moved 0.5 u, 10 s cap), the same treatment V8.1 gave the smoke check. Run 2 of the build: 22/22 green (desktop + mobile, 7.4 min).

## Critical review checkpoints

Recorded at the end of each phase (level designer, technical artist, gameplay engineer, UX designer), with concrete defects. None yet.
