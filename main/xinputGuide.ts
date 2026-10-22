/** Undocumented XInput button bit returned by XInputGetStateEx (ordinal 100). */
export const XINPUT_GUIDE_BUTTON = 0x0400;

export interface GuideEdge {
  down: boolean;
  /** True only on the transition into a press, so a held Guide button fires once. */
  pressed: boolean;
}

export function guideEdge(previousDown: boolean, buttons: number): GuideEdge {
  const down = (buttons & XINPUT_GUIDE_BUTTON) !== 0;
  return { down, pressed: down && !previousDown };
}
