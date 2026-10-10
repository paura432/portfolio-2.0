import { describe, expect, it } from "vitest";
import { actionForCode, deriveDriveInput, type Action } from "./input";

describe("keyboard mapping", () => {
  it("maps WASD and arrows to the same actions", () => {
    expect(actionForCode("KeyW")).toBe("forward");
    expect(actionForCode("ArrowUp")).toBe("forward");
    expect(actionForCode("KeyA")).toBe("left");
    expect(actionForCode("ArrowRight")).toBe("right");
    expect(actionForCode("KeyE")).toBe("interact");
    expect(actionForCode("KeyQ")).toBeNull();
  });
  it("cancels opposite inputs", () => {
    const pressed = new Set<Action>(["forward", "backward", "left", "right"]);
    expect(deriveDriveInput(pressed)).toEqual({ throttle: 0, steer: 0, brake: false });
  });
  it("derives throttle, steer and brake", () => {
    expect(deriveDriveInput(new Set<Action>(["forward", "left", "brake"]))).toEqual({
      throttle: 1,
      steer: -1,
      brake: true,
    });
  });
});
