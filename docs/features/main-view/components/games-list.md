# Games List (Main View)

## What This Feature Does

Left panel of the library window that shows the list of games as tiles (grid/list/logo) or full-width carousel/coverflow. Optional categories bar (All Games, Favorites, pinned categories) is confined to this panel; it does not affect the game details panel or extend above both panels.

## User-Facing Surfaces

- **Categories bar** (when "Show Categories" is on): Row of filter buttons at top or bottom of the left panel only. Position (top/bottom), alignment (left/center/right), and size configurable. Expanding or showing categories does not change the right panel’s position or height.
- **Game tiles**: Grid (LibraryGrid), list (LibraryListView), or logo view in grid/list/logo mode; carousel (LibraryCarousel) or coverflow (LibraryCoverFlow) in their modes. See view-type docs for unique features.

## Settings and Toggles

- Show categories in games list (per view mode); categories position (top/bottom) and alignment; categories size. Panel padding: when categories are off or at bottom, the list content has top padding; when categories are at top, the categories row is first then the scrollable list. The right panel gets matching top padding (pt-4) when the left has top padding so the two panels’ content tops align.

## Confirmed End-to-End Flows

1. User enables "Show Categories": categories bar appears inside the left panel only (top or bottom per setting). Game details panel stays full height and aligned; no full-width bar above both panels.
2. User selects a game: selection highlights; game details panel updates. Tops of games list column and game details panel align (with pt-4 on the right when categories off or at bottom).
3. View mode change: grid/list/logo show two panels; carousel/coverflow show full-width list only.

## Discovery and Data Sources

- Games from library state; category and display options from preferences. Filtering by search, sort, launcher, category applied before passing to list components.

## Data Model and Persistence

- Category visibility, position, alignment, size in preferences. List view options and view-mode-specific settings persisted.

## Failure Modes and Triage

### Symptom: Categories affect the game details panel or appear above both panels

- Categories must be rendered only inside the games list container in `App.tsx`. Ensure there is no full-width categories row that is a sibling to both panels; categories row should be a child of the left-panel only.

### Symptom: Game details panel higher or lower than games list when categories off

- When categories are off or categories are at bottom, the left panel content has top padding. The right panel must get pt-4 via `rightPanelNeedsTopPadding` in `App.tsx` so content aligns.

## File Ownership Map

- Renderer
  - `renderer/src/App.tsx` (games list container, categories placement, padding logic)
  - `renderer/src/components/LibraryGrid.tsx`
  - `renderer/src/components/LibraryListView.tsx`
  - `renderer/src/components/LibraryCarousel.tsx`
  - `renderer/src/components/LibraryCoverFlow.tsx`
  - `renderer/src/components/RightClickMenu.tsx` (list/grid options including show categories)
