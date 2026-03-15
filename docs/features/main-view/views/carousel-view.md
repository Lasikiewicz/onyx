# Carousel View (Main View)

## What This Feature Does

Displays the games list as a horizontal carousel of cover art with a selected (center) game. Full-width layout; no separate game details panel. Optional details bar (title, logo, description), configurable box art size, logo size, button and description alignment, and button colors. Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — layout; carousel/coverflow hide the right panel.
- [Games List](../components/games-list.md) — carousel is one way the games list is rendered.
- [Settings and preferences](../../settings-and-preferences.md) — carousel options persistence.

## User-Facing Surfaces

- Full-width area: horizontal strip of game covers; center item is selected. Optional details bar below or integrated with alignment options (left/center/right for logo, description, buttons). Play, Edit, and other actions on the selected game. Right-click for context menu and carousel settings.

## Settings and Toggles

- Selected box art size, game tile padding, show carousel details bar, show carousel logos, details bar size, carousel logo size, carousel button size, carousel description size; description/button/logo alignment (left/center/right). Button colors (play, edit, mod manager). Configured via [RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx) and [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Confirmed End-to-End Flows

1. User scrolls or clicks a cover: selected index updates in [LibraryCarousel.tsx](../../../../renderer/src/components/LibraryCarousel.tsx); details bar and actions reflect selected game.
2. User resizes details bar or logo: size persisted via [App.tsx](../../../../renderer/src/App.tsx) and preferences.
3. User changes alignment: details bar content reflows; preference saved.

## Discovery and Data Sources

- Games list from [App.tsx](../../../../renderer/src/App.tsx) (filtered). Carousel-specific preferences from [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Data Model and Persistence

- Carousel sizes, alignment, and button colors persisted in [UserPreferencesService](../../../../main/UserPreferencesService.ts). No separate right panel; selection state in component/renderer.

## Failure Modes and Triage

### Symptom: Carousel not scrolling or selection stuck

- Check selectedIndex state and scroll/click handlers in [LibraryCarousel.tsx](../../../../renderer/src/components/LibraryCarousel.tsx); activeGameId sync from [App.tsx](../../../../renderer/src/App.tsx).

### Symptom: Details bar missing or wrong size

- Verify showCarouselDetails, detailsBarSize, onDetailsBarSizeChange; portal or layout for details bar in [LibraryCarousel.tsx](../../../../renderer/src/components/LibraryCarousel.tsx).

## File Ownership Map

- **Renderer**
  - [LibraryCarousel.tsx](../../../../renderer/src/components/LibraryCarousel.tsx)
  - [App.tsx](../../../../renderer/src/App.tsx) — carousel props, preferences, no right panel in this mode
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — carousel options
