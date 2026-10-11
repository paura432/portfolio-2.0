# World polish (V9.1–V9.3) · running report

Branch `feat/v9-world-physics-destruction`. Starting point `7123491` (V9 iteration 1 on top of `9f93b38`). Brief: `world-polish-brief.md`. Criteria: `world-polish-acceptance.md`. State: `world-polish-state.json`.

## Iteration 0 (2026-10-11) · re-baseline and P0 investigation

**Preflight.** Clean tree on the V9 branch; the editorial worktree and the user's dev server on port 3000 untouched; lint, typecheck, 270 unit tests, build green; full E2E 20/21 (the campus "keeps driving" fixed-time check failed under load and passed 2/2 in isolation). QA reports read: V8 final integration, V8 transformer validation, V9 world validation and inventory. Visual state: `docs/screenshots/v9/` (iteration-1 set) and the V8 set.

**P0 — the wedge.** The screenshot (car blocked beside a building, a planter and the sidewalk) was not reproduced from the image; the physics was instrumented instead. A sweep over every 1.5 u grid point of drivable land that is free for the car and has a collider within 2.6 u in at least two directions (736 spots), from 8 headings, trying each of 6 constant inputs (forward, reverse, each with left/right steer) for 3 s with the real `stepCar` and the vehicle's real constraint, found **295 distinct points where the car never gets 2.5 u away**. They cluster on sidewalks beside building padding boxes with a tree trunk or a bench nearby (Duplex at (−18.5, −17…−20), TrustOS at (−30…−33, 26.5) and (−30.5, 7)), in boulevard tree rows and in garden clusters. Several have a best displacement under 0.7 u: genuinely stuck, not merely awkward.

**Root cause (to be confirmed by the fix).** `carPhysics.ts`: heading change per step is `steer · turnRate · min(1, |speed| / 9)`, and a blocked sub-step sets `speed = −0.2 · speed`. Between two rigid bodies the car bumps within a fraction of a unit, never exceeds ≈ 1 u/s, so it cannot turn out, and reversing meets the second body. Trunks and furniture are rigid below their topple / knock speeds, so any forecourt corner with a tree or a bench next to the facade's 1.0 u padding is a trap. The fix belongs to the car model and the level, not to one location.

**Plan for iteration 1 of this loop.** (1) Low-speed steering floor when the throttle is held, so a crawling car still pivots. (2) Glancing contacts slide along the surface (keep tangential speed) instead of reversing; only head-on bumps reverse. (3) A stuck recovery like the boat's: after ≈ 1.5 s of throttle with no displacement, nudge toward the nearest free direction. (4) Level: keep garden clusters and benches out of building forecourt corners (placement margin). (5) The sweep becomes a unit test asserting 0 wedge points and runs on every change. Then camera obstacle avoidance (CAM-01) and the remaining collider categories (COL-02/03).

## Critical review checkpoints

Recorded at the end of each phase (level designer, technical artist, gameplay engineer, UX designer), with concrete defects. None yet.
