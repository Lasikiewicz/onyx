// Sub-pixel/measurement rounding tolerance so a layout that fits "exactly" doesn't get
// bumped to an extra column just because of float imprecision.
const FIT_TOLERANCE_PX = 1;

/**
 * Finds the largest column count whose grid (given `count` tiles of fixed aspect ratio,
 * evenly divided across `containerWidth`) still fits within `containerHeight` without
 * scrolling. Falls back to one tile per row if nothing fits.
 */
export function computeSmartFillColumns(
  containerWidth: number,
  containerHeight: number,
  count: number,
  gap: number,
  aspectHeightOverWidth: number,
): number {
  if (count <= 0 || containerWidth <= 0 || containerHeight <= 0) return 1;

  for (let cols = 1; cols <= count; cols++) {
    const tileWidth = (containerWidth - gap * (cols - 1)) / cols;
    if (tileWidth <= 0) continue;
    const tileHeight = tileWidth * aspectHeightOverWidth;
    const rows = Math.ceil(count / cols);
    const totalHeight = rows * tileHeight + gap * (rows - 1);
    if (totalHeight <= containerHeight + FIT_TOLERANCE_PX) {
      return cols;
    }
  }

  // Nothing fit row-by-row (extremely tall/narrow container) - fall back to one row.
  return count;
}
