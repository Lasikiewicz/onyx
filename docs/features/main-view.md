# Main View (Library Window)

## What This Feature Does

Defines the primary library window layout after launch: menu bar, main content area (games list left, game details right or full-width for carousel/coverflow), and how layout and alignment work.

## Related Documentation

- [Settings and preferences](./settings-and-preferences.md) — persistence for view mode, panel width, category options.
- [Game launch and process tracking](./game-launch-and-process-tracking.md) — Play from tiles and game details.

## User-Facing Surfaces

- **Menu bar** (fixed top): Onyx menu, search, sort, launcher/category filters, pinned category buttons, and right-click layout controls. See [Menu Bar](./main-view/components/menu-bar.md).
- **Games list** (left panel): categories bar (when shown) and scrollable game tiles. See [Games List](./main-view/components/games-list.md).
- **Game details panel** (right panel): selected game artwork, metadata, actions. See [Game Details Panel](./main-view/components/game-details-panel.md). Hidden in carousel/coverflow.
- **View types**, each with unique features:
  - [Grid View](./main-view/views/grid-view.md)
  - [List View](./main-view/views/list-view.md)
  - [Logo View](./main-view/views/logo-view.md)
  - [Carousel View](./main-view/views/carousel-view.md)
  - [Coverflow View](./main-view/views/coverflow-view.md)
- **Controller navigation:** The controller navigation surface is currently marked coming soon. The mapper and preferences remain in place, but the app shell keeps gamepad polling disabled while input support is finalized.

Layout: When view mode is grid/list/logo, the games list and game details panel are siblings; the top of the games list column and the top of the game details panel align. When "Show Categories" is off or categories are at bottom, the right panel gets top padding (pt-4) so its content aligns with the left panel's padded content. Categories are confined to the games list and do not affect the game details panel.

## Settings and Toggles

- View mode (grid / list / logo / carousel / coverflow) and panel width per view.
- Top bar positions and visibility for search, sort, launcher, category menu, and pinned category buttons (see settings runbooks and [Menu Bar](./main-view/components/menu-bar.md)).
- Games-list category row positions (see [Games List](./main-view/components/games-list.md)).
- Flipped view (right panel on left) per view mode.
- Gamepad preferences (`enableGamepadSupport`, `gamepadNavigationSpeed`, `gamepadButtonLayout`) are loaded from [UserPreferencesService](../../main/UserPreferencesService.ts), but controller navigation is currently disabled and marked coming soon.

## Confirmed End-to-End Flows

1. App loads; renderer mounts main view with menu bar and content area.
2. Content area shows games list (left) and game details (right) when view mode is grid/list/logo; categories live only in the games list.
3. Carousel/coverflow use full width; game details panel is hidden.
4. Preferences (view mode, panel width, flipped layout) persist and restore on next launch.
5. Top-bar layout changes from the right-click layout menu persist and restore on next launch, including hidden controls and pinned category placement.
6. Controller navigation is currently gated off in [App.tsx](../../renderer/src/App.tsx); the existing hook and preferences remain ready for future re-enablement.

## Discovery and Data Sources

- Games from [GameStore](../../main/GameStore.ts); selection and view state in [App.tsx](../../renderer/src/App.tsx).
- Preferences from [UserPreferencesService](../../main/UserPreferencesService.ts) for layout and display options.
- Root MenuBar and TopBar shell actions are assembled in [useMainViewShellControls.ts](../../renderer/src/hooks/useMainViewShellControls.ts) so main-view entry points share one callback bundle before reaching [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) and [TopBar.tsx](../../renderer/src/components/TopBar.tsx).
- [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) owns fixed top-bar rendering, right-click capture across the bar, and handoff to [TopBarContextMenu.tsx](../../renderer/src/components/TopBarContextMenu.tsx) for move/hide controls.
- Root right-click settings actions are assembled in [useRightClickMenuControls.ts](../../renderer/src/hooks/useRightClickMenuControls.ts) so per-view display and divider writes share one callback bundle before reaching [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx).
- [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx) now opens Game Details and Carousel button-color controls through a compact popup picker with neutral shell styling, full button labels, and click-away dismissal so view-configuration controls stay easier to scan and do not force the main menu off-screen.
- [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx) also exposes a compact `Fill Available Space` toggle for grid view, and [App.tsx](../../renderer/src/App.tsx) responds by recalculating grid card width against the live left-panel space so the layout can shrink to fit visible rows or grow to reduce right-side gaps as the details panel grows or shrinks.
- Root game-details-panel actions are assembled in [useGameDetailsPanelControls.ts](../../renderer/src/hooks/useGameDetailsPanelControls.ts) so right-panel actions and divider writes share one callback bundle before reaching [GameDetailsPanel.tsx](../../renderer/src/components/GameDetailsPanel.tsx).
- Controller polling and focus routing are owned by [useControllerNavigation.ts](../../renderer/src/hooks/useControllerNavigation.ts), but [App.tsx](../../renderer/src/App.tsx) currently disables the bridge while the General settings controller controls are marked coming soon.

## Data Model and Persistence

- No dedicated main-view persistence; uses game library and preferences (panel width, view mode, category/list options). Stored via [UserPreferencesService](../../main/UserPreferencesService.ts); see [Settings and preferences](./settings-and-preferences.md).
- Top-bar layout persistence uses the shared `topBarPositions` preference and is applied by [App.tsx](../../renderer/src/App.tsx) before rendering [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx).

## Failure Modes and Triage

### Symptom: Layout is single column or panels overlap

- Confirm view mode is not carousel/coverflow if two panels are expected.
- Check flex/overflow classes in [App.tsx](../../renderer/src/App.tsx) main content area and that no CSS overrides collapse the layout.

### Symptom: Categories appear in the wrong place or affect game details

- Categories are implemented only inside the games list (left panel). See [Games List](./main-view/components/games-list.md). Verify categories row is not rendered above both panels or in the right-panel tree.

### Symptom: Game details panel higher or lower than games list

- When categories are off or at bottom, the right panel must have pt-4 so content aligns. See `rightPanelNeedsTopPadding` in [App.tsx](../../renderer/src/App.tsx).

## File Ownership Map

- **Renderer**
  - [App.tsx](../../renderer/src/App.tsx) — main layout, panel structure, categories placement, alignment
  - [useMainViewShellControls.ts](../../renderer/src/hooks/useMainViewShellControls.ts) - MenuBar and TopBar shell action wiring for refresh, import, settings, tutorial, updater preview, and view/search updates
  - [useRightClickMenuControls.ts](../../renderer/src/hooks/useRightClickMenuControls.ts) - right-click settings menu action wiring for active-game updates and preference-backed main-view controls
  - [useGameDetailsPanelControls.ts](../../renderer/src/hooks/useGameDetailsPanelControls.ts) - game-details-panel action wiring for right-panel actions and divider persistence
  - [useControllerNavigation.ts](../../renderer/src/hooks/useControllerNavigation.ts) - gamepad polling, repeat throttling, and controller focus routing for grid/list/logo library control, currently gated off while marked coming soon
  - [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx)
  - [TopBarContextMenu.tsx](../../renderer/src/components/TopBarContextMenu.tsx)
  - [TopBar.tsx](../../renderer/src/components/TopBar.tsx)
  - [GameDetailsPanel.tsx](../../renderer/src/components/GameDetailsPanel.tsx)
  - [LibraryGrid.tsx](../../renderer/src/components/LibraryGrid.tsx)
  - [LibraryListView.tsx](../../renderer/src/components/LibraryListView.tsx)
  - [LibraryCarousel.tsx](../../renderer/src/components/LibraryCarousel.tsx)
  - [LibraryCoverFlow.tsx](../../renderer/src/components/LibraryCoverFlow.tsx)
