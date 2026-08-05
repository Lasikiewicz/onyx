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

  /**
   * How LibraryGrid actually calls this for the "Minimum Details Size" setting: the chosen
   * percentage is passed as BOTH floor and cap, so the panel tracks the slider exactly.
   *
   * Passing only a floor (with a loose 75% cap) made the setting behave as two or three
   * discrete states, because the floor only selects which column count wins and the panel
   * then takes whatever that column count's exact vertical fit demands.
   */
  const layoutForPercent = (pct: number, totalWidth: number, height: number, count: number) => {
    const target = Math.max(400, totalWidth * (pct / 100));
    return computeMaximizeSpaceLayout(totalWidth, height, count, 10, BOXART, target, target, 1);
  };

  it('tracks the requested percentage exactly across the whole slider range', () => {
    const totalWidth = 1920;
    for (let pct = 25; pct <= 50; pct++) {
      const layout = layoutForPercent(pct, totalWidth, 950, 50);
      expect(layout.panelWidth).toBeCloseTo(totalWidth * (pct / 100), 5);
    }
  });

  it('never exceeds the requested percentage, at any library size', () => {
    // The reported bug: at 1920x1080 with 50 games the panel reached 61% while the slider
    // was at 50%, and only had two or three distinct states across the range.
    for (const count of [6, 20, 44, 50, 200, 2000]) {
      for (const pct of [25, 30, 40, 50]) {
        const layout = layoutForPercent(pct, 1920, 950, count);
        expect(layout.panelWidth).toBeLessThanOrEqual(1920 * (pct / 100) + 0.5);
      }
    }
  });

  it('gives a distinct panel width for every step of the slider', () => {
    const widths = new Set<number>();
    for (let pct = 25; pct <= 50; pct++) {
      widths.add(Math.round(layoutForPercent(pct, 1920, 950, 50).panelWidth));
    }
    // 26 steps, 26 distinct widths - no flat regions where dragging does nothing.
    expect(widths.size).toBe(26);
  });

  it('gives more room to details and fewer columns as the percentage rises', () => {
    const at25 = layoutForPercent(25, 2560, 1200, 200);
    const at50 = layoutForPercent(50, 2560, 1200, 200);

    expect(at50.panelWidth).toBeGreaterThan(at25.panelWidth);
    // Fewer columns, not more. This layout is height-constrained: rows = ceil(count / cols),
    // so more columns means fewer rows and thus larger tiles. Shrinking the games view lowers
    // the column count, so a bigger details panel means smaller tiles - the trade the setting
    // exists to let the user make.
    expect(at50.columns).toBeLessThanOrEqual(at25.columns);
  });

  it('keeps the absolute 400px floor on very narrow windows', () => {
    // 25% of 1200px is 300px, below the readable minimum for the details panel.
    const layout = layoutForPercent(25, 1200, 800, 50);
    expect(layout.panelWidth).toBeGreaterThanOrEqual(400);
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
