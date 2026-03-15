# Game Details Panel (Main View)

## What This Feature Does

Right-hand panel in the library window (grid/list/logo modes) that shows the selected game’s artwork, logo, metadata, description, links, and action buttons (Play, Edit, etc.). Hidden in carousel and coverflow modes.

## User-Facing Surfaces

- Right panel: hero/banner/boxart background, logo, boxart position/size, metadata (release date, platform, genres, etc.), description (resizable width/height), link bar, Play/Edit/Mod Manager and other actions. Right-click opens context menu. Resizable panel width via left-edge drag.

## Settings and Toggles

- Panel width, fanart height, description width, logo/boxart size and position, button size and location, details panel opacity, button colors (per view mode where applicable). Controlled via RightClickMenu and preferences.

## Confirmed End-to-End Flows

1. User selects a game in the games list: panel shows that game’s details; background and logo update.
2. User resizes panel: width persisted per view mode.
3. User clicks Play / Edit / etc.: corresponding handler in App runs (launch, open Game Manager, etc.).

## Discovery and Data Sources

- Active game from App state. Artwork and metadata from game object. Preferences for panel dimensions and appearance.

## Data Model and Persistence

- Panel width, fanart height, description width, and related preferences stored via UserPreferencesService.

## Failure Modes and Triage

### Symptom: Panel not visible in grid/list/logo

- Ensure view mode is grid, list, or logo and that `filteredGames.length > 0` and not in onboarding. Panel is conditionally hidden for carousel/coverflow.

### Symptom: Panel width or content not persisting

- Check that resize handler calls `onPanelWidthChange` and preferences are saved; that preferences are loaded on mount and passed as props.

## File Ownership Map

- Renderer
  - `renderer/src/components/GameDetailsPanel.tsx`
  - `renderer/src/App.tsx` (props, layout wrapper)
