# V3 Materials & Lighting

## Palette (`src/lib/palette.ts`)

Starting points kept: background `#080F1D`, ground `#142538`, building `#24394F`, cyan `#4DD5DE`, amber `#FFAE70`, car orange `#FF7A3D`.

Added so that no two large adjacent surfaces share a value:

| Family | Tokens |
|---|---|
| Ground | `ground #142538` (textured), `turf #163338`, `sidewalk #223652`, `curb #3B5272`, `road #0E1826`, `roadLine #5A7AA0`, `crosswalk #B8C8DA` |
| Architecture | `building #24394F`, `buildingLight #2F4760`, `buildingDark #1C2E42`, `concrete #3A4B5F`, `concreteLight #4C5F75`, `roof #182838`, metal `#6B7D93`, metalDark `#36434F`, glass `#14283D` + emissive `#1A6E78`, amber glass `#2E2419` + emissive `#E0803A`, windows `#FFD4A6` warm / `#BFEFF4` cool |
| Accents | cyan, cyanDeep `#1F8F99`, amber, amberDeep `#E0803A`, red `#FF4A3D`, hazard `#F5B64A` |
| Vehicle | carOrange, carOrangeDark `#C9521E`, trim `#8A9AAE`, rim `#B9C4D2`, glass `#223C55` |
| Vegetation | `#1F5A5E`, `#236B62`, `#2C7A55`, `#1E4F6B`, trunk `#3A2F2A` |

Rules: accent colours only on light-emitting elements; saturation stays low on everything else; value steps separate terrain / sidewalk / asphalt.

## Material library (`src/components/game/materials.ts`)

One shared `MeshStandardMaterial` per look, created lazily on the client and reused by every mesh (fewer programs, one place to tune). Surfaces that need texture use small procedural canvas tiles (`surfaceTexture.ts`): speckle + seam grid for terrain, speckle for asphalt and sidewalk. Emissive accents are `MeshBasicMaterial` with `toneMapped = false` so they stay saturated under ACES. Light pools and the car's shadow blob use a radial gradient canvas (`glowTexture.ts`) with additive blending. Zero external assets.

## Renderer

- ACES filmic tone mapping, sRGB output, exposure per lighting preset (applied as a renderer uniform before each frame).
- Shadows: PCF soft via `shadows="percentage"`, key light only; map size 2048 (high) / 1024 (medium) / none (low). The map is disposed and re-allocated when the size changes.
- No post-processing, no bloom.

## Lighting presets (`src/game/render/lighting.ts`)

Three-point rig per preset: cool key (moon) with shadows, warm low fill from the opposite side, faint cyan rim from the south, hemisphere + ambient for the base.

| Preset | Background | Exposure | Key | Fill | Character |
|---|---|---|---|---|---|
| Night Cinematic | `#080F1D` | 1.05 | `#D6E4F5` 2.3 from NE | `#FFB784` 0.55 | deepest contrast, darkest shadow side |
| **Blue Hour** (chosen) | `#0C1A30` | 1.20 | `#E2ECFA` 2.6 from NW | `#FFC08A` 0.9 | every facade separates from its neighbour; horizon reads; emissives still pop |
| Soft Futuristic Dusk | `#121A33` | 1.15 | `#FFD3AE` 2.7 low from SW | `#6FA8E8` 0.85 | warm sides, violet sky; loses the night identity and flattens the cyan accents |

Comparison captures (same three cameras, final world): `docs/screenshots/v3/lighting/{hub,duplex,drive}-{night-cinematic,blue-hour,soft-dusk}.png`. The Phase 1 comparison on the baseline geometry is in `docs/screenshots/v3/lighting-presets/`.

Decision: **Blue Hour**. It was not the darkest; it was the one where the hub's eight faces, the DUPLEX pilasters and the sawtooth roof all read without relying on emissive strips, and where the amber/cyan split still carries meaning. The other two presets remain selectable through the store (`setLighting`) for future comparisons.

## Quality tiers (`src/game/render/quality.ts`)

| Tier | DPR cap | Shadows | Headlight spot & building point lights | Lamp pools | Vegetation | Ambient motion |
|---|---|---|---|---|---|---|
| High | 1.5 | 2048 PCF | yes | yes | 100 % | yes |
| Medium | 1.25 | 1024 PCF | yes | yes | 80 % | yes |
| Low | 1.0 | off | no | no | 55 % (boulevards kept, clusters trimmed) | off |

Buildings, roads, signs and furniture are never hidden. The performance monitor steps down one tier at a time; the HUD cycles tiers.
