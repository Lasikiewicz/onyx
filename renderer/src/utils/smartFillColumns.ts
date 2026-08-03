// Sub-pixel/measurement rounding tolerance so a layout that fits "exactly" doesn't get
// bumped to an extra column just because of float imprecision.
const FIT_TOLERANCE_PX = 1;

/**
 * Finds the smallest column count (i.e. largest tiles) whose grid (given `count` tiles of
 * fixed aspect ratio, evenly divided across `containerWidth`) still fits within
 * `containerHeight` without scrolling. Falls back to one tile per row if nothing fits.
 *
 * `minColumns` is the column count for the tile size the user configured (e.g. via the
 * grid/logo size slider or the card view's column count). Smart Fill only ever *shrinks*
 * tiles to make everything fit - it must never return fewer columns than that, or tiles
 * would render larger than the user's configured size.
 */
export function computeSmartFillColumns(
  containerWidth: number,
  containerHeight: number,
  count: number,
  gap: number,
  aspectHeightOverWidth: number,
  minColumns: number = 1,
): number {
  const baseCols = Math.max(1, Math.floor(minColumns));
  if (count <= 0 || containerWidth <= 0 || containerHeight <= 0) return baseCols;
  if (count <= baseCols) return baseCols;

  for (let cols = baseCols; cols <= count; cols++) {
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
