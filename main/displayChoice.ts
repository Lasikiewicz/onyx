export interface DisplayRect {
  id: number;
  primary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
}

export type DisplayChoice = 'current' | 'primary' | number;

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normalizeDisplayChoice(value: unknown): DisplayChoice {
  if (value === 'primary' || value === 'current') return value;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return 'current';
}

function containsPoint(display: DisplayRect, x: number, y: number): boolean {
  const { bounds } = display;
  return x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height;
}

/**
 * Pick the monitor Big Screen should fill.
 * `current` is the display under the window center, which is the streamed display
 * when Onyx is already on the Moonlight/Sunshine monitor.
 */
export function chooseDisplay(
  displays: DisplayRect[],
  choice: DisplayChoice,
  windowBounds: WindowRect,
): DisplayRect | null {
  if (displays.length === 0) return null;
  const primary = displays.find((display) => display.primary) ?? displays[0];
  if (typeof choice === 'number') {
    return displays.find((display) => display.id === choice) ?? primary;
  }
  if (choice === 'primary') return primary;
  const centerX = windowBounds.x + windowBounds.width / 2;
  const centerY = windowBounds.y + windowBounds.height / 2;
  return displays.find((display) => containsPoint(display, centerX, centerY)) ?? primary;
}
