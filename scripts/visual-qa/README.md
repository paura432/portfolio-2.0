# Visual QA scripts (V3 + V4 + V5 + V6)

All scripts drive a production build with Playwright's Chromium + SwiftShader and the in-page probe `window.__pauWorld` (photo mode, teleport, quality lock, renderer stats, fps sampler). Start the build first:

```bash
pnpm build && pnpm exec next start -p 3101
```

| Script | Purpose |
|---|---|
| `v3shots.mjs <outDir> [base] [--no-medium]` | the 18-shot QA set with fixed cameras + `stats.json` |
| `districts.mjs <outDir> [base]` | BROKI, TrustOS, 42 Madrid, Contact Station and two aerials |
| `presets.mjs <outDir> [base]` | the three lighting presets from three identical cameras |
| `carshots.mjs <outDir> [base]` | vehicle turnaround (rear, side, three-quarter, front, top) |
| `closeup.mjs <outDir> [base]` | BROKI sign close-up |
| `fps.mjs [base]` | load time, FPS and renderer counters per quality tier |
| `fpsgeneric.mjs [base]` | build-agnostic FPS (used for the sprint-02 baseline) |
| `leak.mjs [base]` | geometry/texture/program counters across idle, teleports, photos, tiers, driving, menus |
| `preview-v3.mjs [base]` | regenerates `public/preview/city.jpg` and `city-portrait.jpg` from the real render |
| `v4sequence.mjs <outDir> [base] [--mode soft\|medium\|strong] [--quality q] [--slow k] [--video] [--reduced] [--mobile]` | V4: real-driving impact on a boulevard tree from a fixed side camera (or the follow camera on a phone): intact → impact → falling → fallen → reset → regrow, plus a state timeline; `--slow` scales the tree clock so software rendering films the fall; `--video` records a webm |
| `v4tree.mjs <outDir> [base] [--mode m] [--quality q]` | V4: the same impact seen from the follow camera |
| `v4drive.mjs <outDir> [base] [--quality q]` | V4: hard brake (skid marks + brake lights), fast turn, off-road dust, canopy sway pair |
| `v5shots.mjs <outDir> [base] [--quality q] [--mobile] [--only a,b]` | V5: campus set (island aerial, campus aerials, access, hall, plaza, four labs, prompt, campus/lab panels, menu) + `*-stats.json` |
| `v4perf.mjs [base] [--label name] [--base-only]` | V4: five performance scenarios (world, one tree, several trees, prolonged driving, repeated restorations); `--base-only` for a build without destructible trees |
| `v6shots.mjs <outDir> [base] [--quality q] [--mobile] [--only a,b]` | V6: island in the sea, west coast, harbor approach/quay/pier, boarding prompt, moored boat, boarding transition, boat turnaround (rear/side/three-quarter/top), sailing, turning, wake, second island ahead, docking prompt, moored, POI panel, island aerial; every vehicle change goes through the real E key |
| `v6perf.mjs [base] [--label name]` | V6: city driving (3 tiers, comparable with v4perf "world"), harbor view, open-sea sailing with wake (3 tiers), a transition round trip with counters before/after, and quality cycles while sailing |

SwiftShader numbers are software rendering: use them for relative comparisons only, never as hardware performance.
