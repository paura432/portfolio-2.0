/**
 * Lighting presets for the V3 art direction. Pure data: the scene component
 * reads one preset; the capture tooling cycles through all of them from the
 * same camera so the choice is made on evidence (see docs/art-direction).
 */
export type LightingPresetId = "night-cinematic" | "blue-hour" | "soft-dusk";

export interface LightingPreset {
  id: LightingPresetId;
  name: string;
  background: string;
  fog: { near: number; far: number };
  exposure: number;
  hemisphere: { sky: string; ground: string; intensity: number };
  ambient: { color: string; intensity: number };
  key: { color: string; intensity: number; position: [number, number, number] };
  fill: { color: string; intensity: number; position: [number, number, number] };
  rim: { color: string; intensity: number; position: [number, number, number] };
}

export const LIGHTING_PRESETS: Record<LightingPresetId, LightingPreset> = {
  "night-cinematic": {
    id: "night-cinematic",
    name: "Night Cinematic",
    background: "#080F1D",
    fog: { near: 85, far: 200 },
    exposure: 1.05,
    hemisphere: { sky: "#6B8FB8", ground: "#1C3048", intensity: 1.0 },
    ambient: { color: "#9FB8D6", intensity: 0.35 },
    key: { color: "#D6E4F5", intensity: 2.3, position: [40, 60, 25] },
    fill: { color: "#FFB784", intensity: 0.55, position: [-45, 22, -30] },
    rim: { color: "#4DD5DE", intensity: 0.35, position: [-20, 30, 60] },
  },
  "blue-hour": {
    id: "blue-hour",
    name: "Blue Hour",
    background: "#0C1A30",
    fog: { near: 95, far: 215 },
    exposure: 1.2,
    hemisphere: { sky: "#86A9D8", ground: "#27405C", intensity: 1.35 },
    ambient: { color: "#B2C6E2", intensity: 0.45 },
    key: { color: "#E2ECFA", intensity: 2.6, position: [-30, 58, 35] },
    fill: { color: "#FFC08A", intensity: 0.9, position: [38, 20, -42] },
    rim: { color: "#7FE6EE", intensity: 0.4, position: [20, 26, 70] },
  },
  "soft-dusk": {
    id: "soft-dusk",
    name: "Soft Futuristic Dusk",
    background: "#121A33",
    fog: { near: 80, far: 190 },
    exposure: 1.15,
    hemisphere: { sky: "#8F93CB", ground: "#2E2D4B", intensity: 1.3 },
    ambient: { color: "#B9B4DA", intensity: 0.5 },
    key: { color: "#FFD3AE", intensity: 2.7, position: [-52, 26, 42] },
    fill: { color: "#6FA8E8", intensity: 0.85, position: [40, 30, -30] },
    rim: { color: "#4DD5DE", intensity: 0.3, position: [0, 30, -70] },
  },
};

/** Preset chosen after the Phase 1 comparison (documented in v3-materials-lighting.md). */
export const DEFAULT_LIGHTING: LightingPresetId = "blue-hour";

export const lightingPresetIds = Object.keys(LIGHTING_PRESETS) as LightingPresetId[];
