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

## File Ownership Map

- **Renderer**
  - [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx) — tile rendering and Smart Fill column computation
  - [smartFillColumns.ts](../../../../renderer/src/utils/smartFillColumns.ts) — shared Smart Fill column-fitting algorithm (also used by Card/Poster view)
  - [SortableGameCard.tsx](../../../../renderer/src/components/SortableGameCard.tsx)
  - [App.tsx](../../../../renderer/src/App.tsx) — gridSize, ref, preferences
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — grid size, `gridSmartFill`, and tile options
