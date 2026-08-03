# Grid View (Main View)

## What This Feature Does

Displays the games list as a resizable grid of cover-art (or boxart) tiles. Supports drag-and-drop reorder, configurable tile size, optional logos over boxart, and an optional Smart Fill mode that auto-shrinks tiles so every visible game fits on screen without scrolling. Used for view mode "grid". Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — layout and view mode.
- [Game Details Panel](../components/game-details-panel.md) — right panel when a game is selected.
- [Games List](../components/games-list.md) — left panel that hosts the grid.
- [Settings and preferences](../../settings-and-preferences.md) — grid size and tile options persistence.

## User-Facing Surfaces

- Left panel: scrollable grid of game cards ([SortableGameCard.tsx](../../../../renderer/src/components/SortableGameCard.tsx)). Each card shows boxart (or logo), optional title, and supports click (select), play, context menu, drag for reorder.
- Right panel: game details (when a game is selected). See [Game Details Panel](../components/game-details-panel.md).

## Settings and Toggles

- Grid size (tile size), game tile padding, hide game titles, show logo over boxart, logo position (top/middle/bottom/underneath), logo background color/opacity, description size. Smart Fill (persisted `gridSmartFill`) auto-shrinks tiles to fit every game on one screen without scrolling; the tile size slider is hidden while Smart Fill is active. Right-click menu ([RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx)) and [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Confirmed End-to-End Flows

1. User resizes grid (slider or right-click): tile size updates; preference saved via [App.tsx](../../../../renderer/src/App.tsx).
2. User drags a tile: reorder via dnd-kit in [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx); onReorder persists new order.
3. User toggles logo over boxart or logo position: display updates; preferences saved.

## Discovery and Data Sources

- Games list from [App.tsx](../../../../renderer/src/App.tsx) (filtered). Reorder persisted via GameStore/preferences. Grid/list options from [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Data Model and Persistence

- Grid size, tile padding, logo/boxart options, `gridSmartFill` stored in [UserPreferencesService](../../../../main/UserPreferencesService.ts). Game order persisted on drag-end.

## Failure Modes and Triage

### Symptom: Grid not reordering

- Check DndContext and SortableContext in [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx); onReorder callback and persistence in [App.tsx](../../../../renderer/src/App.tsx).

### Symptom: Tiles too large/small or not filling space

- Verify `gridSize`/`logoSize` when Smart Fill is off. When Smart Fill is on, check the `ResizeObserver`-driven column computation in [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx), which calls [smartFillColumns.ts](../../../../renderer/src/utils/smartFillColumns.ts) with the tile aspect ratio (`aspect-[2/3]` for boxart, `aspect-[16/9]` for logo, matching [GameCard.tsx](../../../../renderer/src/components/GameCard.tsx)) — a wrong aspect constant under- or over-fills the available space.
- Smart Fill only ever *shrinks* tiles: `computeSmartFillColumns` takes a `minColumns` floor (derived from `gridSize`/`logoSize`, mirroring the non-Smart-Fill `repeat(auto-fit, Npx)` layout) so it never returns fewer columns — i.e. bigger tiles — than the configured tile size, even with very few games in view.
- If Smart Fill appears frozen on a stale column count after moving the window to a different display, note that `ResizeObserver` only reacts to the container's CSS-pixel box size; [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx) also listens for `window resize` and DPI changes (via a self-resubscribing `matchMedia('(resolution: ...)')` query, guarded since `matchMedia` isn't available in every environment) to force a recompute when the screen/scale factor changes without a corresponding box-size change.
- If Maximize Space (`gridMaximizeSpace`) leaves leftover space at the bottom instead of filling it, check that `computeMaximizeSpaceLayout()` in [smartFillColumns.ts](../../../../renderer/src/utils/smartFillColumns.ts) is being called with `minColumns = 1`, not the `baseColumns` floor used by plain Smart Fill — forcing "at least N columns" while also solving for the exact-fit tile height requires far more width than exists, fails the panel-floor check immediately, and silently falls back to the old waste-tolerant layout. Maximize Space is meant to override that floor entirely, not respect it.

## File Ownership Map

- **Renderer**
  - [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx) — tile rendering, Smart Fill column computation, and Maximize Space panel-width adjustment (`maximizeSpace`/`panelWidth`/`onPanelWidthChange` props)
  - [smartFillColumns.ts](../../../../renderer/src/utils/smartFillColumns.ts) — shared Smart Fill column-fitting algorithm and `computeMaximizeSpaceLayout()` (also used by Card/Poster view, though Card/Poster has no Maximize Space option since it has no resizable details panel)
  - [SortableGameCard.tsx](../../../../renderer/src/components/SortableGameCard.tsx)
  - [App.tsx](../../../../renderer/src/App.tsx) — gridSize, ref, preferences, wires `currentPanelWidth`/`onPanelWidthChange` (shared with the manual drag handle) into `LibraryGrid.tsx` for Maximize Space
  - [GameDetailsPanel.tsx](../../../../renderer/src/components/GameDetailsPanel.tsx) — hides its manual resize divider (`disablePanelResize`) while Maximize Space owns the panel width
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — grid size, `gridSmartFill` (defaults `true`), `gridMaximizeSpace` (Grid/Logo only, defaults `true`), and tile options
