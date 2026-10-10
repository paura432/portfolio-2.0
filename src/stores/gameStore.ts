import { create } from "zustand";
import type { DistrictId } from "@/data/districts";
import type { LabZoneId } from "@/game/interaction/zones";
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
  /** Secondary building (campus lab) whose zone the car is inside, if any. */
  nearbyLab: LabZoneId | null;
  /** Lab selected inside the open campus panel (plot id), if any. */
  openLab: string | null;
  /** Trees currently knocked down or falling (drives the "Reset world" action). */
  treesDown: number;
  /** Last tree impact for the HUD toast; `at` is performance.now(). */
  lastImpact: { kind: "shake" | "topple" | "break"; at: number } | null;

  startGame: () => void;
  setSceneReady: (ready: boolean) => void;
  setContextLost: (lost: boolean) => void;
  setQuality: (q: Quality) => void;
  setLighting: (l: LightingPresetId) => void;
  setTreesDown: (n: number) => void;
  noteImpact: (kind: "shake" | "topple" | "break") => void;
  setNearby: (id: DistrictId | null) => void;
  setNearbyLab: (id: LabZoneId | null) => void;
  openPanel: (id: DistrictId, lab?: string | null) => void;
  /** Navigate inside the open panel (campus ↔ lab) without closing it. */
  selectLab: (lab: string | null) => void;
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
  nearbyLab: null,
  openLab: null,
  treesDown: 0,
  lastImpact: null,

  startGame: () => set({ phase: "playing" }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setContextLost: (contextLost) => set({ contextLost }),
  setQuality: (quality) => set({ quality }),
  setLighting: (lighting) => set({ lighting }),
  setTreesDown: (treesDown) => {
    if (get().treesDown !== treesDown) set({ treesDown });
  },
  noteImpact: (kind) => set({ lastImpact: { kind, at: performance.now() } }),
  setNearby: (id) => {
    if (get().nearbyDistrict !== id) set({ nearbyDistrict: id });
  },
  setNearbyLab: (id) => {
    if (get().nearbyLab !== id) set({ nearbyLab: id });
  },
  openPanel: (id, lab = null) => set({ phase: "panel", openDistrict: id, openLab: lab }),
  selectLab: (openLab) => set({ openLab }),
  interact: () => {
    const { phase, nearbyDistrict, nearbyLab } = get();
    if (phase !== "playing") return false;
    if (nearbyLab) {
      const [district, lab] = nearbyLab.split(":") as [DistrictId, string];
      set({ phase: "panel", openDistrict: district, openLab: lab });
      return true;
    }
    if (!nearbyDistrict) return false;
    set({ phase: "panel", openDistrict: nearbyDistrict, openLab: null });
    return true;
  },
  closePanel: () => set({ phase: "playing", openDistrict: null, openLab: null }),
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
