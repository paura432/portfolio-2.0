# World polish (V9.1–V9.3) · acceptance criteria

Derived from `world-polish-brief.md` §10. Status words: PASS (verified by a test, capture or measurement on this branch), PARTIAL, NOT VERIFIED, FAIL, BLOCKED. Updated every iteration; the loop state is `world-polish-state.json`.

| # | Criterion | Phase | Status | Evidence / plan |
|---|---|---|---|---|
| 1 | The original urban wedge is fixed or documented as non-reproducible after investigation | V9.1 | PASS | reproduced by the physics sweep (295 points), root cause in the car model, fixed; `wedge.test.ts` sweeps the city with 0 wedges; `e2e/navigation.spec.ts` drives out of the five worst poses with real keys |
| 2 | All main routes drivable (districts, labs, harbor, Skyport, beaches, ramps), with reverse, turns, narrow passages, corners, parking | V9.1 | PARTIAL | road reachability (`data.test.ts`), ramp corridors, beach runs, pockets (wedge sweep): PASS; a route-level circulation map and parking checks are still to be written |
| 3 | No known P0/P1 collision defects | V9.1 | FAIL | COL-02, COL-03 open (P1); no P0 left |
| 4 | The camera never seriously obstructs driving (obstacle detection, dynamic distance, smooth recovery, portrait/landscape) | V9.1 | NOT VERIFIED | CAM-01: no obstacle avoidance exists yet |
| 5 | Every district has a recognisable visual identity (silhouette, not only its sign) | V9.2 | NOT VERIFIED | starts after V9.1 has no P0 |
| 6 | Lighting keeps legibility (hierarchy, no white windows, no excess bloom, LOW performance) | V9.2 | NOT VERIFIED | |
| 7 | HUD does not overlap on target viewports; minimal, contextual; projects always reachable | V9.2 | NOT VERIFIED | HUD-01 |
| 8 | All launch ramps verified end to end (approach → recovery) | V9.3 | PARTIAL | 3/3 unit drive-throughs; browser: West City only |
| 9 | All drivable beaches verified both ways | V9.3 | PARTIAL | 3/3 × 3 points unit; browser: South in, East out |
| 10 | Every inventoried destructible furniture class works (lamps, planters, benches, signs, fences, trees, rest) | V9.3 | PARTIAL | lamps, planters, benches, trees: PASS; bollards, bushes, signposts, masts: open |
| 11 | Buildings indestructible | all | PASS | no destruction path exists |
| 12 | Projects remain accessible | all | PASS | smoke, campus, dialog E2E |
| 13 | Unit tests, lint, typecheck, build | all | PASS (270 / clean / clean / 18 routes) | iteration-1 run |
| 14 | Two consecutive full E2E runs green | final | NOT VERIFIED | run 1: 20/21 (load-sensitive check) |
| 15 | Performance measured before and after each phase (software vs GPU distinguished) | all | PARTIAL | V9.1 baseline recorded (SwiftShader); after-phase comparisons pending |
| 16 | Real before/after captures | all | PARTIAL | iteration-1 set; per-fix pairs to follow |
| 17 | No known P0/P1 regressions | all | PASS so far | none introduced; tracked per iteration |
