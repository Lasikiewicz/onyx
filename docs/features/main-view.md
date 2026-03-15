# Main View (Library Window)

## What This Feature Does

Defines the primary library window layout after launch: menu bar, main content area (games list left, game details right or full-width for carousel/coverflow), and how layout and alignment work.

## User-Facing Surfaces

- **Menu bar** (fixed top): app menu, search, sort, launcher/category filters. See [Menu Bar](./main-view/components/menu-bar.md).
- **Games list** (left panel): categories bar (when shown) and scrollable game tiles. See [Games List](./main-view/components/games-list.md).
- **Game details panel** (right panel): selected game artwork, metadata, actions. See [Game Details Panel](./main-view/components/game-details-panel.md). Hidden in carousel/coverflow.
- **View types**, each with unique features:
  - [Grid View](./main-view/views/grid-view.md)
  - [List View](./main-view/views/list-view.md)
  - [Logo View](./main-view/views/logo-view.md)
  - [Carousel View](./main-view/views/carousel-view.md)
  - [Coverflow View](./main-view/views/coverflow-view.md)

Layout: When view mode is grid/list/logo, the games list and game details panel are siblings; the top of the games list column and the top of the game details panel align. When "Show Categories" is off or categories are at bottom, the right panel gets top padding (pt-4) so its content aligns with the left panel's padded content. Categories are confined to the games list and do not affect the game details panel.

## Settings and Toggles

- View mode (grid / list / logo / carousel / coverflow) and panel width per view.
- Top bar and category positions (see settings runbooks and [Games List](./main-view/components/games-list.md)).
- Flipped view (right panel on left) per view mode.

## Confirmed End-to-End Flows

1. App loads; renderer mounts main view with menu bar and content area.
2. Content area shows games list (left) and game details (right) when view mode is grid/list/logo; categories live only in the games list.
3. Carousel/coverflow use full width; game details panel is hidden.
4. Preferences (view mode, panel width, flipped layout) persist and restore on next launch.

## Discovery and Data Sources

- Games from GameStore; selection and view state in renderer.
- Preferences from UserPreferencesService for layout and display options.

## Data Model and Persistence

- No dedicated main-view persistence; uses game library and preferences (panel width, view mode, category/list options).

## Failure Modes and Triage

### Symptom: Layout is single column or panels overlap

- Confirm view mode is not carousel/coverflow if two panels are expected.
- Check flex/overflow classes in `App.tsx` main content area and that no CSS overrides collapse the layout.

### Symptom: Categories appear in the wrong place or affect game details

- Categories are implemented only inside the games list (left panel). See [Games List](./main-view/components/games-list.md). Verify categories row is not rendered above both panels or in the right-panel tree.

### Symptom: Game details panel higher or lower than games list

- When categories are off or at bottom, the right panel must have pt-4 so content aligns. See `rightPanelNeedsTopPadding` in `App.tsx`.

## File Ownership Map

- Renderer
  - `renderer/src/App.tsx` (main layout, panel structure, categories placement, alignment)
  - `renderer/src/components/MenuBar.tsx`
  - `renderer/src/components/GameDetailsPanel.tsx`
  - `renderer/src/components/LibraryGrid.tsx`
  - `renderer/src/components/LibraryListView.tsx`
  - `renderer/src/components/LibraryCarousel.tsx`
  - `renderer/src/components/LibraryCoverFlow.tsx`
