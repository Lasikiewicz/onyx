# Game Details Panel (Main View)

## What This Feature Does

Right-hand panel in the library window (grid/list/logo modes) that shows the selected game’s artwork, logo, metadata, description, links, and action buttons (Play, Edit, etc.). Hidden in carousel and coverflow modes. Part of the [Main View](../../main-view.md) layout.

## Related Documentation

- [Main View](../../main-view.md) — parent layout; when the panel is shown vs hidden.
- [Settings and preferences](../../settings-and-preferences.md) — how preferences are stored and applied; [UserPreferencesService](../../../../main/UserPreferencesService.ts) is the persistence layer.
- [Links and link management](../../links-and-link-management.md) — link bar in the panel and link display/order.
- [Game launch and process tracking](../../game-launch-and-process-tracking.md) — Play button and launch flow.

## User-Facing Surfaces

- Right panel: hero/banner/boxart background, logo, boxart position/size, metadata (release date, platform, genres, etc.), description (resizable width/height), link bar, Play/Edit/Mod Manager and other actions. Right-click opens context menu. Resizable panel width via left-edge drag. Bottom action bar (Edit, Play, links) is resizable by dragging its top edge; bar height and content scale are persisted.
- The bottom action buttons expose controller targets so Cross from a highlighted game moves focus to Play, Left/Right cycles Favorite/Edit/Mod Manager/Play when present, Cross activates the focused action, and Circle returns focus to game selection.
- The description/details column split remains horizontally resizable, but the divider is visually hidden until hover/drag feedback appears.
- The top-level "Description" and "Details" headings are intentionally omitted so the panel starts directly with game content.
- When the selected game changes, the panel keeps text content stable, buffers the next logo until it is ready instead of swapping immediately, and lets the logo grow into its chosen size on mount. The logo area is centered in the open space between the panel edge and the boxart in [`GameDetailsPanel.tsx`](../../../../renderer/src/components/GameDetailsPanel.tsx).
- The right-click menu now opens in a broader normal full editor layout first, but top tabs can switch it into focused Games View, Dividers, or Game Details modes. Focused modes now use a smaller centered overlay with more breathing room around the underlying shell section, reflow their cards without the earlier stretched gaps, split key controls like category/background and boxart position/size into separate cards, and show short helper descriptions. When the menu is not in a focused section mode, those helper descriptions collapse into compact `?` hints instead. Those `?` hints now open a themed tooltip on hover or click, the top-row Games View / Dividers / Game Details buttons and the Menu Transparency control now use the same button treatment as Flip View and Reset, the default unfocused menu stays wider so the three-column layout does not feel squashed, slider tracks show a visible centered filled line, the slider thumb/logo now sits noticeably larger and lower on that track, and slider cards reserve reset-button space so rows stop resizing when values change.

## Settings and Toggles

- Panel width, fanart height, description width, bottom bar height, logo/boxart size and position, button size and location, details panel transparency, button colors. The right-panel appearance values are stored per view mode, so grid/list/logo can keep separate boxart, logo, text, button, and transparency choices.
- **Where controlled:** Drag resizers on the panel (left edge for width; top edges of banner, description, and bottom bar for heights/width); and the **Dividers** column in the right-click context menu ([RightClickMenuDividersSection.tsx](../../../../renderer/src/components/rightClickMenu/RightClickMenuDividersSection.tsx) inside [RightClickMenu.tsx](../../../../renderer/src/components/RightClickMenu.tsx) — sliders for Right Panel Width, Banner Height, Description Width, Bottom Bar Height). Root callback and persistence wiring now route through [useGameDetailsPanelControls.ts](../../../../renderer/src/hooks/useGameDetailsPanelControls.ts) and persist via [UserPreferencesService](../../../../main/UserPreferencesService.ts); see [Settings and preferences](../../settings-and-preferences.md).

## Confirmed End-to-End Flows

1. User selects a game in the games list: panel shows that game’s details; background and logo update. Selection and game data come from [App.tsx](../../../../renderer/src/App.tsx) state and the game object.
2. User resizes panel (width or any divider): handlers in [GameDetailsPanel.tsx](../../../../renderer/src/components/GameDetailsPanel.tsx) update local state and call `onPanelWidthChange` / `onFanartHeightChange` / `onDescriptionWidthChange` / `onDetailsPanelBottomBarHeightChange`; [App.tsx](../../../../renderer/src/App.tsx) persists via `savePreferences`. Same preferences are applied when changing values from [RightClickMenu](../../../../renderer/src/components/RightClickMenu.tsx).
3. User clicks Play / Edit / etc.: handlers passed from [App.tsx](../../../../renderer/src/App.tsx) run (launch, open Game Manager, etc.). See [Game launch and process tracking](../../game-launch-and-process-tracking.md).
4. Controller action-row flow: [useControllerNavigation.ts](../../../../renderer/src/hooks/useControllerNavigation.ts) focuses the Play button first, cycles only enabled action buttons, and activates them through the same button click handlers used by mouse input.

## Discovery and Data Sources

- **Active game:** From [App.tsx](../../../../renderer/src/App.tsx) (selected game / active game state).
- **Artwork and metadata:** From the [game](../../../../renderer/src/types/game.ts) object (e.g. `heroUrl`, `bannerUrl`, `boxArtUrl`, `logoUrl`, `description`, `links`, metadata fields).
- **Primary background precedence:** The panel prefers `bannerUrl` first, then `heroUrl`, then `boxArtUrl`, so an explicitly chosen banner stays visible after relaunch even when older hero art is still present on the same game record.
- **Description content:** The Description section renders sanitized HTML from `game.description`; for Steam-refreshed games this now normally comes from the Steam Store `about_the_game` field rather than the shorter store blurb.
- **Description sizing:** The description/details row now stretches to the available vertical space in the panel, while the saved description height preference acts as a minimum height rather than a hard cap.
- **Artwork clearance:** Both description and details align below the logo clearance line so large logos cannot overlap the opening content. Left-side boxart now mirrors the right-side overlay position on the left edge while the description reserves matching wrap space beside it, and right-side boxart still pushes the details column down below the hanging artwork instead of squeezing that column narrower.
- **Left boxart wrap height:** When boxart is on the left, the description only reserves a reduced portion of the cover that actually hangs into the content area, and narrower description widths reduce that reserved overlap even further so the text can drop underneath the cover much earlier instead of clinging beside it for too long.
- **Logo clearance cap:** The vertical clearance below the logo follows the logo's effective rendered height after fanart-area caps are applied, so increasing the logo slider past the visible max no longer creates extra blank space underneath.
- **Logo slider guardrail:** The Game Details logo-size slider now caps itself to the current fanart-driven visible maximum, so the control no longer exposes a dead range above the largest renderable logo size for that panel height.
- **Default boxart anchor:** The default right-side boxart sits farther in from the panel edge to avoid feeling pinned to the border while keeping the existing left-side anchor behavior unchanged.
- **Boxart width guardrail:** In the details panel, rendered boxart width is capped to the available space on its side of the split so narrow layouts cannot let the cover spill across the divider and over the description/details columns.
- **Scroll boundary behavior:** Logo/boxart clearance is applied outside the scrollable regions, so the visible top edge of both columns stays locked to the bottom of the overlapping artwork and users cannot scroll upward into empty clearance space.
- **Compact metadata summary:** The details column uses slightly tighter section spacing, and when a game provides multiple developer studio entries the panel shows the primary developer while preserving the full list in the field tooltip.
- **Right-aligned metadata column:** The right-side details column is anchored and text-aligned to the panel's right edge so metadata stays visually tied to that side of the split instead of drifting inward.
- **Scrollbar breathing room:** The metadata scroller keeps a small inset on the right so values do not sit directly against the scrollbar track.
- **Rounded score display:** Community, user, and critic scores display as whole numbers in the metadata column instead of long fractional values.
- **Tighter metadata stacking:** The details column uses reduced spacing between fields and between each label/value pair so the top entries sit closer to the associated content.
- **Release date guardrail:** Invalid or partial release-date strings no longer render `Invalid Date`; the field is hidden unless the value parses cleanly.
- **Install size units:** Installation size now uses the same byte-to-GB conversion as Game Manager, so the details panel no longer overstates install footprints.
- **No-logo title fallback:** Games without a logo use the intended responsive fallback title sizing instead of dropping the computed font-size rule.
- **Description width behavior:** Rich HTML inside the Description section is constrained to the description column width so Steam images, videos, and long text wrap inside the panel instead of overflowing across the layout.
- **Adaptive media layout:** Description content is grouped into section rows (heading/body + nearest media). In wider/taller layouts, each media-bearing section becomes one floated side-by-side row; sections without media stay full-width and left-aligned. When the panel boxart is positioned on the left, extra-wide description areas switch to a mirrored 60/40 text-and-media row with text on the left and screenshots on the right, while narrower description areas fall back sooner so the text can wrap underneath the boxart earlier.
- **Text-aware media sizing:** In side layout, each section’s media width and max-height are auto-sized from nearby text density so short sections use smaller media and long sections can use larger media, reducing large blank areas.
- **Per-section wide wrapping:** When the Description section is wide enough, each image is paired with its nearest paragraph block instead of all images being collected into one rail. If a text block is taller than its image, the remaining text continues full-width underneath that same image; if a section has no image, its text renders as a normal full-width left-aligned block.
- **Aspect-ratio-safe wide media rail:** The wide media rail scales each screenshot to fill the available rail width while keeping its natural aspect ratio, so images can end up at different heights without being cropped or letterboxed down by a shared cap.
- **Panel dimensions and appearance:** Read on load from preferences ([getPreferences](../../../../main/preload.ts) / [UserPreferencesService.getPreferences](../../../../main/UserPreferencesService.ts)); passed into [GameDetailsPanel](../../../../renderer/src/components/GameDetailsPanel.tsx) and [RightClickMenu](../../../../renderer/src/components/RightClickMenu.tsx) via shell-level callback bundles in [useGameDetailsPanelControls.ts](../../../../renderer/src/hooks/useGameDetailsPanelControls.ts) and [useRightClickMenuControls.ts](../../../../renderer/src/hooks/useRightClickMenuControls.ts).
- **Transparency slider semantics:** The right-click menu exposes `Details View Transparency` as a true transparency control where `0%` keeps the panel fully opaque and `100%` removes the panel tint and glass blur so the background artwork shows through as if the right section had no background, while the underlying persisted `detailsPanelOpacity` value is inverted for backward compatibility with existing saved preferences.

## Data Model and Persistence

- Panel-related preferences are stored by [UserPreferencesService](../../../../main/UserPreferencesService.ts). Defaults and keys are defined in [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) (`createDefaultPreferences`, `UserPreferences` interface). Relevant keys include:
  - **Panel width (per view):** `panelWidth`, `panelWidthByView` (grid/list/logo)
  - **Banner / description / bottom bar:** `fanartHeight`, `fanartHeightByView`, `descriptionHeight`, `descriptionWidthByView`, `detailsPanelBottomBarHeight`
- **Right panel appearance:** `rightPanelLogoSizeByView`, `rightPanelBoxartPositionByView`, `rightPanelBoxartSizeByView`, `rightPanelTextSizeByView`, `rightPanelButtonSizeByView`, `rightPanelButtonLocationByView`, `detailsPanelOpacityByView`, `rightPanelButtonColors`, etc.
- **Where read:** [App.tsx](../../../../renderer/src/App.tsx) loads preferences on mount and passes them into [GameDetailsPanel](../../../../renderer/src/components/GameDetailsPanel.tsx); [GameDetailsPanel](../../../../renderer/src/components/GameDetailsPanel.tsx) also loads/saves some keys locally when not overridden by App.
- **Where written:** Resize and menu changes flow through [App.tsx](../../../../renderer/src/App.tsx) or [GameDetailsPanel.tsx](../../../../renderer/src/components/GameDetailsPanel.tsx) and call `savePreferences` (exposed via [preload](../../../../main/preload.ts) / [appHandlers](../../../../main/ipc/appHandlers.ts)).

## Failure Modes and Triage

### Symptom: Panel not visible in grid/list/logo

- Ensure view mode is grid, list, or logo and that `filteredGames.length > 0` and not in onboarding. Panel is conditionally hidden for carousel/coverflow. Check layout and visibility in [App.tsx](../../../../renderer/src/App.tsx) where `GameDetailsPanel` is rendered.

### Symptom: Panel width or content not persisting

- Check that resize handlers in [GameDetailsPanel.tsx](../../../../renderer/src/components/GameDetailsPanel.tsx) call `onPanelWidthChange` / `onFanartHeightChange` / `onDescriptionWidthChange` / `onDetailsPanelBottomBarHeightChange` and that [App.tsx](../../../../renderer/src/App.tsx) (or the panel’s own save effect) calls `savePreferences`; confirm preferences are loaded on mount and passed as props.

## File Ownership Map

- **Renderer**
  - [GameDetailsPanel.tsx](../../../../renderer/src/components/GameDetailsPanel.tsx) — panel UI, resize handles, banner/description/bottom bar, links, action buttons.
  - [App.tsx](../../../../renderer/src/App.tsx) — props, layout wrapper, and shell composition for the panel.
  - [useControllerNavigation.ts](../../../../renderer/src/hooks/useControllerNavigation.ts) — controller entry into and navigation across the bottom action row.
  - [useGameDetailsPanelControls.ts](../../../../renderer/src/hooks/useGameDetailsPanelControls.ts) — root panel callback bundle, right-panel actions, and divider persistence wiring.
  - [RightClickMenuDividersSection.tsx](../../../../renderer/src/components/rightClickMenu/RightClickMenuDividersSection.tsx) — Dividers column sliders (panel width, fanart height, description width, bottom bar height) for grid/list/logo.
  - [GameLinks.tsx](../../../../renderer/src/components/GameLinks.tsx) — link bar in the panel (see [Links and link management](../../links-and-link-management.md)).
- **Main**
  - [UserPreferencesService.ts](../../../../main/UserPreferencesService.ts) — persistence for panel and divider preferences; defaults and merge logic.
  - [preload.ts](../../../../main/preload.ts) — exposes `getPreferences` / `savePreferences` to the renderer.
  - [ipc/appHandlers.ts](../../../../main/ipc/appHandlers.ts) — preferences get/save IPC.
