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

export interface MaximizeSpaceLayout {
  columns: number;
  panelWidth: number;
}

/**
 * "Maximize Space": instead of fitting tiles within a fixed games-view width, this also
 * chooses the details-panel width so the games view gets the largest tiles possible with
 * (as close to) zero leftover vertical space - it treats `minColumns` as a floor and grows
 * columns (shrinking the panel) until the panel would drop below `minPanelWidth`.
 *
 * For a given column count, the tile size that exactly fills `containerHeight` (no leftover
 * space) is fully determined by height alone (more columns -> fewer rows -> taller tiles,
 * since rows share a fixed height budget). So `requiredContainerWidth(cols)` - and therefore
 * `requiredPanelWidth(cols) = totalWidth - requiredContainerWidth(cols)` - is monotonic in
 * `cols`, letting us walk columns upward and stop at the largest one whose exact-fit panel
 * width still respects the floor.
 */
export function computeMaximizeSpaceLayout(
  totalWidth: number,
  containerHeight: number,
  count: number,
  gap: number,
  aspectHeightOverWidth: number,
  minPanelWidth: number,
  maxPanelWidth: number,
  minColumns: number = 1,
): MaximizeSpaceLayout {
  const baseCols = Math.max(1, Math.floor(minColumns));
  const safeMinPanelWidth = Math.max(0, minPanelWidth);
  const safeMaxPanelWidth = Math.max(safeMinPanelWidth, maxPanelWidth);

  if (count <= 0 || totalWidth <= 0 || containerHeight <= 0) {
    return { columns: baseCols, panelWidth: safeMinPanelWidth };
  }

  let bestCols = 0;
  let bestPanelWidth = 0;
  let cols = baseCols;

  while (cols <= count) {
    const rows = Math.ceil(count / cols);
    const tileHeight = (containerHeight - gap * (rows - 1)) / rows;
    if (tileHeight <= 0) break;

    const tileWidth = tileHeight / aspectHeightOverWidth;
    const requiredContainerWidth = cols * tileWidth + gap * (cols - 1);
    const requiredPanelWidth = totalWidth - requiredContainerWidth;

    // requiredPanelWidth is monotonically non-increasing in cols, so once it drops below
    // the floor, no larger column count will satisfy it either.
    if (requiredPanelWidth < safeMinPanelWidth) break;

    bestCols = cols;
    bestPanelWidth = requiredPanelWidth;

    // Every other `cols` value within this same row count produces the identical tile size
    // (rows is what determines tile size here, not cols) while spending more width for no
    // visual benefit. Jump straight to the next row-count's minimal column count instead of
    // re-testing (and potentially failing on) those wasteful intermediate values.
    if (rows <= 1) break;
    cols = Math.max(cols + 1, Math.ceil(count / (rows - 1)));
  }

  if (bestCols === 0) {
    // Even the fewest allowed columns needs more width than the panel floor leaves available -
    // spend the whole floor budget on the games view and shrink-to-fit normally there.
    const containerWidth = totalWidth - safeMinPanelWidth;
    return {
      columns: computeSmartFillColumns(containerWidth, containerHeight, count, gap, aspectHeightOverWidth, baseCols),
      panelWidth: safeMinPanelWidth,
    };
  }

  if (bestPanelWidth <= safeMaxPanelWidth) {
    return { columns: bestCols, panelWidth: bestPanelWidth };
  }

  // The exact-fit panel width would grow past its cap (very few games) - clamp it and
  // shrink-to-fit normally at that width instead of forcing an exact vertical fill.
  const containerWidth = totalWidth - safeMaxPanelWidth;
  return {
    columns: computeSmartFillColumns(containerWidth, containerHeight, count, gap, aspectHeightOverWidth, baseCols),
    panelWidth: safeMaxPanelWidth,
  };
}
