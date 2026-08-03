# App Shell

## What This Feature Does

Owns the renderer root experience in [`App.tsx`](../../renderer/src/App.tsx): library-window composition, shell-level overlays, startup/update/crash handoffs, and the modal entry points that sit above individual feature surfaces.

## Related Documentation

- [Main View (Library Window)](./main-view.md)
- [Library Import and Startup Scan](./library-import-and-startup-scan.md)
- [Updater and Release Install](./updater.md)
- [Settings and Preferences Overview](./settings-and-preferences.md)
- [Crash Detection and Bug Reporting](./crash-detection-and-bug-reporting.md)
- [Add Games](./add-games.md)

## User-Facing Surfaces

- The root window shell in [`App.tsx`](../../renderer/src/App.tsx), which mounts the menu bar, current library view, details panel, and modal stack.
- The shell overlay compositor in [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx), which renders startup scan progress, found-games review, update prompts, crash dump prompts, tutorial handoff, toast feedback, and missing-games cleanup.
- The startup scan progress/review overlay in [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx), which shows startup scan progress and hands newly found games into the importer review flow.
- The shell event bridge in [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts), which owns root menu-event, startup-scan, updater, and crash-dump listener wiring.
- The shell preference bridge in [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts), which owns initial preference load, baseline defaults, and refresh.
- [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) must treat initial preference bootstrap as a one-time startup action; normal in-session shell changes such as switching library view must not trigger a fresh preference load from disk. Per-resolution baseline defaults (`applyBaselineDefaults`) only apply automatically on first launch (`prefs.isFirstLaunch`); there is deliberately no `window resize`-driven reapplication, since a multi-monitor user dragging the window between displays of different native resolution (e.g. a 1080p and a 1440p monitor) would otherwise have live settings like `gridSmartFill`/`cardSmartFill` silently overwritten by that resolution's baseline preset every time the window crosses monitors. Resolution-tuned defaults are still available on demand through the explicit "Reset" flow in `RightClickMenu.tsx` (`applyDefaultsForView`) and the Custom Defaults Manager, which are user-initiated rather than a side effect of moving the window.
- The shell preference-persistence bridge in [`useAppShellPreferencePersistence.ts`](../../renderer/src/hooks/useAppShellPreferencePersistence.ts), which owns debounced renderer-side preference writes for core shell layout/display state and validates restored active-game selection against the current library.
- The shell selection bridge in [`useAppShellSelection.ts`](../../renderer/src/hooks/useAppShellSelection.ts), which waits for initial preferences before falling back to the first visible game and writes clicked game selections through `activeGameId` so relaunching restores the last selected library entry.
- The top bar in [`MenuBar.tsx`](../../renderer/src/components/MenuBar.tsx) and layout menu in [`TopBarContextMenu.tsx`](../../renderer/src/components/TopBarContextMenu.tsx), which expose right-click layout controls for search, sort, launcher, category menu, and pinned category buttons across left, middle, right, and hidden states.
- The shell animated-media policy bridge in [`useAnimatedMediaPolicy.ts`](../../renderer/src/hooks/useAnimatedMediaPolicy.ts), which strips animated image formats during overlays or disabled animation categories and enforces shell-wide video pause/resume behavior.
- The shell modal-state bridge in [`useAppShellModals.ts`](../../renderer/src/hooks/useAppShellModals.ts), which centralizes shell modal open/close state and tab/game targeting for settings, Game Manager, onboarding, and adjacent modal entry points.
- The shell system-state bridge in [`useAppShellSystemState.ts`](../../renderer/src/hooks/useAppShellSystemState.ts), which centralizes updater/changelog state, dev update-preview helpers, background-scan pause while update prompts are open, and crash-dump prompt actions.
- The update preview renderer in [`UpdateNotificationModal.tsx`](../../renderer/src/components/UpdateNotificationModal.tsx), which now preserves grouped changelog bullets and nested child items and renders them directly per version so local/update previews reflect the current `CHANGELOG.md` structure instead of flattening it or re-labeling entries as guessed feature/fix buckets.
- Dev-only update previews now ask [`app:getChangelog`](../../main/ipc/appHandlers.ts) to prefer the local workspace [`CHANGELOG.md`](../../CHANGELOG.md) before GitHub, so `Open Update Found` and other local test-mode flows reflect unpushed changelog edits while normal live update checks still use the remote-first changelog path.
- The settings-save refresh bridge in [`useSettingsSaveRefresh.ts`](../../renderer/src/hooks/useSettingsSaveRefresh.ts), which reloads shell-facing preferences after settings saves so runtime consumers update immediately without duplicating readback code in [`App.tsx`](../../renderer/src/App.tsx).
- The shell preference-writer bridge in [`usePreferenceWriter.ts`](../../renderer/src/hooks/usePreferenceWriter.ts), which centralizes direct renderer-side preference writes for root control surfaces such as the right-click menu.
- The startup scan review bridge in [`useStartupScanReview.ts`](../../renderer/src/hooks/useStartupScanReview.ts), which owns review/cancel actions for startup-discovered games before they hand off into the importer.
- The Game Manager shell bridge in [`useGameManagerShellBridge.ts`](../../renderer/src/hooks/useGameManagerShellBridge.ts), which owns the app-shell side of Game Manager save/delete maintenance actions and importer-open maintenance handoffs.
- The main-view shell-controls bridge in [`useMainViewShellControls.ts`](../../renderer/src/hooks/useMainViewShellControls.ts), which packages MenuBar and TopBar action callbacks so shell entry points share one root control surface instead of duplicating callback wiring in [`App.tsx`](../../renderer/src/App.tsx).
- The right-click menu control bridge in [`useRightClickMenuControls.ts`](../../renderer/src/hooks/useRightClickMenuControls.ts), which packages the root `RightClickMenu` callback bundle for active-game updates and preference-backed view/detail controls.
- [`RightClickMenu.tsx`](../../renderer/src/components/RightClickMenu.tsx) now opens Game Details and Carousel button-color controls in a dedicated popup picker instead of expanding the full color editor inline inside the main menu, exposes the persisted `Fill Available Space` toggle used by the grid library view, shows background blur controls as `0-100%` sliders, maps the Game Details transparency slider so `0%` is fully opaque and `100%` is fully transparent without changing stored preference compatibility, accepts the shell-provided initial editor section so right-clicking the games surface opens Games View controls while right-clicking the details surface opens Game Details controls, exposes Card / Poster controls for columns, smart fill, and poster-only rendering, and freezes the menu layout and position values while dragging the panel width slider in the Dividers section to prevent menu shifting.
- The 1080p grid baseline in [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts), [`useAppShellViewState.ts`](../../renderer/src/hooks/useAppShellViewState.ts), and [`RightClickMenu.tsx`](../../renderer/src/components/RightClickMenu.tsx) uses the tuned larger-tile layout so reset/default flows agree on grid size, padding, panel width, description split, opacity, and right-panel artwork controls.
- The carousel editor slice in [`RightClickMenuCarouselSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuCarouselSection.tsx), which owns the carousel-only size, alignment, background, and per-game logo controls so the parent menu no longer keeps that full view-specific editor inline.
- The cover-flow editor slice in [`RightClickMenuCoverFlowSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuCoverFlowSection.tsx), which owns the cover-flow-only artwork, background, and button controls so the parent menu no longer keeps that simplified view editor inline.
- The shared Game Details editor slice in [`RightClickMenuDetailsSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuDetailsSection.tsx), which owns the grid/list/logo details-column controls for per-game logo sizing, boxart placement, button styling, and details transparency so the parent menu no longer keeps that editor inline.
- The Games View editor slice in [`RightClickMenuGamesViewSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuGamesViewSection.tsx), which owns the grid/list/logo/card-poster left-column controls for categories, size, padding, list display options, Card / Poster poster-only mode, and background blur/brightness so the parent menu no longer keeps that games-view editor inline. Smart Fill appears in the same position before view-specific size controls in Card / Poster, Grid, and Logo views.
- The Dividers editor slice in [`RightClickMenuDividersSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuDividersSection.tsx), which owns the right panel width, banner height, description width, and bottom bar height sliders so the parent menu no longer keeps that divider editor inline.
- The shared button-colors editor in [`RightClickMenuButtonColorsEditor.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuButtonColorsEditor.tsx), popup in [`RightClickMenuButtonColorsPopup.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuButtonColorsPopup.tsx), and trigger in [`RightClickMenuButtonColorsTrigger.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuButtonColorsTrigger.tsx), so the parent menu no longer keeps the color-picker UI and popup positioning inline. The trigger remains mouse- and keyboard-activatable without wrapping its individual color buttons in another button.
- The shared modals slice in [`RightClickMenuModals.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuModals.tsx), which renders [`CustomDefaultsManager.tsx`](../../renderer/src/components/CustomDefaultsManager.tsx) and the reset/clear-per-game confirmation dialogs so the parent menu no longer embeds those flows inline. Custom Defaults Manager uses the same compact gray menu shell, blue active states, and small rounded controls as the app menu surfaces.
- The right-click menu header slice in [`RightClickMenuHeader.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuHeader.tsx), which owns the shared flip-view action, focused-section tabs, menu-transparency slider, and reset/default entry points so the parent menu no longer keeps that shared top chrome inline.
- The right-click menu mode switcher in [`RightClickMenuViewModeSwitch.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuViewModeSwitch.tsx), which owns the shared grid/list/logo/carousel/cover-flow mode toggle row so the parent menu no longer keeps that repeated view-button strip inline.
- The shell-surface action bridge in [`useAppShellSurfaceActions.ts`](../../renderer/src/hooks/useAppShellSurfaceActions.ts), which packages the remaining Welcome Screen, Game Context Menu, and root overlay callback bundles for the app shell.
- The shell carousel-controls bridge in [`useAppShellCarouselControls.ts`](../../renderer/src/hooks/useAppShellCarouselControls.ts), which packages the remaining carousel size-control persistence and empty-space context-menu routing so those handlers no longer stay inline in [`App.tsx`](../../renderer/src/App.tsx).
- The onboarding welcome surface in [`WelcomeScreen.tsx`](../../renderer/src/components/WelcomeScreen.tsx), which now mirrors the Add Games onboarding visual language with a two-column hero, branded setup card treatment, quick-tips panel, and the same mouse-reactive spinning Onyx cube on the right.
- The shell category strip in [`AppShellCategoryBar.tsx`](../../renderer/src/components/appShell/AppShellCategoryBar.tsx), which renders the reusable pinned-category pill row for both top and bottom placements instead of duplicating the same JSX in [`App.tsx`](../../renderer/src/App.tsx).
- The shell library-surface renderer in [`AppShellLibraryView.tsx`](../../renderer/src/components/appShell/AppShellLibraryView.tsx), which owns the left-panel category-strip placement, Welcome Screen handoff, non-card context-menu capture, and grid/list/card-poster/carousel/coverflow branching so [`App.tsx`](../../renderer/src/App.tsx) no longer renders every library-view variant inline.
- The sortable library-card wrapper in [`SortableGameCard.tsx`](../../renderer/src/components/SortableGameCard.tsx), which now keeps the rounded clipping shell static and applies the breathing-scale animation on an inner wrapper so the focused library card does not flash square artwork corners while selected.
- The shell library-filter bridge in [`useAppShellLibraryFilters.ts`](../../renderer/src/hooks/useAppShellLibraryFilters.ts), which owns category pinning, category counts, launcher derivation, and filtered-library sorting so [`App.tsx`](../../renderer/src/App.tsx) no longer mixes those library-state rules with the rest of the shell orchestration.
- The shell selection bridge in [`useAppShellSelection.ts`](../../renderer/src/hooks/useAppShellSelection.ts), which owns active-game lookup, visible-library selection reconciliation, and shell click-to-select behavior so [`App.tsx`](../../renderer/src/App.tsx) no longer manages that selection policy inline.
- The controller navigation bridge in [`useControllerNavigation.ts`](../../renderer/src/hooks/useControllerNavigation.ts), which owns browser Gamepad API polling, repeat throttling, DualSense-style focus routing, connection/input status, and debug reporting, is currently gated off in [`App.tsx`](../../renderer/src/App.tsx) while the General settings controls are marked coming soon.
- The shell background-media bridge in [`useAppShellBackgroundMedia.ts`](../../renderer/src/hooks/useAppShellBackgroundMedia.ts), which owns background artwork/video selection, animated fallback rules, blur optimization, and adjacent-art preloading so [`App.tsx`](../../renderer/src/App.tsx) no longer mixes that runtime media policy into the root component.
- The shell game-confirmation bridge in [`useAppShellGameConfirmations.ts`](../../renderer/src/hooks/useAppShellGameConfirmations.ts), which owns hide/uninstall confirmation state and follow-up actions so [`App.tsx`](../../renderer/src/App.tsx) no longer carries those root confirmation flows inline.
- The shell confirmation-dialog renderer in [`AppShellConfirmationDialogs.tsx`](../../renderer/src/components/appShell/AppShellConfirmationDialogs.tsx), which renders the hide, uninstall, and launch confirmation dialogs above the shell so [`App.tsx`](../../renderer/src/App.tsx) no longer embeds that dialog stack directly.
- The shell view-state bridge in [`useAppShellViewState.ts`](../../renderer/src/hooks/useAppShellViewState.ts), which owns the large view/layout preference state cluster and current-view derived values so [`App.tsx`](../../renderer/src/App.tsx) no longer acts as the main shell-state warehouse.
- The game-details-panel control bridge in [`useGameDetailsPanelControls.ts`](../../renderer/src/hooks/useGameDetailsPanelControls.ts), which packages the root `GameDetailsPanel` action and panel-persistence callbacks for the app shell.
- The details-panel divider in [`GameDetailsPanel.tsx`](../../renderer/src/components/GameDetailsPanel.tsx) now measures drag width from the live panel edge instead of the full window edge, so resizing the center split stays aligned with the visible divider.
- The app shell now sizes the right-hand details wrapper in [`App.tsx`](../../renderer/src/App.tsx) to the active panel width, so divider changes move the actual split instead of leaving the details panel inside a full-width flex lane.
- The shell modal-control bridge in [`useAppShellModalControls.ts`](../../renderer/src/hooks/useAppShellModalControls.ts), which packages settings, importer, Game Manager, and update-library modal callback bundles for the app shell.
- The shell launch bridge in [`useGameLaunchFlow.ts`](../../renderer/src/hooks/useGameLaunchFlow.ts), which owns launch confirmation, launch execution, running-state tracking, and restore/minimize process-side behavior.
- The importer handoff bridge in [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts), which owns importer-open guards, startup-scan/new-games handoff, importer reset behavior, and post-import tutorial follow-up.

## Settings and Toggles

- App-shell behavior depends on persisted preferences loaded and applied by [`App.tsx`](../../renderer/src/App.tsx), especially view mode, layout preferences, startup page, animation controls, and launch/restore options.
- Card / Poster View stores `cardColumns`, `cardSmartFill`, and `cardPostersOnly` through [`useAppShellPreferencePersistence.ts`](../../renderer/src/hooks/useAppShellPreferencePersistence.ts); baseline/default preferences set the Card / Poster background to `backgroundBrightnessByView.card = 1` and `backgroundBlur = 0` in [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts).
- `gridSmartFill`/`cardSmartFill` drive the shared [`smartFillColumns.ts`](../../renderer/src/utils/smartFillColumns.ts) algorithm (used by both [`LibraryGrid.tsx`](../../renderer/src/components/LibraryGrid.tsx) and [`LibraryCardView.tsx`](../../renderer/src/components/LibraryCardView.tsx)), which only ever shrinks tiles to fit — it takes a `minColumns` floor derived from the configured `gridSize`/`logoSize`/`cardColumns` so it never enlarges tiles past their configured size for small libraries. Both components also recompute on `window resize` and DPI (`matchMedia('(resolution: ...)')`) changes in addition to `ResizeObserver`, since moving the window to a display with a different scale factor can change the effective layout without changing the observed container's CSS-pixel box size.
- Top-bar layout preferences include search, sort, launcher, category menu, and pinned category positions. The right-click layout menu can move all controls together, hide/show all controls, or hide/move individual controls without closing after each setting change.
- Tray behavior depends on `showSystemTrayIcon`, `minimizeToTray`, and `closeToTray`; minimize-to-tray only hides to tray when the tray icon is available, while tray restore immediately shows/focuses the window and then reapplies saved maximized/fullscreen state after preferences are available.
- Startup scan gating depends on updater dismissal and startup scan settings documented in [Library Import and Startup Scan](./library-import-and-startup-scan.md).
- Update modal behavior depends on the updater flow documented in [Updater and Release Install](./updater.md).

## Confirmed End-to-End Flows

1. Renderer boots in [`App.tsx`](../../renderer/src/App.tsx); [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) loads preferences, applies baseline defaults when needed, restores shell state, and then the library window mounts with the persisted shell configuration.
2. [`useAppShellSelection.ts`](../../renderer/src/hooks/useAppShellSelection.ts) waits until initial preferences finish loading, restores `activeGameId` when it is still visible, writes clicked selections immediately, and only promotes the first visible game when the saved or previous selection is no longer valid.
3. Main-process startup/update events reach the renderer via preload listeners; [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts) updates root state in [`App.tsx`](../../renderer/src/App.tsx) and [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx) renders the matching overlay.
4. Startup scans show progress first, then use [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx) to either dismiss quietly or route found games into the importer.
5. [`useAppShellModals.ts`](../../renderer/src/hooks/useAppShellModals.ts) normalizes settings, Game Manager, onboarding, and related modal routes so shell callbacks can target tabs or games without each surface reimplementing the same state transitions.
6. [`useAppShellSystemState.ts`](../../renderer/src/hooks/useAppShellSystemState.ts) owns update/changelog fetching, update-dismiss/update-download actions, and crash-dump prompt actions so updater and crash flows share one shell-level runtime state path.
7. [`useSettingsSaveRefresh.ts`](../../renderer/src/hooks/useSettingsSaveRefresh.ts) reapplies shell-facing settings after the user saves [`OnyxSettingsModal.tsx`](../../renderer/src/components/OnyxSettingsModal.tsx), keeping runtime shell controls aligned with persisted preferences without embedding that readback logic in the root component.
8. [`usePreferenceWriter.ts`](../../renderer/src/hooks/usePreferenceWriter.ts) now handles a chunk of the shell-level write-through preference updates for controls like the right-click menu, reducing repeated `savePreferences` wiring in [`App.tsx`](../../renderer/src/App.tsx).
9. [`useStartupScanReview.ts`](../../renderer/src/hooks/useStartupScanReview.ts) owns the startup overlay’s cancel/review actions so found-games review routes into the importer through one focused handoff path.
10. [`useGameManagerShellBridge.ts`](../../renderer/src/hooks/useGameManagerShellBridge.ts) owns the shell-side Game Manager maintenance bridge, including delete/save follow-up and maintenance-mode importer handoff.
11. [`useMainViewShellControls.ts`](../../renderer/src/hooks/useMainViewShellControls.ts) bundles MenuBar and TopBar shell actions, including refresh/import/settings entry points and preference-backed search/view updates, so root control routing stays consistent across main-view surfaces.
12. Right-clicking anywhere on the fixed top bar opens [`TopBarContextMenu.tsx`](../../renderer/src/components/TopBarContextMenu.tsx). Position and visibility changes call the shell preference writer while leaving the menu open for repeated edits, and explicit `Close` or outside click dismisses the menu.
13. [`useRightClickMenuControls.ts`](../../renderer/src/hooks/useRightClickMenuControls.ts) bundles the root right-click settings menu actions, including per-view preference writes and active-game handoff, so `RightClickMenu` routing no longer stays inline in [`App.tsx`](../../renderer/src/App.tsx). The shell keeps a transient initial editor section on right-click open state so library-surface right-clicks focus Games View controls and details-panel right-clicks focus Game Details controls.
13. [`RightClickMenuCarouselSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuCarouselSection.tsx) now owns the carousel-only editor controls, including selected-art sizing, detail-bar sizing, carousel logo and button alignment, and the per-game carousel logo override path.
14. [`RightClickMenuCoverFlowSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuCoverFlowSection.tsx) now owns the cover-flow-only editor controls, including cover size, reflection, side opacity, cover offset, and cover-flow button styling.
15. [`RightClickMenuDetailsSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuDetailsSection.tsx) now owns the shared Game Details editor column for grid, list, and logo view menus.
16. [`RightClickMenuGamesViewSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuGamesViewSection.tsx) now owns the Games View editor column (categories, size, padding, list options, background blur/brightness) for grid, list, and logo view menus.
17. [`RightClickMenuDividersSection.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuDividersSection.tsx) now owns the Dividers editor column (panel width, banner height, description width, bottom bar height) for grid, list, and logo view menus.
18. [`RightClickMenuHeader.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuHeader.tsx) now owns the shared top action row, including flip-view, focused-section tabs, menu-transparency, and reset/default entry points.
19. [`RightClickMenuViewModeSwitch.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuViewModeSwitch.tsx) now owns the shared row of mode-toggle buttons for grid, list, logo, carousel, and cover flow.
20. [`RightClickMenuButtonColorsEditor.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuButtonColorsEditor.tsx), [`RightClickMenuButtonColorsPopup.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuButtonColorsPopup.tsx), and [`RightClickMenuButtonColorsTrigger.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuButtonColorsTrigger.tsx) now own the shared button-color picker UI and floating popup so the parent menu no longer keeps that editor/popup/trigger inline.
21. [`RightClickMenuModals.tsx`](../../renderer/src/components/rightClickMenu/RightClickMenuModals.tsx) now renders [`CustomDefaultsManager.tsx`](../../renderer/src/components/CustomDefaultsManager.tsx) and reset/clear-per-game confirmation dialogs so the parent menu no longer embeds those modals inline. The Custom Defaults Manager export, import, and manage tabs share the app menu's compact gray panel styling and blue selected-control language.
22. [`useAppShellSurfaceActions.ts`](../../renderer/src/hooks/useAppShellSurfaceActions.ts) bundles the smaller Welcome Screen, Game Context Menu, and overlay action props so the remaining shell surface routing does not stay inline in [`App.tsx`](../../renderer/src/App.tsx).
23. [`useAppShellCarouselControls.ts`](../../renderer/src/hooks/useAppShellCarouselControls.ts) bundles carousel size-control persistence and empty-space right-click routing so the carousel view no longer leaves direct `savePreferences` glue inline in [`App.tsx`](../../renderer/src/App.tsx).
24. [`AppShellCategoryBar.tsx`](../../renderer/src/components/appShell/AppShellCategoryBar.tsx) renders the shared pinned-category strip for either top or bottom placement, keeping category-pill behavior consistent without duplicate shell JSX.
25. [`AppShellLibraryView.tsx`](../../renderer/src/components/appShell/AppShellLibraryView.tsx) owns the library-surface view branching, including Card / Poster rendering through [`LibraryCardView.tsx`](../../renderer/src/components/LibraryCardView.tsx), top/bottom pinned-category placement, Welcome Screen handoff, and non-card context-menu capture so the app shell no longer renders the entire left panel inline in [`App.tsx`](../../renderer/src/App.tsx).
26. [`useAppShellLibraryFilters.ts`](../../renderer/src/hooks/useAppShellLibraryFilters.ts) owns category pinning defaults, category/launcher discovery, and filtered-library sorting so the app shell no longer leaves those library-state rules inline in [`App.tsx`](../../renderer/src/App.tsx).
27. [`useAppShellSelection.ts`](../../renderer/src/hooks/useAppShellSelection.ts) owns active-game lookup, visible-library selection reconciliation, and click-to-select routing so the app shell no longer leaves that selection policy inline in [`App.tsx`](../../renderer/src/App.tsx).
28. [`useControllerNavigation.ts`](../../renderer/src/hooks/useControllerNavigation.ts) remains the controller input bridge, but [`App.tsx`](../../renderer/src/App.tsx) currently keeps it disabled while the settings surface is marked coming soon.
29. [`useAppShellBackgroundMedia.ts`](../../renderer/src/hooks/useAppShellBackgroundMedia.ts) owns background artwork/video selection, animated fallback rules, blur optimization, and adjacent-art preloading so the app shell no longer leaves that runtime media policy inline in [`App.tsx`](../../renderer/src/App.tsx).
30. [`useAppShellGameConfirmations.ts`](../../renderer/src/hooks/useAppShellGameConfirmations.ts) owns hide/uninstall confirmation state and follow-up actions so the app shell no longer leaves those root confirmation flows inline in [`App.tsx`](../../renderer/src/App.tsx).
31. [`AppShellConfirmationDialogs.tsx`](../../renderer/src/components/appShell/AppShellConfirmationDialogs.tsx) renders the hide, uninstall, and launch confirmation dialogs so the app shell no longer embeds that confirmation stack directly in [`App.tsx`](../../renderer/src/App.tsx).
32. [`useAppShellViewState.ts`](../../renderer/src/hooks/useAppShellViewState.ts) owns the large view/layout preference state cluster and current-view derived values so the app shell no longer leaves that shell-state warehouse inline in [`App.tsx`](../../renderer/src/App.tsx).
33. [`useGameDetailsPanelControls.ts`](../../renderer/src/hooks/useGameDetailsPanelControls.ts) bundles the root `GameDetailsPanel` actions plus panel-width/divider persistence wiring so right-panel control routing no longer stays inline in [`App.tsx`](../../renderer/src/App.tsx).
34. [`useAppShellModalControls.ts`](../../renderer/src/hooks/useAppShellModalControls.ts) bundles the settings/importer/Game Manager/update-library modal props so the remaining modal callback routing does not stay inline in [`App.tsx`](../../renderer/src/App.tsx).
35. [`useImporterWorkbench.ts`](../../renderer/src/hooks/useImporterWorkbench.ts) converts menu actions, Welcome Screen onboarding, startup-scan discoveries, and Game Manager maintenance flows into one importer lifecycle for [`ImportWorkbench.tsx`](../../renderer/src/components/importer/ImportWorkbench.tsx).
36. Update availability, crash dumps, tutorial prompts, toast messages, and missing-games cleanup all render above the library shell without each feature owning its own root-level wiring.

## Discovery and Data Sources

- Root renderer state comes from [`App.tsx`](../../renderer/src/App.tsx), [`useGameLibrary.ts`](../../renderer/src/hooks/useGameLibrary.ts), [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts), [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts), and preload APIs exposed by [`main/preload.ts`](../../main/preload.ts).
- Animated-media policy comes from [`useAnimatedMediaPolicy.ts`](../../renderer/src/hooks/useAnimatedMediaPolicy.ts), which derives display-safe library records from overlay state and animation preferences before library views render.
- Startup scan events come from the startup scan flow documented in [Library Import and Startup Scan](./library-import-and-startup-scan.md).
- Update state comes from the updater flow documented in [Updater and Release Install](./updater.md).
- Crash dump prompts come from crash detection services documented in [Crash Detection and Bug Reporting](./crash-detection-and-bug-reporting.md).

## Data Model and Persistence

- The shell itself does not persist a separate app-shell document store.
- Persistent shell-affecting state is loaded from preferences in [`App.tsx`](../../renderer/src/App.tsx) and written through [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts).
- Main-window shell state is persisted from [`main.ts`](../../main/main.ts): move/resize writes are debounced, while maximize/unmaximize/fullscreen transitions save immediately and app quit paths flush the latest window mode before shutdown. [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts) serializes preference writes so later partial saves cannot overwrite a newly persisted maximized or fullscreen state with stale values.
- Top-bar layout is stored in `topBarPositions`, including `pinnedCategories` and the `hidden` state for each top-bar item. Active selection is stored in `activeGameId` when the user selects a visible game.
- Tray settings are stored in general preferences and mirrored in the main process so minimize, close, tray menu restore, and tray-icon visibility share the same runtime flags. Open/close-to-tray paths do not wait for preference reads before showing or hiding the BrowserWindow, so startup scan activity cannot make the tray icon appear unresponsive.
- The custom tray menu popup window runs fully isolated (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`) with its bridge limited to [`trayMenuPreload.ts`](../../main/ui/trayMenuPreload.ts) (`window.trayMenu.sendAction/close`), and [`tray.ts`](../../main/ui/tray.ts) verifies the IPC sender so only that window can trigger tray actions.
- The main window denies `will-navigate` to non-app URLs and denies `window.open` popups in [`main.ts`](../../main/main.ts); http/https targets are routed to the system browser through the protocol allowlist in [`SecurityUtils.ts`](../../main/SecurityUtils.ts). Menu events subscribe through an allowlisted `onMenuEvent` bridge in [`preload.ts`](../../main/preload.ts).
- Transient overlay state such as `toast`, `startupProgress`, `foundGames`, `missingGames`, `updateNotification`, and `crashDumpPaths` lives in [`App.tsx`](../../renderer/src/App.tsx) and is only held in memory.

## Failure Modes and Triage

### Symptom: Startup scan blocks the app or never reaches importer review

- Check `startup:*` listeners in [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts) and rendering in [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx).
- Cross-check startup gating in [Library Import and Startup Scan](./library-import-and-startup-scan.md).

### Symptom: Update prompt appears but changelog/version data is missing

- Check the changelog fetch in [`App.tsx`](../../renderer/src/App.tsx) and update-status listener wiring in [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts).
- Check the shell overlay handoff in [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx).
- Cross-check updater behavior in [Updater and Release Install](./updater.md).

### Symptom: Crash dump or missing-games prompts do not show

- Check the relevant event listeners in [`useAppShellEvents.ts`](../../renderer/src/hooks/useAppShellEvents.ts) and local state in [`App.tsx`](../../renderer/src/App.tsx).
- Check the shell overlay rendering path in [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx).

### Symptom: layout or display settings do not restore on launch

- Check preference load/apply flow in [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts).
- Check the persisted settings source in [Settings and Preferences Overview](./settings-and-preferences.md).
- Check [`main.ts`](../../main/main.ts) window-state persistence and [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts) write ordering if the issue is specifically about maximized or fullscreen restoration after a reload/relaunch.

### Symptom: switching views or other shell controls snap back immediately

- Check that [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) is not re-running its initialization effect after normal shell state changes.
- Check whether the persisted preference load is being called only on startup or explicit refresh paths such as imported settings.

### Symptom: clicking another visible game does not update the shell selection

- Check the selection reconciliation logic in [`useAppShellSelection.ts`](../../renderer/src/hooks/useAppShellSelection.ts), especially the visible-selection fallback when the previous game is no longer in `filteredGames`.
- Check that the current view component (`LibraryGrid`, `LibraryListView`, `LibraryCardView`, `LibraryCarousel`, or `LibraryCoverFlow`) is forwarding `onGameClick` back through [`AppShellLibraryView.tsx`](../../renderer/src/components/appShell/AppShellLibraryView.tsx).
- Confirm preference bootstrap has completed before fallback selection runs, and verify clicked games write `activeGameId` through [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts).

### Symptom: top-bar layout menu closes after each change or does not open everywhere

- Check [`MenuBar.tsx`](../../renderer/src/components/MenuBar.tsx) for the shared top-bar context-menu opener and [`TopBarContextMenu.tsx`](../../renderer/src/components/TopBarContextMenu.tsx) for close behavior.
- Confirm `onPositionsChange` updates preferences without clearing the open context-menu state, and that the top bar surface is not marked as an Electron drag region that blocks context-menu events.

### Symptom: restoring from tray does not preserve maximize/fullscreen state

- Check tray restore actions in [`main/ui/tray.ts`](../../main/ui/tray.ts) and window-state restoration in [`main.ts`](../../main/main.ts).
- Confirm minimize-to-tray is reading the latest `minimizeToTray` and `showSystemTrayIcon` flags before hiding the window.
- Confirm the restore path calls `show()`/`focus()` before asynchronous preference readback applies saved maximized/fullscreen state.

### Symptom: tray icon does not open or close the app while startup scan is running

- Check [`showMainWindowFromTray`](../../main/main.ts) and [`TrayService.showOnyxWindow`](../../main/ui/tray.ts); both should show and focus the window before reading preferences.
- Check the close handler in [`main.ts`](../../main/main.ts); close-to-tray should hide the window immediately and save window state asynchronously instead of waiting for preference I/O.

### Symptom: WebP banners, logos, or boxarts are missing

- Check `isAnimatedImageUrl` in [`useAnimatedMediaPolicy.ts`](../../renderer/src/hooks/useAnimatedMediaPolicy.ts) and ensure WebP is not flagged as always animated, then verify if the game record has a valid URL.

## File Ownership Map

- [App.tsx](../../renderer/src/App.tsx) - renderer root, shell state ownership, top-level event wiring, and library-shell composition.
- [AppShellOverlays.tsx](../../renderer/src/components/appShell/AppShellOverlays.tsx) - root overlay compositor for update, crash, tutorial, toast, missing-games, and startup scan UI.
- [StartupScanOverlay.tsx](../../renderer/src/components/appShell/StartupScanOverlay.tsx) - startup progress overlay and found-games review handoff.
- [useAppShellEvents.ts](../../renderer/src/hooks/useAppShellEvents.ts) - root menu, startup scan, updater, and crash-dump listener registration for the app shell.
- [useAppPreferences.ts](../../renderer/src/hooks/useAppPreferences.ts) - renderer preference bootstrap, refresh, and first-launch baseline-default application.
- [useAppShellPreferencePersistence.ts](../../renderer/src/hooks/useAppShellPreferencePersistence.ts) - debounced shell preference writes and saved active-game validation for the renderer root.
- [useAnimatedMediaPolicy.ts](../../renderer/src/hooks/useAnimatedMediaPolicy.ts) - shell-wide animation sanitization and DOM video pause/resume policy enforcement.
- [useAppShellModals.ts](../../renderer/src/hooks/useAppShellModals.ts) - shell modal state ownership and tab/game-aware open-close helpers for root modal entry points.
- [useAppShellSystemState.ts](../../renderer/src/hooks/useAppShellSystemState.ts) - updater, changelog, and crash-dump runtime state plus the shell actions that operate on them.
- [useSettingsSaveRefresh.ts](../../renderer/src/hooks/useSettingsSaveRefresh.ts) - settings-save preference readback and runtime shell refresh after modal saves.
- [usePreferenceWriter.ts](../../renderer/src/hooks/usePreferenceWriter.ts) - direct renderer-side preference write helpers used by shell control surfaces.
- [useStartupScanReview.ts](../../renderer/src/hooks/useStartupScanReview.ts) - startup scan review/cancel handoff from shell overlays into the importer flow.
- [useGameManagerShellBridge.ts](../../renderer/src/hooks/useGameManagerShellBridge.ts) - shell-side Game Manager maintenance, save/delete follow-up, and importer handoff wiring.
- [useMainViewShellControls.ts](../../renderer/src/hooks/useMainViewShellControls.ts) - bundled MenuBar and TopBar shell callbacks for scan, refresh, settings, tutorial, updater preview, and preference-backed search/view actions.
- [useRightClickMenuControls.ts](../../renderer/src/hooks/useRightClickMenuControls.ts) - bundled right-click settings menu callbacks for active-game updates and preference-backed per-view display controls.
- [RightClickMenuCarouselSection.tsx](../../renderer/src/components/rightClickMenu/RightClickMenuCarouselSection.tsx) - carousel-only right-click editor controls for artwork sizing, background tuning, logo controls, and carousel button settings.
- [RightClickMenuCoverFlowSection.tsx](../../renderer/src/components/rightClickMenu/RightClickMenuCoverFlowSection.tsx) - cover-flow-only right-click editor controls for cover sizing, motion tuning, background tuning, and cover-flow button settings.
- [RightClickMenuDetailsSection.tsx](../../renderer/src/components/rightClickMenu/RightClickMenuDetailsSection.tsx) - shared Game Details editor controls for per-game logo sizing, boxart placement, button styling, and details transparency in grid/list/logo menus.
- [RightClickMenuHeader.tsx](../../renderer/src/components/rightClickMenu/RightClickMenuHeader.tsx) - shared right-click menu header for focus tabs, transparency, reset/default actions, and flip-view control.
- [RightClickMenuViewModeSwitch.tsx](../../renderer/src/components/rightClickMenu/RightClickMenuViewModeSwitch.tsx) - shared right-click menu view-mode toggle row.
- [CustomDefaultsManager.tsx](../../renderer/src/components/CustomDefaultsManager.tsx) - export/import/manage surface for saved custom view defaults, styled to match the app menu chrome and opened from the right-click Defaults action.
- [useAppShellSurfaceActions.ts](../../renderer/src/hooks/useAppShellSurfaceActions.ts) - bundled Welcome Screen, Game Context Menu, and overlay callbacks for smaller root shell surface prop wiring.
- [useAppShellCarouselControls.ts](../../renderer/src/hooks/useAppShellCarouselControls.ts) - bundled carousel size-control persistence and empty-space context-menu callbacks for the root shell.
- [AppShellCategoryBar.tsx](../../renderer/src/components/appShell/AppShellCategoryBar.tsx) - reusable pinned-category strip used by the root shell for top and bottom category placements.
- [AppShellLibraryView.tsx](../../renderer/src/components/appShell/AppShellLibraryView.tsx) - reusable left-panel library surface that renders category rows, welcome handoff, and grid/list/card-poster/carousel/coverflow view branching for the app shell.
- [LibraryCardView.tsx](../../renderer/src/components/LibraryCardView.tsx) - Card / Poster view grid, smart-fill layout, keyboard navigation, and drag sorting.
- [SortableCardTile.tsx](../../renderer/src/components/SortableCardTile.tsx) - sortable Card / Poster tile wrapper that forwards clicks, context menus, focus state, and poster-only mode.
- [GameCardWide.tsx](../../renderer/src/components/GameCardWide.tsx) - Card / Poster visual renderer for wide card layouts and poster-only artwork tiles.
- [useAppShellLibraryFilters.ts](../../renderer/src/hooks/useAppShellLibraryFilters.ts) - bundled category pinning, category counts, launcher derivation, and filtered-library sorting for the root shell.
- [useAppShellSelection.ts](../../renderer/src/hooks/useAppShellSelection.ts) - bundled active-game lookup and visible-library selection reconciliation for the root shell.
- [TopBarContextMenu.tsx](../../renderer/src/components/TopBarContextMenu.tsx) - top-bar layout menu for moving or hiding shell controls without leaving the menu.
- [useControllerNavigation.ts](../../renderer/src/hooks/useControllerNavigation.ts) - browser Gamepad API polling, controller focus routing, connection/input toasts, and debug state for grid/list/logo shell control, currently gated off while marked coming soon.
- [useAppShellBackgroundMedia.ts](../../renderer/src/hooks/useAppShellBackgroundMedia.ts) - bundled background artwork/video selection, animated fallback handling, blur optimization, and adjacent-art preloading for the root shell.
- [useAppShellGameConfirmations.ts](../../renderer/src/hooks/useAppShellGameConfirmations.ts) - bundled hide/uninstall confirmation state and follow-up actions for the root shell.
- [AppShellConfirmationDialogs.tsx](../../renderer/src/components/appShell/AppShellConfirmationDialogs.tsx) - reusable root confirmation dialog stack for hide, uninstall, and launch flows.
- [useAppShellViewState.ts](../../renderer/src/hooks/useAppShellViewState.ts) - bundled shell view/layout preference state and current-view derived values for the renderer root.
- [useGameDetailsPanelControls.ts](../../renderer/src/hooks/useGameDetailsPanelControls.ts) - bundled Game Details panel callbacks for right-panel actions and divider persistence.
- [useAppShellModalControls.ts](../../renderer/src/hooks/useAppShellModalControls.ts) - bundled settings/importer/Game Manager/update-library modal callbacks for smaller root shell modal prop wiring.
- [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts) - renderer launch confirmation, launch execution, process polling, and running-state tracking for the app shell.
- [useImporterWorkbench.ts](../../renderer/src/hooks/useImporterWorkbench.ts) - importer lifecycle orchestration shared by startup handoff, menu actions, onboarding, and Game Manager cleanup flows.
- [FoundGamesModal.tsx](../../renderer/src/components/FoundGamesModal.tsx) - reusable found-games review modal used by the startup overlay when scans discover new titles.
- [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) - top-level shell entry points into importer, settings, updater, tutorial, and other library actions.
- [main.ts](../../main/main.ts) - owns BrowserWindow creation plus persisted bounds/maximize/fullscreen restoration for the main app shell.
- [tray.ts](../../main/ui/tray.ts) - owns tray menu rendering, tray restore actions, recent-game shortcuts, and tray-aware show/focus behavior.
- [trayMenuPreload.ts](../../main/ui/trayMenuPreload.ts) - minimal contextBridge API for the isolated tray menu popup window (`sendAction`/`close` only).

