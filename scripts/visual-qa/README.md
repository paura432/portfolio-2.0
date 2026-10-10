# Visual QA scripts (V3)

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

SwiftShader numbers are software rendering: use them for relative comparisons only, never as hardware performance.
