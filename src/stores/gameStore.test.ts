import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./gameStore";

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.setState({ phase: "intro", nearbyDistrict: null, openDistrict: null });
  });

  it("interact only opens a panel while playing near a district", () => {
    const s = useGameStore.getState();
    expect(s.interact()).toBe(false);
    s.startGame();
    expect(useGameStore.getState().interact()).toBe(false);
    s.setNearby("duplex");
    expect(useGameStore.getState().interact()).toBe(true);
    expect(useGameStore.getState().phase).toBe("panel");
    expect(useGameStore.getState().openDistrict).toBe("duplex");
  });

  it("closing the panel resumes driving", () => {
    const s = useGameStore.getState();
    s.startGame();
    s.openPanel("ovi");
    expect(useGameStore.getState().phase).toBe("panel");
    useGameStore.getState().closePanel();
    expect(useGameStore.getState().phase).toBe("playing");
    expect(useGameStore.getState().openDistrict).toBeNull();
  });

  it("menu toggles only between playing and menu", () => {
    const s = useGameStore.getState();
    s.toggleMenu();
    expect(useGameStore.getState().phase).toBe("intro");
    s.startGame();
    useGameStore.getState().toggleMenu();
    expect(useGameStore.getState().phase).toBe("menu");
    useGameStore.getState().toggleMenu();
    expect(useGameStore.getState().phase).toBe("playing");
  });

  it("setNearby does not emit when unchanged", () => {
    let calls = 0;
    const unsub = useGameStore.subscribe(() => calls++);
    useGameStore.getState().setNearby("hub");
    useGameStore.getState().setNearby("hub");
    unsub();
    expect(calls).toBe(1);
  });
});

describe("vehicle transitions (V6)", () => {
  const reset = () =>
    useGameStore.setState({ phase: "playing", activeVehicle: "car", transition: null, mooredAt: null, nearbyHarbor: null, nearbyDock: null, nearbyDistrict: null, nearbyLab: null, openPoi: null, openDistrict: null });

  it("boards only from a boarding zone with the car stopped, then completes to the boat", async () => {
    const { liveCar } = await import("@/game/vehicle/carState");
    reset();
    liveCar.state = { ...liveCar.state, speed: 0 };
    expect(useGameStore.getState().boardBoat()).toBe(false);
    useGameStore.getState().setNearbyHarbor("pau-harbor");
    liveCar.state = { ...liveCar.state, speed: 10 };
    expect(useGameStore.getState().interact(), "fast drive-through never boards").toBe(false);
    liveCar.state = { ...liveCar.state, speed: 0 };
    expect(useGameStore.getState().interact()).toBe(true);
    expect(useGameStore.getState().transition?.kind).toBe("board");
    // A second press during the transition is ignored.
    expect(useGameStore.getState().interact()).toBe(false);
    useGameStore.getState().completeTransition();
    const s = useGameStore.getState();
    expect(s.activeVehicle).toBe("boat");
    expect(s.transition).toBeNull();
  });

  it("docks to the car only where the car is parked; elsewhere it moors, and E then opens the island panel", async () => {
    const { liveCar } = await import("@/game/vehicle/carState");
    const { liveBoat } = await import("@/game/vehicle/boatState");
    const { getHarbor } = await import("@/data/archipelago");
    reset();
    useGameStore.setState({ activeVehicle: "boat" });
    liveBoat.state = { ...liveBoat.state, vx: 0, vz: 0 };
    // Car at the spawn, boat at the Creative Lab pier: no car there → moor.
    liveCar.state = { ...liveCar.state, x: 0, z: 27, speed: 0 };
    useGameStore.getState().setNearbyDock("creative-lab-pier");
    expect(useGameStore.getState().interact()).toBe(true);
    expect(useGameStore.getState().transition?.kind).toBe("moor");
    useGameStore.getState().completeTransition();
    expect(useGameStore.getState().mooredAt).toBe("creative-lab-pier");
    expect(useGameStore.getState().activeVehicle).toBe("boat");
    // Moored: E opens the point of interest, closing returns to the pier (still moored).
    expect(useGameStore.getState().interact()).toBe(true);
    expect(useGameStore.getState().phase).toBe("panel");
    expect(useGameStore.getState().openPoi).toBe("creative-lab");
    useGameStore.getState().closePanel();
    expect(useGameStore.getState().mooredAt).toBe("creative-lab-pier");
    // Cast off → sailing again.
    expect(useGameStore.getState().castOff()).toBe(true);
    useGameStore.getState().completeTransition();
    expect(useGameStore.getState().mooredAt).toBeNull();
    // Back at PAU Harbor with the car parked on the quay → disembark into the car.
    const q = getHarbor("pau-harbor");
    liveCar.state = { ...liveCar.state, x: q.pierRoot[0] + 5, z: 0 };
    useGameStore.getState().setNearbyDock("pau-harbor");
    expect(useGameStore.getState().dockBoat()).toBe(true);
    expect(useGameStore.getState().transition?.kind).toBe("disembark");
    useGameStore.getState().completeTransition();
    expect(useGameStore.getState().activeVehicle).toBe("car");
  });

  it("never docks at speed, never while a panel is open, and cancelling lands on the origin vehicle", async () => {
    const { liveBoat } = await import("@/game/vehicle/boatState");
    reset();
    useGameStore.setState({ activeVehicle: "boat", nearbyDock: "creative-lab-pier" });
    liveBoat.state = { ...liveBoat.state, vx: 0, vz: 12 };
    expect(useGameStore.getState().dockBoat()).toBe(false);
    liveBoat.state = { ...liveBoat.state, vx: 0, vz: 0 };
    useGameStore.setState({ phase: "panel" });
    expect(useGameStore.getState().dockBoat()).toBe(false);
    useGameStore.setState({ phase: "playing" });
    expect(useGameStore.getState().dockBoat()).toBe(true);
    useGameStore.getState().cancelTransition();
    expect(useGameStore.getState().transition).toBeNull();
    expect(useGameStore.getState().activeVehicle).toBe("boat");
    expect(useGameStore.getState().mooredAt).toBeNull();
    // Car side: cancel a boarding → still the car.
    reset();
    useGameStore.setState({ transition: { kind: "board", from: "car", to: "boat", harbor: "pau-harbor", duration: 1 } });
    useGameStore.getState().cancelTransition();
    expect(useGameStore.getState().activeVehicle).toBe("car");
  });

  it("the menu and panels pause the vehicle but keep the active vehicle and mooring", () => {
    reset();
    useGameStore.setState({ activeVehicle: "boat", mooredAt: "creative-lab-pier" });
    useGameStore.getState().openMenu();
    expect(useGameStore.getState().phase).toBe("menu");
    expect(useGameStore.getState().activeVehicle).toBe("boat");
    useGameStore.getState().closeMenu();
    expect(useGameStore.getState().mooredAt).toBe("creative-lab-pier");
  });
});
