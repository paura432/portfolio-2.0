import { create } from "zustand";
import type { DistrictId } from "@/data/districts";
import { DEFAULT_LIGHTING, type LightingPresetId } from "@/game/render/lighting";
import type { Quality } from "@/game/render/quality";

export type GamePhase = "intro" | "playing" | "panel" | "menu";
export type { Quality };

interface GameState {
  phase: GamePhase;
  /** Set once the WebGL canvas has rendered its first frame. */
  sceneReady: boolean;
  /** True while the WebGL context is lost (GPU reset, tab eviction). */
  contextLost: boolean;
  quality: Quality;
  /** Lighting preset (art-direction comparison; the default is the chosen one). */
  lighting: LightingPresetId;
  /** District whose interaction zone the car is currently inside. */
  nearbyDistrict: DistrictId | null;
  /** District whose content panel is open. */
  openDistrict: DistrictId | null;

  startGame: () => void;
  setSceneReady: (ready: boolean) => void;
  setContextLost: (lost: boolean) => void;
  setQuality: (q: Quality) => void;
  setLighting: (l: LightingPresetId) => void;
  setNearby: (id: DistrictId | null) => void;
  openPanel: (id: DistrictId) => void;
  /** Opens the panel for the nearby district, if any. Returns true if it opened. */
  interact: () => boolean;
  closePanel: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  phase: "intro",
  sceneReady: false,
  contextLost: false,
  quality: "high",
  lighting: DEFAULT_LIGHTING,
  nearbyDistrict: null,
  openDistrict: null,

  startGame: () => set({ phase: "playing" }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setContextLost: (contextLost) => set({ contextLost }),
  setQuality: (quality) => set({ quality }),
  setLighting: (lighting) => set({ lighting }),
  setNearby: (id) => {
    if (get().nearbyDistrict !== id) set({ nearbyDistrict: id });
  },
  openPanel: (id) => set({ phase: "panel", openDistrict: id }),
  interact: () => {
    const { phase, nearbyDistrict } = get();
    if (phase !== "playing" || !nearbyDistrict) return false;
    set({ phase: "panel", openDistrict: nearbyDistrict });
    return true;
  },
  closePanel: () => set({ phase: "playing", openDistrict: null }),
  openMenu: () => set({ phase: "menu" }),
  closeMenu: () => set({ phase: "playing" }),
  toggleMenu: () => {
    const { phase } = get();
    if (phase === "menu") set({ phase: "playing" });
    else if (phase === "playing") set({ phase: "menu" });
  },
}));

/** True when the car should respond to input. */
export const selectDrivingEnabled = (s: GameState): boolean => s.phase === "playing";
