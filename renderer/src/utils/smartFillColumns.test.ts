import { describe, it, expect } from 'vitest';
import { computeMaximizeSpaceLayout, computeSmartFillColumns } from './smartFillColumns';

/**
 * `minPanelWidth` is the contract the "Minimum Details Size" setting rides on: whatever the
 * user picks (25-50% of the row), Maximize Space must never return a panel narrower than it.
 * These pin that, plus the surrounding guarantees the grid layout depends on.
 */

// Boxart tiles are 2:3, i.e. height = 1.5 x width.
const BOXART = 1.5;

describe('computeMaximizeSpaceLayout', () => {
  it('never returns a panel narrower than the floor', () => {
    for (const floor of [400, 600, 800, 1000]) {
      const layout = computeMaximizeSpaceLayout(2560, 1200, 200, 10, BOXART, floor, 1920, 1);
      expect(layout.panelWidth).toBeGreaterThanOrEqual(floor);
    }
  });

  it('honours a 25% floor and a 50% floor differently', () => {
    const totalWidth = 2560;
    const at25 = computeMaximizeSpaceLayout(totalWidth, 1200, 200, 10, BOXART, totalWidth * 0.25, totalWidth * 0.75, 1);
    const at50 = computeMaximizeSpaceLayout(totalWidth, 1200, 200, 10, BOXART, totalWidth * 0.5, totalWidth * 0.75, 1);

    expect(at25.panelWidth).toBeGreaterThanOrEqual(totalWidth * 0.25);
    expect(at50.panelWidth).toBeGreaterThanOrEqual(totalWidth * 0.5);
    // The higher floor genuinely reserves more room for the details panel.
    expect(at50.panelWidth).toBeGreaterThan(at25.panelWidth);

    // ...and therefore yields *fewer* columns. This layout is height-constrained: rows =
    // ceil(count / cols), so more columns means fewer rows and thus larger tiles. Raising the
    // floor shrinks the games view, which forces the search to stop at a lower column count.
    // Bigger minimum details panel therefore means smaller tiles, which is the trade the
    // setting exists to let the user make.
    expect(at50.columns).toBeLessThanOrEqual(at25.columns);
  });

  it('never returns a panel wider than the cap', () => {
    // Very few games: the exact-fit panel would want to grow past its cap.
    const layout = computeMaximizeSpaceLayout(2560, 1200, 2, 10, BOXART, 640, 1920, 1);
    expect(layout.panelWidth).toBeLessThanOrEqual(1920);
  });

  it('treats a floor above the cap as the binding constraint rather than producing a negative range', () => {
    const layout = computeMaximizeSpaceLayout(2560, 1200, 200, 10, BOXART, 2000, 1000, 1);
    expect(layout.panelWidth).toBeGreaterThanOrEqual(2000);
    expect(layout.columns).toBeGreaterThanOrEqual(1);
  });

  it('clamps a negative floor to zero instead of inverting the layout', () => {
    const layout = computeMaximizeSpaceLayout(2560, 1200, 100, 10, BOXART, -500, 1920, 1);
    expect(layout.panelWidth).toBeGreaterThanOrEqual(0);
  });

  it('always returns at least one column', () => {
    for (const count of [0, 1, 5, 500]) {
      const layout = computeMaximizeSpaceLayout(2560, 1200, count, 10, BOXART, 640, 1920, 1);
      expect(layout.columns).toBeGreaterThanOrEqual(1);
    }
  });

  it('degrades safely when there is no usable space', () => {
    expect(computeMaximizeSpaceLayout(0, 1200, 100, 10, BOXART, 640, 1920, 1).columns).toBe(1);
    expect(computeMaximizeSpaceLayout(2560, 0, 100, 10, BOXART, 640, 1920, 1).columns).toBe(1);
    expect(computeMaximizeSpaceLayout(2560, 1200, 0, 10, BOXART, 640, 1920, 1).columns).toBe(1);
  });

  it('leaves the games view the width the panel does not take', () => {
    const totalWidth = 2560;
    const layout = computeMaximizeSpaceLayout(totalWidth, 1200, 200, 10, BOXART, 640, 1920, 1);
    expect(totalWidth - layout.panelWidth).toBeGreaterThan(0);
  });
});

describe('computeSmartFillColumns', () => {
  it('never returns fewer columns than the configured tile size implies', () => {
    // Smart Fill only ever shrinks tiles; returning fewer columns would render them larger
    // than the size the user configured.
    expect(computeSmartFillColumns(1920, 1080, 500, 10, BOXART, 8)).toBeGreaterThanOrEqual(8);
  });

  it('adds columns as the library grows past what fits', () => {
    const few = computeSmartFillColumns(1920, 1080, 12, 10, BOXART, 4);
    const many = computeSmartFillColumns(1920, 1080, 400, 10, BOXART, 4);
    expect(many).toBeGreaterThanOrEqual(few);
  });

  it('returns the base column count when everything already fits', () => {
    expect(computeSmartFillColumns(1920, 1080, 3, 10, BOXART, 6)).toBe(6);
  });

  it('degrades safely on zero-sized containers', () => {
    expect(computeSmartFillColumns(0, 1080, 100, 10, BOXART, 5)).toBe(5);
    expect(computeSmartFillColumns(1920, 0, 100, 10, BOXART, 5)).toBe(5);
  });
});
