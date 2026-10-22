import { describe, expect, it } from 'vitest';
import { pickSpatialIndex, type SpatialRect } from './spatialNavigation';

const rect = (left: number, top: number): SpatialRect => ({ left, top, width: 40, height: 40 });

describe('pickSpatialIndex', () => {
  const row = [rect(0, 0), rect(100, 0), rect(200, 0)];
  const grid = [rect(0, 0), rect(100, 0), rect(0, 100), rect(100, 100)];

  it('moves to the nearest control in that direction', () => {
    expect(pickSpatialIndex(0, row, 'right')).toBe(1);
    expect(pickSpatialIndex(1, row, 'left')).toBe(0);
    expect(pickSpatialIndex(0, grid, 'down')).toBe(2);
    expect(pickSpatialIndex(0, grid, 'right')).toBe(1);
  });

  it('wraps to the opposite edge of a row', () => {
    expect(pickSpatialIndex(2, row, 'right')).toBe(0);
    expect(pickSpatialIndex(0, row, 'left')).toBe(2);
  });

  it('returns null when there is nowhere to move', () => {
    expect(pickSpatialIndex(0, [rect(0, 0)], 'right')).toBeNull();
    expect(pickSpatialIndex(-1, row, 'right')).toBeNull();
  });
});
