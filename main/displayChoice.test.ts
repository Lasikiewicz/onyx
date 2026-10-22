import { describe, expect, it } from 'vitest';
import { chooseDisplay, normalizeDisplayChoice, type DisplayRect } from './displayChoice';

const displays: DisplayRect[] = [
  { id: 1, primary: true, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
  { id: 2, primary: false, bounds: { x: 1920, y: 0, width: 2560, height: 1440 } },
];

describe('normalizeDisplayChoice', () => {
  it('accepts current, primary, and a display id', () => {
    expect(normalizeDisplayChoice('current')).toBe('current');
    expect(normalizeDisplayChoice('primary')).toBe('primary');
    expect(normalizeDisplayChoice(2)).toBe(2);
    expect(normalizeDisplayChoice('2')).toBe(2);
  });

  it('falls back to the display the window is already on', () => {
    expect(normalizeDisplayChoice('left')).toBe('current');
    expect(normalizeDisplayChoice(-1)).toBe('current');
    expect(normalizeDisplayChoice(undefined)).toBe('current');
  });
});

describe('chooseDisplay', () => {
  it('uses the display under the window center for current', () => {
    const chosen = chooseDisplay(displays, 'current', { x: 2000, y: 100, width: 800, height: 600 });
    expect(chosen?.id).toBe(2);
  });

  it('uses the primary display when asked', () => {
    const chosen = chooseDisplay(displays, 'primary', { x: 2000, y: 100, width: 800, height: 600 });
    expect(chosen?.id).toBe(1);
  });

  it('uses a numeric id and falls back to primary when that id is gone', () => {
    expect(chooseDisplay(displays, 2, { x: 0, y: 0, width: 100, height: 100 })?.id).toBe(2);
    expect(chooseDisplay(displays, 9, { x: 0, y: 0, width: 100, height: 100 })?.id).toBe(1);
  });

  it('returns null when there are no displays', () => {
    expect(chooseDisplay([], 'current', { x: 0, y: 0, width: 100, height: 100 })).toBeNull();
  });
});
