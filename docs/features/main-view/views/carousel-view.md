# Carousel View (Main View)

## What This Feature Does

Displays the games list as a horizontal carousel of cover art with a selected (center) game. Full-width layout; no separate game details panel. Optional details bar (title, logo, description), configurable box art size, logo size, button and description alignment, and button colors.

## User-Facing Surfaces

- Full-width area: horizontal strip of game covers; center item is selected. Optional details bar below or integrated with alignment options (left/center/right for logo, description, buttons). Play, Edit, and other actions on the selected game. Right-click for context menu and carousel settings.

## Settings and Toggles

- Selected box art size, game tile padding, show carousel details bar, show carousel logos, details bar size, carousel logo size, carousel button size, carousel description size; description/button/logo alignment (left/center/right). Button colors (play, edit, mod manager). Configured via RightClickMenu and preferences.

## Confirmed End-to-End Flows

1. User scrolls or clicks a cover: selected index updates; details bar and actions reflect selected game.
2. User resizes details bar or logo: size persisted; carousel re-renders.
3. User changes alignment: details bar content reflows; preference saved.

## Discovery and Data Sources

- Games list from App (filtered). Carousel-specific preferences (sizes, alignment, colors) from UserPreferencesService.

## Data Model and Persistence

- Carousel sizes, alignment, and button colors persisted per preferences. No separate right panel; selection state in component/renderer.

## Failure Modes and Triage

### Symptom: Carousel not scrolling or selection stuck

- Check selectedIndex state and scroll/click handlers in LibraryCarousel; activeGameId sync from App.

### Symptom: Details bar missing or wrong size

- Verify showCarouselDetails, detailsBarSize, onDetailsBarSizeChange; portal or layout for details bar.

## File Ownership Map

- Renderer
  - `renderer/src/components/LibraryCarousel.tsx`
  - `renderer/src/App.tsx` (carousel props, preferences, no right panel in this mode)
