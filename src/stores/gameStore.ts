import { create } from "zustand";
import type { HarborId, PoiId } from "@/data/archipelago";
import { pointsOfInterest } from "@/data/archipelago";
import type { DistrictId } from "@/data/districts";
import type { LabZoneId } from "@/game/interaction/zones";
import { DEFAULT_LIGHTING, type LightingPresetId } from "@/game/render/lighting";
import type { Quality } from "@/game/render/quality";
import { applyTransition, canBoard, canDock, carAvailableAt, makeTransition, poseOf, type VehicleId, type VehicleSnapshot, type VehicleTransition } from "@/game/vehicle/vehicleManager";

export type GamePhase = "intro" | "playing" | "panel" | "menu";
export type { Quality };

interface GameState extends VehicleSnapshot {
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
  /** Island point of interest whose panel is open (V6). */
  openPoi: PoiId | null;
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
  setNearbyHarbor: (id: HarborId | null) => void;
  setNearbyDock: (id: HarborId | null) => void;
  openPanel: (id: DistrictId, lab?: string | null) => void;
  openPoiPanel: (id: PoiId) => void;
  /** Navigate inside the open panel (campus ↔ lab) without closing it. */
  selectLab: (lab: string | null) => void;
  /**
   * The E key / prompt button. Opens the panel for the nearby district or point
   * of interest, or boards / docks when a vehicle action is available. Returns true if it did something.
   */
  interact: () => boolean;
  /** Car → boat at the nearby harbor (slow car inside the boarding zone). */
  boardBoat: () => boolean;
  /** Boat → pier at the nearby dock: hands the controls to the parked car when there is one, otherwise moors. */
  dockBoat: () => boolean;
  /** Moored boat → sailing again. */
  castOff: () => boolean;
  /** Called by the vehicle controller when the running transition reaches its end. */
  completeTransition: () => void;
  /** Called on a vehicle reset: any transition in flight is cancelled and the player lands in a controllable state. */
  cancelTransition: () => void;
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
  openPoi: null,
  treesDown: 0,
  lastImpact: null,
  activeVehicle: "car",
  transition: null,
  mooredAt: null,
  nearbyHarbor: null,
  nearbyDock: null,

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
  setNearbyHarbor: (id) => {
    if (get().nearbyHarbor !== id) set({ nearbyHarbor: id });
  },
  setNearbyDock: (id) => {
    if (get().nearbyDock !== id) set({ nearbyDock: id });
  },
  openPanel: (id, lab = null) => set({ phase: "panel", openDistrict: id, openLab: lab, openPoi: null }),
  openPoiPanel: (id) => set({ phase: "panel", openPoi: id, openDistrict: null, openLab: null }),
  selectLab: (openLab) => set({ openLab }),
  interact: () => {
    const s = get();
    if (s.phase !== "playing" || s.transition) return false;
    if (s.activeVehicle === "car") {
      if (s.nearbyLab) {
        const [district, lab] = s.nearbyLab.split(":") as [DistrictId, string];
        set({ phase: "panel", openDistrict: district, openLab: lab, openPoi: null });
        return true;
      }
      if (s.nearbyDistrict) {
        set({ phase: "panel", openDistrict: s.nearbyDistrict, openLab: null, openPoi: null });
        return true;
      }
      return s.boardBoat();
    }
    // Boat: moored at a pier → the point of interest; sailing inside a dock zone → dock.
    if (s.mooredAt) {
      const poi = pointsOfInterest.find((p) => p.harbor === s.mooredAt);
      if (!poi) return false;
      set({ phase: "panel", openPoi: poi.id, openDistrict: null, openLab: null });
      return true;
    }
    return s.dockBoat();
  },
  boardBoat: () => {
    const s = get();
    if (s.phase !== "playing" || s.activeVehicle !== "car" || s.transition || !s.nearbyHarbor) return false;
    if (!canBoard(poseOf("car").speed, s.nearbyHarbor)) return false;
    set({ transition: makeTransition("board", s.nearbyHarbor) });
    return true;
  },
  dockBoat: () => {
    const s = get();
    if (s.phase !== "playing" || s.activeVehicle !== "boat" || s.transition || s.mooredAt || !s.nearbyDock) return false;
    if (!canDock(poseOf("boat").speed, s.nearbyDock)) return false;
    const car = poseOf("car");
    const kind = carAvailableAt(s.nearbyDock, car.x, car.z) ? "disembark" : "moor";
    set({ transition: makeTransition(kind, s.nearbyDock) });
    return true;
  },
  castOff: () => {
    const s = get();
    if (s.phase !== "playing" || s.activeVehicle !== "boat" || s.transition || !s.mooredAt) return false;
    set({ transition: makeTransition("cast-off", s.mooredAt) });
    return true;
  },
  completeTransition: () => {
    const s = get();
    if (!s.transition) return;
    set(applyTransition(s));
  },
  cancelTransition: () => {
    const s = get();
    if (!s.transition) return;
    // Land on the side the player was leaving from, never in limbo.
    set({ transition: null, activeVehicle: s.transition.from, mooredAt: s.transition.kind === "cast-off" ? s.mooredAt : null });
  },
  closePanel: () => set({ phase: "playing", openDistrict: null, openLab: null, openPoi: null }),
  openMenu: () => set({ phase: "menu" }),
  closeMenu: () => set({ phase: "playing" }),
  toggleMenu: () => {
    const { phase } = get();
    if (phase === "menu") set({ phase: "playing" });
    else if (phase === "playing") set({ phase: "menu" });
  },
}));

/** True when the active vehicle should respond to input. */
export const selectDrivingEnabled = (s: GameState): boolean => s.phase === "playing" && s.transition === null;

export type { VehicleId, VehicleTransition };
