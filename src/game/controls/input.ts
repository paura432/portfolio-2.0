/**
 * Keyboard/touch input, kept outside React state so the render loop can read
 * it every frame without re-rendering anything.
 */
export interface DriveInput {
  throttle: number; // -1..1 (negative = reverse)
  steer: number; // -1..1 (negative = left)
  brake: boolean;
}

export const KEY_BINDINGS = {
  forward: ["KeyW", "ArrowUp"],
  backward: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  brake: ["Space", "ShiftLeft", "ShiftRight"],
  interact: ["KeyE", "Enter"],
  menu: ["KeyM"],
} as const;

export type Action = keyof typeof KEY_BINDINGS;

export function actionForCode(code: string): Action | null {
  for (const action of Object.keys(KEY_BINDINGS) as Action[]) {
    if ((KEY_BINDINGS[action] as readonly string[]).includes(code)) return action;
  }
  return null;
}

/** Derive a normalised drive input from the set of currently pressed actions. */
export function deriveDriveInput(pressed: ReadonlySet<Action>): DriveInput {
  const throttle = (pressed.has("forward") ? 1 : 0) - (pressed.has("backward") ? 1 : 0);
  const steer = (pressed.has("right") ? 1 : 0) - (pressed.has("left") ? 1 : 0);
  return { throttle, steer, brake: pressed.has("brake") };
}

/** Mutable singleton read by the game loop. */
export const inputState = {
  pressed: new Set<Action>(),
  clear(): void {
    this.pressed.clear();
  },
  get drive(): DriveInput {
    return deriveDriveInput(this.pressed);
  },
};

/** True when the event target is an editable element and should keep the key. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
