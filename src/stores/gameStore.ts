import { create } from "zustand";
import type { HarborId, PoiId } from "@/data/archipelago";
import { pointsOfInterest } from "@/data/archipelago";
import type { BeachId } from "@/data/beaches";
import type { DistrictId } from "@/data/districts";
import type { RampId } from "@/data/ramps";
import type { LabZoneId } from "@/game/interaction/zones";
import { DEFAULT_LIGHTING, type LightingPresetId } from "@/game/render/lighting";
import type { Quality } from "@/game/render/quality";
import { canTransition, type VehicleState } from "@/game/vehicle/transformer";
import { applyTransition, canDock, makeTransition, poseOf, type VehicleSnapshot, type VehicleTransition } from "@/game/vehicle/vehicleManager";

export type GamePhase = "intro" | "playing" | "panel" | "menu";
/** Tree impacts (V4) and street-furniture impacts (V9). */
export type ImpactKind = "shake" | "topple" | "break" | "wobble" | "shove" | "knock" | "flatten";
export const IMPACT_LABEL: Record<ImpactKind, string> = { shake: "Tree shaken", topple: "Tree knocked down", break: "Trunk snapped", wobble: "", shove: "", knock: "", flatten: "" };
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
  /** V9: street furniture currently knocked down or falling. */
  propsDown: number;
  /** Last impact for the HUD toast (a tree or, V9, a prop); `at` is performance.now(). */
  lastImpact: { kind: ImpactKind; label: string; at: number } | null;
  /** V8: ramp whose corridor the car is in. */
  nearbyRamp: RampId | null;
  /** V8: beach whose footprint the vehicle is on. */
  nearbyBeach: BeachId | null;
  /** V8: the aircraft is low and slow over ground it may land on. */
  landingZone: boolean;
  /** Short HUD notice about the vehicle (why a takeoff failed, the altitude floor, the sea change, ...). */
  vehicleNotice: { text: string; at: number } | null;
  /** V9 debug overlay (colliders, drive areas, contacts). Only the probe and development builds switch it on; never shown to visitors. */
  debugColliders: boolean;

  startGame: () => void;
  setSceneReady: (ready: boolean) => void;
  setContextLost: (lost: boolean) => void;
  setQuality: (q: Quality) => void;
  setLighting: (l: LightingPresetId) => void;
  setTreesDown: (n: number) => void;
  setPropsDown: (n: number) => void;
  /** Record an impact for the HUD toast; `label` defaults to the tree wording. */
  noteImpact: (kind: ImpactKind, label?: string) => void;
  setNearby: (id: DistrictId | null) => void;
  setNearbyLab: (id: LabZoneId | null) => void;
  setNearbyDock: (id: HarborId | null) => void;
  setNearbyRamp: (id: RampId | null) => void;
  setNearbyBeach: (id: BeachId | null) => void;
  setLandingZone: (on: boolean) => void;
  noteVehicle: (text: string) => void;
  setDebugColliders: (on: boolean) => void;
  /**
   * Move the vehicle state machine along one of its edges (the physics
   * controller is the only caller). Returns false and changes nothing when
   * the edge does not exist, so two transformations can never overlap.
   */
  setVehicleState: (next: VehicleState) => boolean;
  /** Reset: back to the plain car, stopped, no glide, no sequence. */
  resetVehicle: () => void;
  openPanel: (id: DistrictId, lab?: string | null) => void;
  openPoiPanel: (id: PoiId) => void;
  /** Navigate inside the open panel (campus ↔ lab) without closing it. */
  selectLab: (lab: string | null) => void;
  /**
   * The E key / prompt button. Opens the panel for the nearby district, lab or
   * point of interest, or docks at a pier. Returns true if it did something.
   */
  interact: () => boolean;
  /** Floating hull inside a docking zone, slow enough → glide onto the mooring. */
  dockBoat: () => boolean;
  /** Moored hull → floating again. */
  castOff: () => boolean;
  /** Called by the vehicle controller when the running pier glide reaches its end. */
  completeTransition: () => void;
  /** Called on a vehicle reset: any glide in flight is cancelled. */
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
  propsDown: 0,
  lastImpact: null,
  vehicleState: "car",
  transition: null,
  mooredAt: null,
  nearbyDock: null,
  nearbyRamp: null,
  nearbyBeach: null,
  landingZone: false,
  vehicleNotice: null,
  debugColliders: false,

  startGame: () => set({ phase: "playing" }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setContextLost: (contextLost) => set({ contextLost }),
  setQuality: (quality) => set({ quality }),
  setLighting: (lighting) => set({ lighting }),
  setTreesDown: (treesDown) => {
    if (get().treesDown !== treesDown) set({ treesDown });
  },
  setPropsDown: (propsDown) => {
    if (get().propsDown !== propsDown) set({ propsDown });
  },
  noteImpact: (kind, label) => set({ lastImpact: { kind, label: label ?? IMPACT_LABEL[kind], at: performance.now() } }),
  setNearby: (id) => {
    if (get().nearbyDistrict !== id) set({ nearbyDistrict: id });
  },
  setNearbyLab: (id) => {
    if (get().nearbyLab !== id) set({ nearbyLab: id });
  },
  setNearbyDock: (id) => {
    if (get().nearbyDock !== id) set({ nearbyDock: id });
  },
  setNearbyRamp: (id) => {
    if (get().nearbyRamp !== id) set({ nearbyRamp: id });
  },
  setNearbyBeach: (id) => {
    if (get().nearbyBeach !== id) set({ nearbyBeach: id });
  },
  setLandingZone: (on) => {
    if (get().landingZone !== on) set({ landingZone: on });
  },
  noteVehicle: (text) => set({ vehicleNotice: { text, at: performance.now() } }),
  setDebugColliders: (debugColliders) => set({ debugColliders }),
  setVehicleState: (next) => {
    const s = get();
    if (s.vehicleState === next) return true;
    if (!canTransition(s.vehicleState, next)) return false;
    set({ vehicleState: next, landingZone: next === "flying" ? s.landingZone : false });
    return true;
  },
  resetVehicle: () => set({ vehicleState: "car", transition: null, mooredAt: null, nearbyDock: null, landingZone: false, vehicleNotice: null }),
  openPanel: (id, lab = null) => set({ phase: "panel", openDistrict: id, openLab: lab, openPoi: null }),
  openPoiPanel: (id) => set({ phase: "panel", openPoi: id, openDistrict: null, openLab: null }),
  selectLab: (openLab) => set({ openLab }),
  interact: () => {
    const s = get();
    if (s.phase !== "playing" || s.transition) return false;
    if (s.vehicleState === "floating") {
      // Moored at a pier → the point of interest; sailing inside a dock zone → dock.
      if (s.mooredAt) {
        const poi = pointsOfInterest.find((p) => p.harbor === s.mooredAt);
        if (!poi) return false;
        set({ phase: "panel", openPoi: poi.id, openDistrict: null, openLab: null });
        return true;
      }
      return s.dockBoat();
    }
    if (s.vehicleState !== "car") return false;
    if (s.nearbyLab) {
      const [district, lab] = s.nearbyLab.split(":") as [DistrictId, string];
      set({ phase: "panel", openDistrict: district, openLab: lab, openPoi: null });
      return true;
    }
    if (s.nearbyDistrict) {
      set({ phase: "panel", openDistrict: s.nearbyDistrict, openLab: null, openPoi: null });
      return true;
    }
    return false;
  },
  dockBoat: () => {
    const s = get();
    if (s.phase !== "playing" || s.vehicleState !== "floating" || s.transition || s.mooredAt || !s.nearbyDock) return false;
    if (!canDock(poseOf("floating").speed, s.nearbyDock)) return false;
    set({ transition: makeTransition("moor", s.nearbyDock) });
    return true;
  },
  castOff: () => {
    const s = get();
    if (s.phase !== "playing" || s.vehicleState !== "floating" || s.transition || !s.mooredAt) return false;
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
    set({ transition: null, mooredAt: s.transition.kind === "cast-off" ? s.mooredAt : null });
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

/** True when the vehicle should respond to input. */
export const selectDrivingEnabled = (s: GameState): boolean => s.phase === "playing" && s.transition === null && s.mooredAt === null;

export type { VehicleTransition };
