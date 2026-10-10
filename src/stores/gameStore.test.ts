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
