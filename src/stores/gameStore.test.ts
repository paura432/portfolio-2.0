import { beforeEach, describe, expect, it } from "vitest";
import { createBoatState } from "@/game/vehicle/boatPhysics";
import { liveBoat } from "@/game/vehicle/boatState";
import { useGameStore } from "./gameStore";

const reset = () => useGameStore.setState({ phase: "playing", vehicleState: "car", transition: null, mooredAt: null, nearbyDock: null, nearbyDistrict: null, nearbyLab: null, openDistrict: null, openPoi: null, landingZone: false, vehicleNotice: null });

describe("game store: one transformable vehicle", () => {
  beforeEach(reset);

  it("moves only along the designed edges and refuses the rest", () => {
    const s = useGameStore.getState();
    expect(s.setVehicleState("flying")).toBe(false);
    expect(useGameStore.getState().vehicleState).toBe("car");
    expect(s.setVehicleState("preparing-flight")).toBe(true);
    expect(s.setVehicleState("transforming-to-plane")).toBe(true);
    expect(s.setVehicleState("transforming-to-boat")).toBe(false);
    expect(s.setVehicleState("flying")).toBe(true);
    expect(s.setVehicleState("transforming-to-boat")).toBe(true);
    expect(s.setVehicleState("transforming-to-plane")).toBe(false);
    expect(s.setVehicleState("floating")).toBe(true);
    expect(s.setVehicleState("exiting-water")).toBe(true);
    expect(s.setVehicleState("car")).toBe(true);
    expect(useGameStore.getState().vehicleState).toBe("car");
  });

  it("a touchdown on land rolls out through landing and the fold-back", () => {
    const s = useGameStore.getState();
    useGameStore.setState({ vehicleState: "flying", landingZone: true });
    expect(s.setVehicleState("landing")).toBe(true);
    expect(useGameStore.getState().landingZone).toBe(false);
    expect(s.setVehicleState("transforming-to-car")).toBe(true);
    expect(s.setVehicleState("car")).toBe(true);
  });

  it("E opens districts and labs as a car, docks or explores as a boat, nothing in the air", () => {
    const s = useGameStore.getState();
    useGameStore.setState({ nearbyDistrict: "ovi" });
    expect(s.interact()).toBe(true);
    expect(useGameStore.getState().phase).toBe("panel");
    reset();
    useGameStore.setState({ vehicleState: "flying", nearbyDistrict: "ovi" });
    expect(s.interact()).toBe(false);
    reset();
    liveBoat.state = createBoatState(0, 0, 0);
    useGameStore.setState({ vehicleState: "floating", nearbyDock: "creative-lab-pier" });
    expect(s.interact()).toBe(true);
    expect(useGameStore.getState().transition?.kind).toBe("moor");
    s.completeTransition();
    expect(useGameStore.getState().mooredAt).toBe("creative-lab-pier");
    expect(s.interact()).toBe(true);
    expect(useGameStore.getState().openPoi).toBe("creative-lab");
    s.closePanel();
    expect(s.castOff()).toBe(true);
    s.completeTransition();
    expect(useGameStore.getState().mooredAt).toBe(null);
  });

  it("docking is refused when fast, moored, gliding or not floating", () => {
    const s = useGameStore.getState();
    liveBoat.state = { ...createBoatState(0, 0, 0), vx: 6, vz: 0 };
    useGameStore.setState({ vehicleState: "floating", nearbyDock: "pau-harbor" });
    expect(s.dockBoat()).toBe(false);
    liveBoat.state = createBoatState(0, 0, 0);
    useGameStore.setState({ vehicleState: "car" });
    expect(s.dockBoat()).toBe(false);
    useGameStore.setState({ vehicleState: "floating", mooredAt: "pau-harbor" });
    expect(s.dockBoat()).toBe(false);
  });

  it("reset returns to the plain car with no glide, mooring or zone", () => {
    const s = useGameStore.getState();
    useGameStore.setState({ vehicleState: "floating", mooredAt: "pau-harbor", transition: null, landingZone: true, vehicleNotice: { text: "x", at: 1 } });
    s.resetVehicle();
    const st = useGameStore.getState();
    expect(st.vehicleState).toBe("car");
    expect(st.mooredAt).toBe(null);
    expect(st.landingZone).toBe(false);
    expect(st.vehicleNotice).toBe(null);
  });

  it("panels and menus pause the vehicle, whatever its body", () => {
    const s = useGameStore.getState();
    useGameStore.setState({ vehicleState: "flying" });
    s.openMenu();
    expect(useGameStore.getState().phase).toBe("menu");
    s.closeMenu();
    expect(useGameStore.getState().phase).toBe("playing");
    expect(useGameStore.getState().vehicleState).toBe("flying");
  });
});
