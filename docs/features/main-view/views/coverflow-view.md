# Coverflow View (Main View)

## What This Feature Does

Displays the games list as a 3D cover-flow strip: covers are arranged in depth with perspective, reflection, and scaling. Center cover is selected and largest; side covers recede and scale down. Full-width layout; no separate game details panel. Configurable cover size, reflection strength, vertical offset, side opacity, and button position/colors. Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — layout; carousel/coverflow hide the right panel.
- [Games List](../components/games-list.md) — coverflow is one way the games list is rendered.
- [Settings and preferences](../../settings-and-preferences.md) — coverflow options persistence.

## User-Facing Surfaces

- Full-width area: 3D stack of game covers with reflection; center item is selected. Play/Edit and other actions on the selected game. Optional buttons (left/middle/right). Right-click for context menu and coverflow settings. Drag or click to scroll through games.

## Settings and Toggles

- Cover size (center cover width), reflection strength, vertical offset, show buttons, button position (left/middle/right), button colors, side opacity (dimming of non-center covers). Configured via [RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx) and [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Confirmed End-to-End Flows

1. User drags or clicks to scroll: selected index updates with smooth scroll animation in [LibraryCoverFlow.tsx](../../../../renderer/src/components/LibraryCoverFlow.tsx); center cover and actions update.
2. User adjusts cover size or reflection: layout and reflection effect update; preferences saved.
3. User changes side opacity: non-center covers dim or brighten; preference saved.

## Discovery and Data Sources

- Games list from [App.tsx](../../../../renderer/src/App.tsx) (filtered). Coverflow-specific preferences (coverSize, reflectionStrength, verticalOffset, sideOpacity, button options) from [UserPreferencesService](../../../../main/UserPreferencesService.ts).

## Data Model and Persistence

- Coverflow options persisted in [UserPreferencesService](../../../../main/UserPreferencesService.ts). No separate right panel; selection state in component.

## Failure Modes and Triage

### Symptom: Covers not scrolling or selection wrong

- Check selectedIndex, scrollOffset, and drag/click handlers in [LibraryCoverFlow.tsx](../../../../renderer/src/components/LibraryCoverFlow.tsx); sync with activeGameId from [App.tsx](../../../../renderer/src/App.tsx) when provided.

### Symptom: Reflection or perspective broken

- Verify CSS transform and reflection styles; constants (REFLECTION_HEIGHT_RATIO, PERSPECTIVE, etc.) in [LibraryCoverFlow.tsx](../../../../renderer/src/components/LibraryCoverFlow.tsx).

## File Ownership Map

- **Renderer**
  - [LibraryCoverFlow.tsx](../../../../renderer/src/components/LibraryCoverFlow.tsx)
  - [App.tsx](../../../../renderer/src/App.tsx) — coverflow props, preferences, no right panel in this mode
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — coverflow options
