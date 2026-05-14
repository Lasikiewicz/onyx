# Main View (Library Window)

## What This Feature Does

Defines the primary library window layout after launch: menu bar, main content area (games list left, game details right or full-width for carousel/coverflow), and how layout and alignment work.

## Related Documentation

- [Settings and preferences](./settings-and-preferences.md) — persistence for view mode, panel width, category options.
- [Game launch and process tracking](./game-launch-and-process-tracking.md) — Play from tiles and game details.

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
- **Controller navigation:** In grid/list/logo modes, a detected DualSense can move the active game selection, jump into the details action row, open game or view context menus, open the Onyx menu, and focus top controls such as Search. The input mapper supports standard buttons, analog button values, and common non-standard D-pad/hat axes used by some USB, Bluetooth, and Steam Input paths.

Layout: When view mode is grid/list/logo, the games list and game details panel are siblings; the top of the games list column and the top of the game details panel align. When "Show Categories" is off or categories are at bottom, the right panel gets top padding (pt-4) so its content aligns with the left panel's padded content. Categories are confined to the games list and do not affect the game details panel.

## Settings and Toggles

- View mode (grid / list / logo / carousel / coverflow) and panel width per view.
- Top bar and category positions (see settings runbooks and [Games List](./main-view/components/games-list.md)).
- Flipped view (right panel on left) per view mode.
- Gamepad preferences (`enableGamepadSupport`, `gamepadNavigationSpeed`, `gamepadButtonLayout`) are loaded from [UserPreferencesService](../../main/UserPreferencesService.ts) and applied by the app-shell controller navigation hook.

## Confirmed End-to-End Flows

1. App loads; renderer mounts main view with menu bar and content area.
2. Content area shows games list (left) and game details (right) when view mode is grid/list/logo; categories live only in the games list.
3. Carousel/coverflow use full width; game details panel is hidden.
4. Preferences (view mode, panel width, flipped layout) persist and restore on next launch.
5. Controller navigation in grid/list/logo uses the visible filtered game list as its source of truth: D-pad/stick movement changes `activeGameId`, Cross enters the details action row, Square opens the selected game context menu, Circle opens Games View controls, Options opens the Onyx menu, and Share focuses Search.

## Discovery and Data Sources

- Games from [GameStore](../../main/GameStore.ts); selection and view state in [App.tsx](../../renderer/src/App.tsx).
- Preferences from [UserPreferencesService](../../main/UserPreferencesService.ts) for layout and display options.
- Root MenuBar and TopBar shell actions are assembled in [useMainViewShellControls.ts](../../renderer/src/hooks/useMainViewShellControls.ts) so main-view entry points share one callback bundle before reaching [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) and [TopBar.tsx](../../renderer/src/components/TopBar.tsx).
- Root right-click settings actions are assembled in [useRightClickMenuControls.ts](../../renderer/src/hooks/useRightClickMenuControls.ts) so per-view display and divider writes share one callback bundle before reaching [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx).
- [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx) now opens Game Details and Carousel button-color controls through a compact popup picker with neutral shell styling, full button labels, and click-away dismissal so view-configuration controls stay easier to scan and do not force the main menu off-screen.
- [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx) also exposes a compact `Fill Available Space` toggle for grid view, and [App.tsx](../../renderer/src/App.tsx) responds by recalculating grid card width against the live left-panel space so the layout can shrink to fit visible rows or grow to reduce right-side gaps as the details panel grows or shrinks.
- Root game-details-panel actions are assembled in [useGameDetailsPanelControls.ts](../../renderer/src/hooks/useGameDetailsPanelControls.ts) so right-panel actions and divider writes share one callback bundle before reaching [GameDetailsPanel.tsx](../../renderer/src/components/GameDetailsPanel.tsx).
- Controller polling and focus routing are owned by [useControllerNavigation.ts](../../renderer/src/hooks/useControllerNavigation.ts), which uses the browser Gamepad API and stable `data-controller-*` attributes on library cards, details action buttons, top controls, and the Onyx menu trigger. The hook reports connect/disconnect and first decoded input status through the app toast system and stores its latest sampled device state on `window.__onyxControllerDebug` for local troubleshooting.

## Data Model and Persistence

- No dedicated main-view persistence; uses game library and preferences (panel width, view mode, category/list options). Stored via [UserPreferencesService](../../main/UserPreferencesService.ts); see [Settings and preferences](./settings-and-preferences.md).

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
  - [useControllerNavigation.ts](../../renderer/src/hooks/useControllerNavigation.ts) - gamepad polling, repeat throttling, and controller focus routing for grid/list/logo library control
  - [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx)
  - [TopBar.tsx](../../renderer/src/components/TopBar.tsx)
  - [GameDetailsPanel.tsx](../../renderer/src/components/GameDetailsPanel.tsx)
  - [LibraryGrid.tsx](../../renderer/src/components/LibraryGrid.tsx)
  - [LibraryListView.tsx](../../renderer/src/components/LibraryListView.tsx)
  - [LibraryCarousel.tsx](../../renderer/src/components/LibraryCarousel.tsx)
  - [LibraryCoverFlow.tsx](../../renderer/src/components/LibraryCoverFlow.tsx)
