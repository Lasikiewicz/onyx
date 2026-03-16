# Games List (Main View)

## What This Feature Does

Left panel of the library window that shows the list of games as tiles (grid/list/logo) or full-width carousel/coverflow. Optional categories bar (All Games, Favorites, pinned categories) is confined to this panel; it does not affect the game details panel or extend above both panels. Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — layout and two-panel vs full-width modes.
- [Game Details Panel](./game-details-panel.md) — right panel; alignment with games list.
- [Grid View](../views/grid-view.md), [List View](../views/list-view.md), [Logo View](../views/logo-view.md), [Carousel View](../views/carousel-view.md), [Coverflow View](../views/coverflow-view.md) — view-type implementations.
- [Settings and preferences](../../settings-and-preferences.md) — categories and list options persistence.

## User-Facing Surfaces

- **Categories bar** (when "Show Categories" is on): Row of filter buttons at top or bottom of the left panel only. Position (top/bottom), alignment (left/center/right), and size configurable. Expanding or showing categories does not change the right panel’s position or height.
- **Game tiles**: Grid (LibraryGrid), list (LibraryListView), or logo view in grid/list/logo mode; carousel (LibraryCarousel) or coverflow (LibraryCoverFlow) in their modes. See view-type docs for unique features.

## Settings and Toggles

- Show categories in games list (per view mode); categories position (top/bottom) and alignment; categories size. Panel padding: when categories are off or at bottom, the list content has top padding; when categories are at top, the categories row is first then the scrollable list. The right panel gets matching top padding (pt-4) when the left has top padding so the two panels’ content tops align. Configured via [RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx) and [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Confirmed End-to-End Flows

1. User enables "Show Categories": categories bar appears inside the left panel only (top or bottom per setting). Game details panel stays full height and aligned; no full-width bar above both panels.
2. User selects a game: selection highlights; game details panel updates. Tops of games list column and game details panel align (with pt-4 on the right when categories off or at bottom).
3. View mode change: grid/list/logo show two panels; carousel/coverflow show full-width list only.

## Discovery and Data Sources

- Games from library state ([App.tsx](../../../../renderer/src/App.tsx)); category and display options from [UserPreferencesService](../../../../main/UserPreferencesService.ts). Filtering by search, sort, launcher, category applied before passing to list components.

## Data Model and Persistence

- Category visibility, position, alignment, size in preferences ([UserPreferencesService](../../../../main/UserPreferencesService.ts)). List view options and view-mode-specific settings persisted. See [Settings and preferences](../../settings-and-preferences.md).

## Failure Modes and Triage

### Symptom: Categories affect the game details panel or appear above both panels

- Categories must be rendered only inside the games list container in [App.tsx](../../../../renderer/src/App.tsx). Ensure there is no full-width categories row that is a sibling to both panels; categories row should be a child of the left-panel only.

### Symptom: Game details panel higher or lower than games list when categories off

- When categories are off or categories are at bottom, the left panel content has top padding. The right panel must get pt-4 via `rightPanelNeedsTopPadding` in [App.tsx](../../../../renderer/src/App.tsx) so content aligns.

### Symptom: Right-click menu appears cramped near the screen edge

- The library right-click settings menu anchors by screen half: left half opens to the right of the cursor, right half opens to the left, then clamps to viewport bounds with a 10px margin in [RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx).

## File Ownership Map

- **Renderer**
  - [App.tsx](../../../../renderer/src/App.tsx) — games list container, categories placement, padding logic
  - [LibraryGrid.tsx](../../../../renderer/src/components/LibraryGrid.tsx)
  - [LibraryListView.tsx](../../../../renderer/src/components/LibraryListView.tsx)
  - [LibraryCarousel.tsx](../../../../renderer/src/components/LibraryCarousel.tsx)
  - [LibraryCoverFlow.tsx](../../../../renderer/src/components/LibraryCoverFlow.tsx)
  - [RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx) — list/grid options including show categories
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — categories and list preferences
