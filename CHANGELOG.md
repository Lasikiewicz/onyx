# Changelog

All notable changes to Onyx are documented in this file. For download links and full release notes, see [GitHub Releases](https://github.com/Lasikiewicz/onyx/releases).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Pending]

## [0.9.3] - 2026-05-18

- App shell:
  - Preserve maximized window state across relaunches by serializing preference writes and flushing the latest BrowserWindow state before app quit paths complete.

## [0.9.2] - 2026-05-14

- App shell:
  - Mark controller navigation as coming soon and keep runtime gamepad polling disabled while controller input support is finalized.
- Tests:
  - Allow the suspend/resume mock fallback test to accept either `powershell.exe` or `powershell` while still verifying the PowerShell cmdlet fallback.

## [0.9.1] - 2026-05-14

- App shell:
  - Add DualSense/controller navigation for grid, logo, and list library views, including game cycling, details action-row focus, top-bar focus, and controller-opened context menus.
  - Add visible General settings controls for controller navigation, button-label layout, and navigation repeat speed so saved gamepad preferences are no longer hidden.
  - Add controller connection/input toasts, live debug state, analog button-value handling, and non-standard D-pad/hat-axis handling so DualSense detection issues are easier to diagnose across USB, Bluetooth, and Steam Input modes.
  - Align the Custom Defaults Manager with the main app menu styling by using the same compact gray panel shell, blue active states, small rounded controls, and neutral action rows.

## [0.9.0] - 2026-04-30

- Add Games:
  - Improve first-import artwork quality by preferring Steam 2x covers and SteamGridDB visual assets over lower-resolution general metadata artwork.
- Image cache:
  - Raise cache optimization size ceilings for covers, banners, heroes, logos, icons, and screenshots so newly imported media remains sharp in library and details views.

## [0.8.14] - 2026-04-30

- Add Games:
  - Replace the lightweight scanning screen's generic spinner with a compact spinning Onyx cube logo and remove the redundant importer-lightweight explainer copy.
- App shell:
  - Open the right-click menu directly on Games View controls from the library surface and directly on Game Details controls from the details panel.

## [0.8.13] - 2026-04-30

- Game launch:
  - Resolve Neverness To Everness library entries to the root `NTEGlobalLauncher.exe` before launching, including older entries that point at nested client executables or only the install folder.
  - Surface Windows PowerShell `Start-Process` launch failures instead of reporting success when the launcher command fails before opening.

## [0.8.12] - 2026-04-30

- Add Games:
  - Fix aggressive executable filtering in manual folder scanning that prevented `NTEGlobalLauncher.exe` from being detected when users add Neverness To Everness via Custom Folder.
  - Fix Neverness To Everness hardcoded detection to specifically target `NTEGlobalLauncher.exe` to ensure the correct launcher executable opens when playing the game.
  - Fix PowerShell `Start-Process` game launch execution to no longer apply `-WindowStyle Hidden`, resolving an issue where UAC-launched games and launchers would start correctly but remain completely invisible in the background.

## [0.8.11] - 2026-04-29

- Add Games:
  - Collapse non-hardcoded scan hits under known hardcoded install roots so `C:\Program Files\Neverness To Everness` stages only the canonical `HARDCODED` entry instead of extra `Client`/`NTEGlobal` duplicates.

## [0.8.10] - 2026-04-29

- Metadata matching:
  - Add special-case title normalization for Neverness To Everness to ensure proper metadata provider matching for hardcoded game path auto-detection, similar to existing special cases for Tony Hawk's Pro Skater and Avatar Frontiers of Pandora.
  - Document game title matching strategy, confidence scoring, and special-case handling in metadata matching feature runbook.

## [0.8.9] - 2026-04-29

- Add Games:
  - Automatically detect and index Neverness To Everness from `C:\Program Files\Neverness To Everness` during library scans by adding hardcoded game path scanning to ImportService, displayed with "Official Launcher" as the source.
- UI/Rendering:
  - Fix blur effect on game tiles during pulse/breathing animation by enabling GPU acceleration with `translateZ(0)` in keyframes, adding `backface-visibility: hidden`, and applying font-smoothing hints to prevent rendering artifacts during scale transforms.

## [0.8.8] - 2026-04-15

- Startup/runtime:
  - Stop showing crash-report prompts after clean launches by persisting previous-session exit state and only surfacing crash artifacts when the last run ended uncleanly.
  - Keep background image caching alive when the window is hidden to tray, and re-queue games with uncached remote artwork on the next launch so newly added boxarts finish converting to local cache entries.
- Suspend/Resume:
  - Harden Windows process tracking and rediscovery by preserving install-path context, preferring CIM-based process enumeration, and using more reliable PID existence checks before suspend/resume operations.

## [0.8.7] - 2026-03-31

- Game Manager:
  - Keep a local `Upload Image` action visible next to `Upload WEBM` in the Images tab results header so selected artwork tabs such as Logo can attach a custom image without leaving the search results view.

## [0.8.6] - 2026-03-30

- Startup/runtime:
  - Save maximized and fullscreen window-state changes immediately so reloads and relaunches reopen the app in the latest shell mode instead of falling back to a restored windowed state.

## [0.8.5] - 2026-03-24

- Startup/runtime:
  - Distinguish `Start Minimized` from `Start Closed to Tray` by registering explicit startup-mode launch arguments, so login launches now minimize to the taskbar or stay hidden in the tray according to the saved preference.
  - Restore the main window on demand by showing and focusing it after minimize, and only auto-restore after game exit when Onyx minimized a launch that returned a tracked PID.
  - Log renderer crashes through Electron's `render-process-gone` event so importer/startup failures report structured exit reasons.

- Add Games:
  - Keep the importer on a lightweight scanning screen while manual scans are running so large discovery/metadata batches do not mount the full staged editor mid-scan.
  - Trim oversized staged screenshot and link arrays before storing importer metadata, reducing renderer pressure during large scans.
  - Stabilize staged Metadata and Images state resets when changing games by exposing memoized reset callbacks from the shared Game Properties hooks.

## [0.8.4] - 2026-03-19

- Importer:
  - Rename `ImportWorkbenchV2.tsx` to `ImportWorkbench.tsx` and update all references (props type `ImportWorkbenchProps`, lazy import, hooks, eslint, and feature docs).
  - Extract queue/sidebar game list into [`ImportWorkbenchSidebar.tsx`](renderer/src/components/importer/ImportWorkbenchSidebar.tsx) so `ImportWorkbench.tsx` composes the list from a dedicated slice; update importer and Add Games feature docs.
  - Extract footer (import CTA and progress) into [`ImportWorkbenchFooter.tsx`](renderer/src/components/importer/ImportWorkbenchFooter.tsx); update importer and Add Games feature docs.
  - Extract the staged-game editor shell into [`ImportWorkbenchEditor.tsx`](renderer/src/components/importer/ImportWorkbenchEditor.tsx) so `ImportWorkbench.tsx` composes `GamePropertiesPanel` through a focused editor slice; update importer and Add Games feature docs.
  - Extract scan-control listeners + `handleScanAll` into [`useImportWorkbenchScan.ts`](renderer/src/hooks/useImportWorkbenchScan.ts) so scan logic is no longer owned by the top-level importer screen; update importer and Add Games feature docs.
  - Extract the importer top header into [`ImportWorkbenchHeader.tsx`](renderer/src/components/importer/ImportWorkbenchHeader.tsx) so scan status and ignored toggles are rendered by a dedicated component.
  - Extract the empty-state onboarding hero into [`ImportWorkbenchEmptyState.tsx`](renderer/src/components/importer/ImportWorkbenchEmptyState.tsx) so the main screen composes the onboarding CTA and preview points from a focused component.
  - Extract queue/editor/import actions (update/skip/ignore/import) into [`useImportWorkbenchActions.ts`](renderer/src/hooks/useImportWorkbenchActions.ts) so `ImportWorkbench.tsx` is primarily orchestration and layout wiring.
  - Extract importer source/status display helpers into `ImportWorkbenchDisplayUtils.tsx` and remove the legacy commented-out `handleScanAll` implementation block from `ImportWorkbench.tsx`.
  - Extract pluggable source scanner modules for launcher scans (`main/scanners/*`) starting with `SteamScanner` and `XboxScanner`, and dispatch those sources from `ImportService.ts` for safer module boundaries.

- Right click menu:
  - Extract the grid/list/logo Games View editor into `RightClickMenuGamesViewSection.tsx` (categories, size, padding, list options, background blur/brightness) and the Dividers editor into `RightClickMenuDividersSection.tsx` (panel width, banner height, description width, bottom bar height) so `RightClickMenu.tsx` no longer keeps those sections inline.
  - Extract shared popup/default flows into `RightClickMenuButtonColorsEditor.tsx`, `RightClickMenuButtonColorsPopup.tsx`, `RightClickMenuButtonColorsTrigger.tsx` (button color picker UI), and `RightClickMenuModals.tsx` (Custom Defaults Manager, reset confirmation, clear-per-game confirmation) so the parent menu no longer keeps those dialogs and popup UI inline.

- Updater:
  - Let the update notification modal changelog panel flex to fill the available dialog height, and tighten the vertical spacing so the "new version available" screen reads more compactly.

## [0.8.3] - 2026-03-19

- Game details panel:
  - Simplify the background transition between the banner and content area by using a long `mask-image` gradient on the banner artwork itself, providing a clean blend into the details area without the "double effect" of a separate blur layer.
  - Remove format restrictions that excluded WebP and animated image formats from the background blur, and fix an app-wide bug where WebP banners, boxarts, and logos were hidden when animations were disabled.
  - Fix divider drag sizing so the center split measures from the live details-panel edge instead of the browser window edge, keeping the visible panel divider aligned while resizing.
  - Size the shell-side details wrapper to the active panel width instead of leaving it as a full-width `flex-1` lane, so the center divider now moves the actual split instead of shrinking the panel inside a large empty gap.

- App shell:
  - Keep the rounded corners clipped while the selected library card runs its breathing zoom animation, so focused boxart no longer flashes square corners during the scale pulse.
  - Move the breathing-scale transform onto an inner library-card wrapper while the rounded clip stays on the static outer shell, so selected boxart remains rounded for the full pulse instead of briefly rasterizing square corners.

- Right click menu:
  - Extract the carousel-only editor into `RightClickMenuCarouselSection.tsx` and the cover-flow-only editor into `RightClickMenuCoverFlowSection.tsx` so `RightClickMenu.tsx` no longer keeps those view-specific control blocks inline.
  - Extract the shared top chrome into `RightClickMenuHeader.tsx` and `RightClickMenuViewModeSwitch.tsx` so `RightClickMenu.tsx` no longer keeps the flip-view action row, focused-section toggles, transparency control, reset/default buttons, and mode-switch strip inline.
  - Extract the shared Game Details editor into `RightClickMenuDetailsSection.tsx` so `RightClickMenu.tsx` no longer keeps the grid/list/logo details-column controls inline.

- Add Games:
  - Align the staged-game Images tab with the Game Manager image-search flow so artwork clicks switch type without re-running an already completed search, and staged image selection uses the same tabbed search/results controls as the Game Manager images tab.
  - Reuse the exact Game Manager Metadata, Links, and Mod Manager tabs inside `GamePropertiesPanel.tsx`, adapt staged-game saves through `useGamePropertiesMetadata.ts`, and persist staged `modManagerUrl` edits so Add Games now matches the same editing surfaces and actions used after import.
  - Add a staged `launchModManagerTarget` path through the launcher IPC/preload bridge so the shared Mod Manager tab can launch configured local paths or vetted external URLs before a staged game exists in the library.
  - Persist staged image selections back into the importer queue immediately so artwork picks made through the shared `GameManagerImagesTab.tsx` update the visible staged game instead of reverting to the older importer behavior.
  - Keep the shared API/provider detail row visible in the staged Images tab after results load by retaining or rebuilding provider progress from the staged search state, so Add Games matches the Game Manager image-source breakdown.

- Startup/runtime:
  - Treat benign `onyx-local` default-session registration collisions as informational startup logs instead of warnings when the protocol is already registered.
  - Fix Windows Jump List result handling to treat `app.setJumpList()` returning `'ok'` as success instead of logging it as an error.
  - Degrade API credential migration to `electron-store` fallback when the OS credential manager returns known Windows resource/session errors, avoiding repeated startup error spam.

## [0.8.1] - 2026-03-19

- App shell:
  - Move carousel size-control persistence and empty-space context-menu routing out of `App.tsx` into `useAppShellCarouselControls.ts`.
  - Extract the shared pinned-category strip into `AppShellCategoryBar.tsx` so the top and bottom category rows no longer duplicate the same shell markup.
  - Extract the left-panel library surface into `AppShellLibraryView.tsx` so grid, list, carousel, coverflow, welcome handoff, and non-card context-menu capture no longer live inline in `App.tsx`.
  - Move category pinning, category counts, launcher derivation, and filtered-library sorting out of `App.tsx` into `useAppShellLibraryFilters.ts`.
  - Move active-game lookup and visible-library selection reconciliation out of `App.tsx` into `useAppShellSelection.ts`.
  - Move background artwork/video selection, animated fallback handling, blur optimization, and adjacent-art preloading out of `App.tsx` into `useAppShellBackgroundMedia.ts`.
  - Move hide/uninstall confirmation state into `useAppShellGameConfirmations.ts`, render the root confirmation stack through `AppShellConfirmationDialogs.tsx`, and move the large view/layout preference state cluster into `useAppShellViewState.ts` so `App.tsx` now acts mainly as the root shell orchestrator.
  - Update the app-shell runbook, architecture module index, and refactor roadmap to document the new shell component and hook boundaries.

## [0.8.0] - 2026-03-18

- Right click menu:
  - Reflow focused Games View, Dividers, and Game Details editors into two columns, shrink those focused overlays into smaller centered popups with more padding around the underlying section, split key controls into their own cards, remove stretched dead space in the focused cards, widen the unfocused menu so the full editor no longer feels squashed, restyle the top-row section buttons and Menu Transparency control to match the Flip View/Reset button treatment, keep the Menu Transparency label and slider visible instead of collapsing to the thumb icon, add a visible centered filled slider line with corrected thumb alignment, a larger lower-set slider logo thumb across all sliders, and stable reset-button spacing, improve helper-text readability, and replace plain `?` hover titles with themed hover-or-click tooltips when the menu is not in a focused section mode.

## [0.7.46] - 2026-03-18

- Updater:
  - Report alpha-channel update download progress from streamed bytes so the update modal progress bar advances during GitHub asset downloads instead of sitting still until completion.

## [0.7.45] - 2026-03-18

- Right click menu:
  - Continue splitting the popup into focused Games View, Dividers, and Game Details sections with section-based placement and a top-level menu transparency control, while still opening in a broader normal full editor layout first.
  - Make Games View overlay the game-details side, move Game Details to the opposite shell side, and keep Dividers snapped to the left in a fixed-width full-height editor with a divider-safe inset.

## [0.7.44] - 2026-03-18

- List view:
  - Strip HTML markup from description snippets in game cards so rich descriptions render as plain text previews instead of showing literal tags.
  - Keep the display-mode size controls tied to the active layout, so Boxart + Title uses boxart sizing, Logo + Title uses logo sizing, and Logo Only / Icon + Tile no longer show the old tile-height slider.
  - Replace the bright blue focused-card ring with a subtler selected-state treatment so the active row stays readable without a large outline box.
  - Make Logo + Title resize the full artwork frame instead of only the inner logo image, and restore the missing Logo Size and Tile Size sliders for Logo Only and Icon + Title display modes.

- Game details panel:
  - Buffer the next logo until it is ready when switching games so the right panel no longer flickers on logo swaps.
  - Keep the logo centered in the open space between the boxart and the panel edge while preserving the existing fallback title when no logo is available.
  - Animate the newly selected logo from a smaller start into the user-chosen size with a slower, more deliberate grow-in so the switch feels smooth without animating the surrounding text.
  - Let left-positioned boxart float beside the description so the text wraps underneath it instead of staying locked in a separate side column.
  - Mirror the right-side boxart overlay on the left edge and keep the description reserving wrap space beside it, so the boxart stays in the same vertical position while the text still flows under it.
  - Reduce the left-boxart wrap spacer to the actual portion of the cover that hangs into the content area so the description does not leave an oversized blank gap before widening underneath it.
  - Restore the adaptive wide-description layout for left-side boxart while clearing media sections around the cover so text can widen underneath it without screenshot collisions.
  - Keep left-side description screenshots in the normal left-floated section layout under the boxart instead of forcing the first media block into a full-width banner.
  - Make wide left-boxart descriptions mirror into a 60/40 text-left image-right section layout, while narrower descriptions now release the text underneath the boxart much earlier.
  - Store the right-panel logo, boxart, text, button, and transparency settings per view so grid, list, and logo can keep independent values.

## [0.7.43] - 2026-03-18

- Settings:
  - Replace the About tab's static logo with a smaller unboxed shared mouse-tracked Onyx cube and let clicking it open a larger interactive version.
  - Let the enlarged About logo be dragged and thrown across the full app window with bounce-and-friction physics until it comes to a stop.
- App shell:
  - Redesign the initial Welcome screen to match the updated Add Games onboarding style with a two-column hero, refreshed setup cards, and a glass-panel quick-tips section.
  - Reuse the same mouse-tracked spinning Onyx cube from Add Games on the Welcome screen so first-run onboarding shares the same branded motion treatment.
- Add Games:
  - Replace the initial importer empty state with a branded two-column onboarding layout, a launcher-source list, and a left sidebar that stays collapsed until scanning begins.
  - Replace the opener logo treatment with the same mouse-reactive 3D Onyx cube used on the website homepage, now reacting to mouse movement anywhere on screen, rendering as a closed cube without edge gaps, and showing the glowing ring on every face.
  - Tidy the onboarding hero alignment by centering the cube in the right-side space and keeping the copy block offset on the left.
  - Normalize staged artwork preview heights so boxart and icon no longer tower over the logo and banner slots after scan results load.
- Updater:
  - Show a download progress bar in the update modal while an app update is being downloaded.

## [0.7.42] - 2026-03-18

- Game details panel:
  - Align the right-side Details metadata column to the panel's right edge.
  - Add right-side padding inside the Details metadata scroller so values do not sit against the scrollbar.
  - Round displayed community, user, and critic scores to whole numbers.
  - Tighten the Details metadata spacing so labels sit closer to their values and the column uses less vertical space.
  - Rework wide Description sections so each image pairs with its nearest text block using a 60% floated media treatment, no-image sections stay full-width and left-aligned, overflow text continues underneath its image, and screenshots fill the available width while preserving their own aspect ratios.

## [0.7.41] - 2026-03-17

- App shell:
  - Move debounced shell preference persistence and restored active-game validation out of `App.tsx` into `useAppShellPreferencePersistence.ts`.
- Right-click menu:
  - Show background blur sliders as `0-100%` controls instead of pixel labels.
  - Make `Details View Transparency` behave as a true transparency control, with `0%` fully opaque and `100%` removing the right-panel tint and blur so the background shows through, while preserving existing saved preference values.
- Docs:
  - Update the app-shell and game-details-panel runbooks to document the right-click menu blur and transparency control semantics.
  - Update the app-shell runbook and refactor roadmap to track the new `App.tsx` shell-persistence extraction.

## [0.7.39] - 2026-03-17

- App shell:
  - Ask whether uninstalling a game should also remove it from the Onyx library, with a checkbox in the uninstall confirmation dialog.
  - Remove the update modal's guessed `New features` and `Fixed issues` changelog buckets so each version now shows the grouped headings exactly as written in `CHANGELOG.md`.
- Right-click menu:
  - Open Game Details and Carousel button-color controls in a dedicated popup picker so the menu stays less cluttered and the editor does not spill off-screen.
  - Remove the bright highlight around the button-color popup and show the full `Mod Manager` label inside the color picker.
  - Close the button-color popup when clicking away from it so the picker dismisses like a normal transient menu.
  - Add a `Fill Available Space` option for grid view so game cards can shrink to fit all visible rows or grow to reduce right-side gaps as the details panel width changes.

## [0.7.38] - 2026-03-17

- Workflow:
  - Require all committed changes to be recorded explicitly in `CHANGELOG.md` `Pending`, including maintainability refactors.
- `OnyxSettingsModal.tsx` was split into the following smaller files:
  - `SettingsLibrariesTab.tsx`
  - `SettingsAdvancedTab.tsx`
  - `SettingsLinksTab.tsx`
  - `SettingsScanningTab.tsx`
  - `SettingsSuspendTab.tsx`
  - `SettingsGeneralTab.tsx`
  - `SettingsAnimationsTab.tsx`
  - `useOnyxSettingsModalShellState.ts`
  - `useOnyxSettingsLibrarySources.ts`
  - `useOnyxSettingsModalPersistence.ts`
- `GamePropertiesPanel.tsx` was split into the following smaller files:
  - `GamePropertiesLinksTab.tsx`
  - `GamePropertiesModManagerTab.tsx`
  - `GamePropertiesMetadataTab.tsx`
  - `GamePropertiesImagesTab.tsx`
  - `GamePropertiesImageStrip.tsx`
  - `useGamePropertiesMetadata.ts`
  - `useGamePropertiesImages.ts`

## [0.7.37] - 2026-03-17

- Game details panel:
  - Fix install size formatting so the right panel converts stored byte values to GB correctly instead of overstating game sizes.
  - Hide malformed release dates instead of rendering `Invalid Date` in the metadata column.
  - Restore responsive fallback title sizing for games that do not have a logo image.

## [0.7.36] - 2026-03-16

- `OnyxSettingsModal.tsx` was split further into:
  - `SettingsIntegrationsTab.tsx`
  - `SettingsAboutTab.tsx`
- Game details panel:
  - Remove the redundant top-level `Description` and `Details` headings so the panel starts directly with content.
  - Keep the description and details content aligned below the visible logo instead of letting text climb into the logo area.
  - Make the details column drop below right-side boxart instead of narrowing until metadata becomes squashed.
  - Reserve left-side description inset only when left-positioned boxart would otherwise collide with the text column.
  - Clamp rendered boxart width to the available side-space so narrow layouts cannot let cover art spill across the divider and overlap metadata.
  - Move the default right-side boxart farther inward from the panel edge for a less pinned layout.
  - Keep logo and boxart clearance outside the scrollable regions so users cannot scroll into blank top padding or scroll description text under the logo.
  - Base logo clearance on the logo's effective rendered size after fanart-area caps, preventing extra dead space when the logo slider goes past the visible maximum.
  - Constrain the Game Details logo-size slider to the current visible maximum so it no longer exposes a dead range of non-functional values.
  - Show only the primary developer in the details column when providers return multiple branch or studio entries, while keeping the full list in the tooltip.
  - Tighten metadata spacing in the details column so more information fits without unnecessary vertical gaps.
  - Round the Description Width control display to whole percentages instead of long decimal values.

## [0.7.35] - 2026-03-16

- App shell maintainability:
  - Add a dedicated `docs/features/app-shell.md` runbook and make it first-class in the feature index/doc map so `App.tsx` has a clear source-of-truth owner document.
- `App.tsx` was split into the following smaller files:
  - `components/appShell/AppShellOverlays.tsx`
  - `components/appShell/StartupScanOverlay.tsx`
  - `components/FoundGamesModal.tsx`
  - `hooks/useAppShellEvents.ts`
  - `hooks/useAppPreferences.ts`
  - `hooks/useGameLaunchFlow.ts`
- App shell selection:
  - Keep the active game anchored to the currently visible filtered library set so switching games and changing filters cannot leave the shell stuck on a stale off-screen selection.
- App shell stability:
  - Stop `useAppPreferences.ts` from re-running full preference bootstrap after ordinary shell state changes, which was snapping view mode and other shell state back to the persisted preference unexpectedly.

## [0.7.34] - 2026-03-16

- `GameManager.tsx` was split further into:
  - `gameManager/useGameManagerMaintenance.ts`
  - `gameManager/useGameManagerMetadata.ts`
  - `gameManager/useGameManagerImageSearch.ts`
  - `gameManager/useGameManagerRefresh.ts`

## [0.7.33] - 2026-03-16

- `GameManager.tsx` was split further into:
  - `gameManager/GameManagerMetadataTab.tsx`
  - `gameManager/GameManagerLinksTab.tsx`
  - `gameManager/GameManagerModManagerTab.tsx`
  - `gameManager/LinkIconPickerDialog.tsx`
  - `gameManager/GameManagerRefreshConfirmDialog.tsx`
  - `gameManager/GameManagerRefreshProgressDialog.tsx`
  - `gameManager/GameManagerMaintenanceDialogs.tsx`

## [0.7.32] - 2026-03-16

- Lint cleanup:
  - Stabilize several renderer hook/effect dependencies in the app shell, update flow, and library view components so the lightweight ESLint rules can tighten without introducing stale closures.
- `GameManager.tsx` was split further into image-search helper modules for:
  - provider URL resolution
  - image-result ordering and filtering
  - image-count aggregation
  - provider-progress event mapping
- Documentation:
  - Add dedicated `Game Manager` and `Add Games` feature runbooks so the two largest per-game editing surfaces have stable entry-point docs instead of only being described indirectly through overlapping feature pages.
- `GameManager.tsx` was split further into:
  - `gameManager/ProviderStatusRow.tsx`
  - `gameManager/GameArtworkStrip.tsx`
  - `gameManager/FastSearchResultsList.tsx`
  - `gameManager/ImageSearchResultsSections.tsx`
  - `gameManager/GameManagerImagesTab.tsx`

## [0.7.31] - 2026-03-16

- Release tooling:
  - Rename the ESM-based `increment-build` and `generate-icons` scripts to `.mjs` so local version bumps and packaging no longer trigger Node's typeless-module reparsing warning.

## [0.7.30] - 2026-03-16

- Tooling:
  - Add a project-wide `npm run lint` command backed by a flat ESLint config for React hooks, duplicate imports, and common TypeScript hygiene checks, with targeted overrides for legacy-heavy hotspots.
- Build config:
  - Rename the Vite and Vitest config files to ESM-native `.mts` variants so the toolchain no longer relies on the CJS config loading path.
- Import scanning:
  - Replace the large source-scanner dispatch chain in `ImportService` with shared scanner-selection helpers so adding new launchers is less error-prone.

## [0.7.29] - 2026-03-16

- Startup flow:
  - Move renderer-ready/update-gating startup orchestration into `main/startupCoordinator.ts` so `main.ts` is slimmer and the startup handshake is covered by focused tests.
- IPC contract:
  - Make `main/preload.ts` the single source of truth for the `electronAPI` bridge type and switch the renderer to the canonical `notifyAppReady()` handshake.
- Renderer performance:
  - Lazy-load heavy secondary UI flows such as Settings, Importer, Game Manager, Metadata Search, Bug Report, Welcome, Carousel, and Cover Flow, and add manual Vite vendor chunking to reduce first-load pressure.
- Tests:
  - Add smoke coverage for the preload bridge, startup coordinator, and app shell startup/render path.
- Build tooling:
  - Move icon validation to `scripts/validate-icons.mjs` to avoid the module-format warning emitted during builds.

## [0.7.28] - 2026-03-16

- Startup/update flow:
  - Initialize the packaged updater before the renderer starts the startup sequence so the first startup update check reliably reports status instead of racing the updater setup.
- Startup scan flow:
  - Route startup-originated scan progress and newly found games through the startup overlay only, while recurring background scans stop emitting startup progress UI events.
- Cache cleanup:
  - Clear stale `onyx-local://` alternative banner, icon, and screenshot references during startup cleanup, while preserving valid cached artwork URLs that include transient query strings.

## [0.7.27] - 2026-03-16

- Update modal:
  - Simplify the update header, lower the update icon to avoid clipping, group changelog bullets by version, split release notes into `New features` and `Fixed issues`, and make the dev-only `Open Update Found` preview load the latest three changelog entries instead of guessing the next patch.
- Update flow:
  - Pause recurring background library scanning while the update modal is open so update prompts do not compete with auto-scan activity.

## [0.7.26] - 2026-03-16

- Add Games:
  - Image edits made during import review now persist into the library correctly, including banner/background selections that need linked hero/background fields updated.
  - Import now carries staged launch arguments, screenshots, and launcher-specific launch fields into the final library record instead of dropping them during the staged-to-library conversion.
- Maintenance:
  - Remove redundant tracked website snapshot files, unused menu-bar patch scripts, and an unused importer image-search modal to keep the repo leaner.
- Tests:
  - Stabilize GameStore artwork persistence coverage by mocking the active Electron store shim and clarifying onyx-local cache-buster expectations during startup cleanup.
  - Eliminate the Game Manager accessibility test's React `act(...)` warning by waiting for async startup effects before asserting the view-toggle controls.

## [0.7.25] - 2026-03-16

- Right-click menu:
  - Library appearance/settings context menu now opens away from the nearest horizontal edge (left half opens right; right half opens left) and clamps to viewport bounds to prevent squashing when opened near screen edges.

## [0.7.24] - 2026-03-16

- Metadata:
  - Steam-backed game descriptions now prefer the Steam Store `about_the_game` field so the game details panel shows the richer About the Game content after metadata refresh.
  - Explicit per-game metadata updates now bypass the in-memory metadata cache, and direct Steam description fetches normalize `steam-` IDs correctly so refreshed descriptions are less likely to stay stale.
- Game details panel:
  - The description/details row now expands to fill the available vertical space in the panel instead of leaving unused space below long descriptions.
  - Hide the always-visible vertical divider between the description and details columns while keeping the resize handle behavior.
  - Constrain rich HTML descriptions to the description column width so embedded store media and long text no longer overflow the panel layout.
  - Description media now adapts to available box size, scaling images/videos down and switching to a side-by-text layout when the description area is wide and tall enough.
  - In side-by-text description mode, media blocks now alternate left and right for a cleaner reading flow.
  - Description HTML is now grouped into section rows so headings and body text stay paired with their nearest image/media while alternating left/right by section.
  - Section alternation is now media-aware across different games; text-only sections remain full-width and do not disrupt left/right alternation.
  - Side-layout media now auto-sizes per section based on nearby text amount to reduce oversized images and blank vertical gaps.
  - Resizable bottom action bar (Edit / Play / links).
  - Drag the top edge of the bar to change its height; contents scale with the bar and the setting is persisted.
- Docs:
  - Enforce strict markdown linking rules across all repository documentation to ensure all code references (files, services, components) are hyperlinked to their source.

## [0.7.22] - 2026-03-15

- Library view:
  - Keep “Show Categories” inside the games list only when categories are off or at bottom, add top padding (pt-4) to the game details panel so the games list and game details content tops align.
- Docs:
  - Restructure main view into component docs (Menu Bar, Game Details Panel, Games List) and view-type docs (Grid, List, Logo, Carousel, Coverflow), each with unique features; remove games-view-and-details.md; update doc-map and README.
- Tests:
  - Fix `test:suspend:service-mock` — fake runner now rejects native NtSuspendProcess/NtResumeProcess calls (Method 1) so the cmdlet fallback path (`Suspend-Process`/`Resume-Process`) is exercised correctly.
- Tests/Build:
  - Fix `test:credentials:service-mock` — `electronStoreShim` no longer crashes outside Electron by guarding `app.getPath` with a try/catch and falling back to `os.tmpdir()`; test seeds credentials directly to the shim-resolved path instead of using a separate `electron-store` instance at a different location; add `clear()` method to shim.

## [0.7.21] - 2026-03-15

- Game Manager / Images tab:
  - Skip Auto-Match re-identification for known-game image requests (`gameId`/`steamAppId`/`igdbId`) and go directly to provider fetches.
  - Overlap RAWG provider fetch with IGDB work to reduce serialized wait time before additional image results appear.
  - Stream provider results immediately as batches arrive, without waiting for all providers to complete.
  - Keep progressive image results in append/discovery order with cross-batch dedupe so late provider results do not jump ahead in the list.
  - Render `All` sections from one merged ordered stream so cross-provider discovery order remains stable across Box Art/Logo/Banner/Icon sections.
- Game Manager / Images tab manual search:
  - Keep per-type result batches in append/discovery order (remove score-based resorting and front-insertion that could make results jump).
  - Make `metadata:searchImages` return fast SteamGridDB batches without extra metadata fallback blocking.
- Game Manager header:
  - Rename `Optimizer Report` to `Image Optimizer Report`, align the button styling with other header actions, and rename `Remove Deleted` action label to `Remove Games`.

## [0.7.20] - 2026-03-15

- Game Manager / Images tab:
  - Keep users on the Images tab after selecting artwork and update the top preview strip immediately.
  - Reuse already-loaded image results when clicking top image slots instead of re-running a full provider scan.
- Docs/Agent:
  - Move `agents.md` to project root (alongside `CHANGELOG.md`/[`package.json`](./package.json)) so it is always loaded by AI tooling; update [`doc-map.json`](.agent/docs/doc-map.json) and `structure.md` references accordingly.

## [0.7.19] - 2026-03-15

- Build/CI:
  - Remove pnpm usage from Windows release workflow and drop `pnpm-lock.yaml` so electron-builder no longer calls `pnpm config list` in an npm-configured project.

## [0.7.18] - 2026-03-15

- Docs:
  - Align contributor and README setup guidance with npm-based project workflows (`npm ci`) and update IGDB OAuth redirect guidance to `http://localhost:5173`.
  - Add GiantBomb API credential documentation in README and `.env.example`, including current availability note.
- CI/Workflow:
  - Normalize branch trigger coverage across build and test workflows, and remove stale docs mapping references.

## [0.7.17] - 2026-03-15

- Docs governance:
  - Added structure-first documentation guardrails with automated sync/check scripts, pre-commit enforcement, and CI validation.
- Project docs organization:
  - Slimmed agent workflow guide, split operational/reference docs under `.agent/docs`, and moved contributor/security/code-of-conduct docs into `.github` with updated links.
- IGDB reliability:
  - Fixed `axiosShim` URL joining so IGDB requests preserve the `/v4` base path (preventing invalid auth errors caused by wrong endpoint routing).

## [0.7.16] - 2026-03-12

- UX:
  - Disable automatic "start hidden" behavior from preferences; only an explicit `--hidden` launch flag may start the app hidden to avoid invisible, non-interactive sessions.
  - Prevent fully hidden startup when the system tray icon is disabled; "start hidden" now always means "start in tray", never invisible.
- Alpha:
  - Version bump only to trigger a fresh alpha build with the latest CI verifier behavior.

## [0.7.15] - 2026-03-12

- CI:
  - Update GitHub Actions Node.js version to 24 for build and release workflow.
- Build:
  - Treat optimizer Sharp runtime modules as optional unpacked dependencies in verifier (warn instead of failing CI when packed inside app.asar).

## [0.7.14] - 2026-03-12

- CI:
  - Include optimizer runtime dependencies (sharp, detect-libc, @img, semver) in packaged output for verification script.

## [0.7.13] - 2026-03-12

- CI:
  - Ensure pnpm is always available for electron-builder by installing it globally on Windows runners.

## [0.7.12] - 2026-03-12

- CI:
  - Use Corepack-managed pnpm for electron-builder and keep branch-based alpha/production build profiles.

## [0.7.11] - 2026-03-10

- Security:
  - Fix high severity XSS vulnerability in game descriptions and command injection in launcher service.
- Accessibility:
  - Improve screen reader support by adding dynamic ARIA labels to BottomBar, modal close buttons, Carousel, ConfirmationDialog, and RightClickMenu toggles.
- Performance:
  - Add native browser lazy loading to images, CSS content-visibility to list views, and optimize React rendering with `memo` and stabilized callbacks in library views.

## [0.7.10] - 2026-03-04

- Game Manager image search:
  - Normalize and validate provider image URLs across regular and fast-search flows to reject malformed links before rendering.
- Game Manager images tab:
  - Track failed artwork URLs and suppress repeat rendering/retries so broken logo/icon/banner tiles stop reappearing.
- Game Manager provider counters and filters:
  - Count only renderable image results for more accurate per-provider totals after URL validation.

## [0.7.9] - 2026-03-04

- System tray menu:
  - Remove extra bottom gap below Exit by fitting the custom Windows tray menu height to rendered content.

## [0.7.8] - 2026-03-04

- Update modal changelog readability:
  - Reformat “What’s Changed” and “Included Versions” into structured multi-line bullets and show full per-version entries instead of condensed “+x more” summaries.
- Game Manager metadata refresh:
  - Add a Cancel action to the refresh progress modal so Missing Images/Links refresh can be stopped mid-run with clean cancellation handling.

## [0.7.7] - 2026-03-04

- Onboarding / Manual folders:
  - Added icon preset selection to the “Games in other folders?” step so folder icons can be set during setup like in Settings.
- Game Manager metadata:
  - Normalize and render the Source field with launcher-style display naming/icons (for example, show “Rockstar Games” consistently instead of raw source IDs).
- Game Manager / Manage Metadata:
  - Fix action behavior so Nuclear auto-starts a fresh Add Games scan after clearing library+cache, Images only refreshes missing images in-place (no full nuke), Links only refreshes links in-place with IGDB credential requirement messaging, and remove the unused WebP-only option.

## [0.7.6] - 2026-03-04

- Update UX:
  - Keep update modal actions pinned to the bottom, keep the update icon animating during downloaded state, and align button ordering for available/downloaded flows.
- Dev tooling + onboarding:
  - Add a dev-only navbar menu with actions to open update/onboarding flows, including force-open and close controls for initial onboarding.
- Launcher UI polish:
  - Use the new launcher icon set consistently across Settings, Navbar, and Add Games list with improved dark-theme contrast and sizing.
- Game details and manager:
  - Normalize launcher/platform labels (including Ubisoft/Rockstar), show launcher icons consistently, and keep details links in icon-bar mode with hidden/default links in overflow.
- Manual folders:
  - Add SVG icon preset assignment with allsvgicons guidance, keep edit rows collapsed by default, and apply selected folder icons across library/game surfaces.
- Game Manager image search:
  - Validate remote provider URLs before emitting results so expired or blocked artwork links are filtered out instead of rendering as broken tiles.

## [0.7.5] - 2026-03-04

- Coverflow:
  - Fix broken reflection rendering when box art is a `.webm` by mirroring video artwork correctly instead of using a broken image fallback.

## [0.7.4] - 2026-03-04

- Update modal:
  - Remove markdown-style `##/###` heading tokens from changelog display and render clean plain-text section titles.
  - Expand `Included Versions` with short per-version change summaries instead of listing versions only.
- Workflow docs:
  - Add `Push app live` shortcut alias to run Push to git → Force to Alpha → Force to Main in sequence.

## [0.7.3] - 2026-03-04

- Updates:
  - Sanitize updater error text and reject HTML-like payloads so About > Check for Updates no longer shows raw red HTML/CSS blobs.
- Changelog fetch:
  - Validate remote `CHANGELOG.md` content and ignore non-markdown responses before falling back to release/local sources.
- Image search:
  - Exclude animated assets (including APNG-like metadata cases) from search results across SteamGridDB/manual search and renderer filtering.

## [0.7.2] - 2026-03-04

- Release test:
  - Ship a follow-up update so users on `0.7.1` can verify the new clean-format in-app update changelog rendering path.

## [0.7.1] - 2026-03-04

- Updates modal:
  - Render update changelog content in a clean release-note style (`Onyx vX.Y.Z` + `What's Changed`) when changelog bullets are available.
- Release tooling:
  - Add changelog-driven release-note generation scripts for alpha and main workflows to produce consistent GitHub release bodies.

## [0.7.0] - 2026-03-04

- Game Manager / uploads:
  - Block animated PNG (APNG) local uploads with a clear error, and route regular image browsing through cache validation so rejected files are not saved.
- Game Details links:
  - Force icon-bar rendering in details view so Link Management visibility is respected (visible links on bar, hidden-by-default links in overflow/up-arrow menu).

## [0.6.34] - 2026-03-03

- Library performance:
  - Prefetch game artwork on hover/focus in grid and list views to reduce first-open image delays.
- Carousel/Coverflow performance:
  - Warm selected and nearby game artwork so next/previous navigation displays images faster.
- Asset loading:
  - Add a shared deduplicated renderer prefetch utility for images and `.webm` metadata warming.

## [0.6.33] - 2026-03-03

- Animation settings:
  - Fix `.webm` pause enforcement so `Disable all animations` and per-category toggles reliably pause animated media and hold first frame when disabled.
- Animation categories:
  - Separate banner behavior so `Disable animated banners` controls the top Game Details banner, and rename background toggle to `Disable animated alt banners` for alternative background targeting only.
- Settings behavior:
  - Remove the `Show Links as Icons` setting from the Settings UI and automatically disable `Update Libraries on Startup` after `Remove All Games` is executed.

## [0.6.32] - 2026-03-03

- WEBM video playback:
  - Add app-wide support for `.webm` video assets throughout Game Manager, library views (list/carousel/coverflow), and details panel with proper `<video>` rendering and IPC/CSP fixes.
- Add Games / Onboarding:
  - Remove `Prefer Animated Box Art` and `Prefer Animated Banners` UI toggles and deprecate their preference keys.
- Animation behavior:
  - Pause `.webm` videos when right-click menus or settings overlays are open, while keeping them visible.
- Security:
  - Centralize external URL protocol validation with a shared whitelist for IPC and launcher flows.
- Accessibility:
  - Add ARIA labels and focus improvements to MenuBar, GameManager view toggles, TopBar, and related UI.
- Performance:
  - Optimize GameCard rendering, game filtering allocations, library carousel windowing, and animated image optimization defaults.
- Game Manager:
  - Rework Images tab search to fan out across Steam Store, SteamGridDB, IGDB, RAWG, and show per-provider status with filtering and counts.
- Animations:
  - Add dedicated animation settings tab, global kill-switch, and pause animated backgrounds when overlays are open to reduce CPU usage.

## [0.6.31] - 2026-03-03

- Crash reporting:
  - Generate human-readable `report.txt` files for native process crashes.
  - Capture unhandled JavaScript exceptions into text logs instead of silent failing.

## [0.6.30] - 2026-03-02

- Game Manager:
  - Fix image flicker when switching games by stabilizing background/details image swap behavior and preventing animation restarts.
  - Auto-load missing image tabs on tab switch and prefetch other image types after a search.
  - Add local animated/static filter toggles with improved provider-by-provider search progress feedback.
- UI:
  - Move optimizer report action to the Game Manager header, remove it from the main navbar, and align category button sizing.
- Navbar:
  - Hide stale pinned categories (for example `Demo`) when that category has no current games.

## [0.6.29] - 2026-03-02

- Optimization (Alpha):
  - Use the local-working animated WebP fallback strategy by prioritizing Sharp recompression before FFmpeg when worker optimization is insufficient.
- Optimization (Animated WebP):
  - Remove restrictive Sharp pixel/output guards for fallback and add aggressive Sharp recompress fallback for oversized files.

## [0.6.28] - 2026-03-02

- Optimization (Alpha):
  - Fix animated FFmpeg fallback filtergraph by replacing malformed `scale=min(...,iw):-2` expression with a safe `force_original_aspect_ratio=decrease` scale filter.
- Optimization diagnostics:
  - Preserve FFmpeg args/exit telemetry so future filter/codec failures are directly visible in exported logs.

## [0.6.27] - 2026-03-02

- Optimization diagnostics:
  - Add startup preflight and runtime probes for worker path/availability and sharp dependency resolution chain (`sharp`, `semver`, `detect-libc`, platform `@img` package).
- Optimization telemetry:
  - Expand per-stage attempt reporting with duration, failure category, and FFmpeg execution diagnostics (args, exit code, timeout, stderr tail, output existence).
- Optimization report:
  - Upgrade log export to `reportVersion: 3` with improved decision classification, per-stage timings, and failure-category digest.
- Packaging/CI:
  - Unpack `semver` for packaged worker runtime and add packaged artifact verifier to fail builds when optimizer runtime dependencies are missing.

## [0.6.26] - 2026-03-02

- Packaging:
  - Unpack `detect-libc` and `@img` sharp runtime modules so packaged optimizer workers can resolve sharp dependency chain.
- Optimization (Alpha/Release):
  - Fix worker fallback path that kept originals when sharp dependency resolution failed in packaged builds.

## [0.6.25] - 2026-03-02

- CI:
  - Harden workflow dependency installs with npm fetch retry settings and retry/backoff loops to reduce transient network TLS/download failures.

## [0.6.24] - 2026-03-02

- Packaging:
  - Move `sharp` to runtime dependencies so packaged Alpha/Release builds can load optimizer worker image processing modules.
- Optimization diagnostics:
  - Preserve per-stage attempt telemetry in exported reports to confirm packaged runtime behavior.

## [0.6.23] - 2026-03-02

- Optimization report:
  - Add per-image stage telemetry (`decisionReason`, worker/ffmpeg/sharp attempt summary) so diagnostics can explain why originals were kept.
- Build:
  - Restore `openGameUninstaller` preload/renderer typing and `Game.launchArgs` renderer typing to keep production build/typecheck green.

## [0.6.22] - 2026-03-02

- Optimization report:
  - Upgrade exported diagnostics log to `reportVersion: 2` with summary metrics, per-job decision labels, cache/error digest, and environment snapshot.
  - Include worker/FFmpeg diagnostics payload when available and keep an explicit note when those diagnostics are missing.

## [0.6.21] - 2026-03-02

- Build:
  - Fix `MenuBar` prop mismatch in [`App.tsx`](./renderer/src/App.tsx) by removing stale development-only props, resolving TypeScript build failure on CI.

## [0.6.20] - 2026-03-02

- Optimization report:
  - Add `Download logs` action in the background image optimization modal so diagnostic export is available in packaged builds.
- Optimization diagnostics:
  - Expose runtime diagnostics IPC and app profile wiring for build/debug visibility in optimization troubleshooting.
- Update modal:
  - Constrain height and allow scrolling to keep changelog content accessible on smaller windows.

## [0.6.11] - 2026-03-01

- Optimization:
  - `Optimize animated images` now forces animated WebP processing for all `.webp` files in this mode.
- Optimization UI:
  - Forced animated WebP mode now reports completion instead of skip/fail for no-gain outcomes after optimization attempts.
- IPC/API:
  - Added `forceAnimatedWebp` option wiring for image cache optimization between renderer, preload, and main IPC handler.

## [0.6.10] - 2026-03-01

- Optimization:
  - Fixed Alpha hangs by replacing blocking oversized WebP FFmpeg sweep calls with non-blocking async execution.
  - Added strict attempt/time limits to aggressive oversized WebP fallback passes to keep the app responsive.

## [0.6.9] - 2026-03-01

- Optimization:
  - Added aggressive FFmpeg fallback sweeps (fps/scale/quality) for oversized animated WebP files in `Optimize animated images`.
  - Forced oversized WebP processing now picks the best result across aggressive Sharp and FFmpeg passes.

## [0.6.8] - 2026-03-01

- Optimization:
  - For `Optimize animated images`, oversized WebP files now use an aggressive re-encode pass instead of being skipped as no-gain.
- Optimization UI:
  - Completed entries now show actual skip/fail reason text instead of a generic `cached (skipped)` label.

## [0.6.7] - 2026-03-01

- Optimization UI:
  - Fixed cache optimization status mapping so skipped items no longer appear as processing.
  - Published runtime worker/profile/CPU metrics during cache optimization so the top runtime panel is populated.

## [0.6.6] - 2026-03-01

- Manage Metadata:
  - Added `Optimize animated images` action to open the optimizer and run WebP-only optimization.
- Optimization:
  - WebP-only optimization now force-processes files above 15MB instead of skipping oversized files.
- UI:
  - Renamed `Game Importer` to `Add Games` across menu and importer surfaces.

## [0.6.5] - 2026-03-01

- Release pipeline:
  - Use the matching `CHANGELOG.md` version section as GitHub release notes body instead of a fixed notice block.
- Website (mobile):
  - Use a `Send Link` CTA in the header and keep desktop header CTA as `Download`.
  - Hide mouse-follow hero cube and disable custom cursor on touch/coarse pointers.

## [0.6.4] - 2026-03-01

- Startup:
  - Pause automatic library scan when an update prompt is active; resume only after dismiss/download completion to avoid launch stutter.
- Website:
  - Improve hero CTA flow for mobile users (no direct mobile download CTA; add send-link behavior and quicker value messaging).
  - Improve navigation dropdown readability with a less transparent desktop dropdown panel.

## [0.6.3] - 2026-02-28

- Fix:
  - Ensure release builds optimize WebP images identically to dev (robust fallback: worker → ffmpeg → sharp → original)
  - Bundle ffmpeg-static and update packaging config for release runtime parity
  - Patch fallback logic for animated WebP optimization (no more skipped/failed optimizations in packaged builds)

## [0.6.2] - 2026-02-28

- Storage:
  - Isolate API credential keychain entries by build profile (dev/alpha/production) with legacy fallback reads.
- Cache:
  - Use the active [`ImageCacheService`](./main/ImageCacheService.ts) directory in `onyx-local` protocol resolution to avoid wrong-folder 404s.
- Test:
  - Add missing test dependencies so `vitest` runs without interactive install prompts.

## [0.6.1] - 2026-02-28

- Optimization:
  - Reprocess cached image files during "Optimize all game images" instead of skipping `onyx-local` references.
  - Apply fast animated WebP worker settings (`quality 80`, `effort 0`, resized by image type) across optimize flows.
  - Fix cache re-opt path to avoid deleting source files before read and improve terminal job status reporting.

## [0.6.0] - 2026-02-28

- Release:
  - The optimized update.
- Optimization:
  - Prevent duplicate image-job records from keeping stale queued items and making progress appear stuck after import.

## [0.5.13] - 2026-02-28

- Crash report modal:
  - Note that reports are only saved when the app crashes, not when it stops responding and is closed.
- Image cache:
  - Document single-folder storage (no separate pre-import path); limitInputPixels for animated WebP; skip files over 15MB in optimize existing to avoid hang.

## [0.5.12] - 2026-02-28

- Crash reporting:
  - Crash dumps enabled in all builds; on next launch after a crash, option to save the report, open folder, or dismiss.
- Optimization:
  - Hardened image pipeline (limitInputPixels, worker fallback after repeated exits, queue try/catch).

## [0.5.11] - 2026-02-28

- Manage Metadata:
  - Unified NUCLEAR / Images only / Links only / Optimizer; NUCLEAR clears library and opens importer; all options require confirmation; refresh flows run in importer.
- Onboarding:
  - Manual folders from Settings → Libraries shown on "Games in other folders?"; add/remove/category changes sync to Settings immediately (onboarding is source of truth).
  - "Start scan" opens importer and starts scan; existing manual folders persist when removing in onboarding.

## [0.5.10] - 2026-02-28

- Optimization:
  - Debug logging (local dev) and crash-capture script; single-game queue cap to reduce native crash risk.
  - ONYX_FORCE_OPTIMIZE env to auto-start image optimization on launch for testing.

## [0.5.9] - 2026-02-28

- Docs:
  - Guideline for commit messages that land on main (keep wording neutral for production history).

## [0.5.8] - 2026-02-28

- UI:
  - Moved alpha badge, bug report, and console buttons to top right of navbar; tray tooltip shows branch (Onyx Dev / Onyx Alpha / Onyx).
- Update:
  - Changelog in update modal shows only version-to-version changes and strips GPL/legal notices; modal and changelog box constrained so they stay on screen.

## [0.5.7] - 2026-02-28

- Importer:
  - Fixed static/animated optimization barrier sequencing to prevent optimizer lockups during large queue runs.
- Game Manager:
  - Restored "Optimize all game images" action in Manage Metadata for testing and operational use.
- Optimization UI:
  - Improved skipped/cache-hit completion visibility and runtime barrier diagnostics.

## [0.5.6] - 2026-02-27

- Update:
  - Prefer branch `CHANGELOG.md` sources before tag refs so the update modal shows actual changelog entries for version ranges.

## [0.5.5] - 2026-02-27

- Onboarding:
  - Compacted Overview layout, improved API key-entry actions, and clarified scan/optimization messaging.
- Optimization:
  - Improved existing cache optimization concurrency handling and performance profile usage during runs.

## [0.5.4] - 2026-02-27

- Update:
  - Prioritized `CHANGELOG.md` content over GitHub release body text so the update modal shows real changelog entries.

## [0.5.3] - 2026-02-27

- CI:
  - Added missing `fast-check` dev dependency required by property-based tests.
- Test:
  - Added explicit callback parameter typing in `GameDetailsPanel` tests to fix TypeScript `implicit any` errors.

## [0.5.2] - 2026-02-27

- Optimization:
  - Restored unified optimization IPC bridge so status is visible in the renderer.
  - Added performance profiles and onboarding/settings controls for image optimization CPU usage.
- UI:
  - Improved background optimization progress details and source file type visibility.

## [0.5.1] - 2026-02-26

- Settings:
  - Added the Nyrna credit link at the bottom of Suspend/Resume (Experimental).
- Release:
  - Version bump to 0.5.1.

## [0.5.0] - 2026-02-26

- Suspend/Resume:
  - Added dedicated Settings tab and improved launch tracking for launcher/protocol games.
- About:
  - Updated credit line to link Nyrna directly from the About section.
- Release:
  - Version bump to 0.5.0.

## [0.4.8] - 2026-02-26

- Licensing:
  - Switched project license from MIT to GPL-3.0-or-later.
- Docs:
  - Updated README badge/text and added a license decision matrix document.
- Metadata:
  - Updated package license field to `GPL-3.0-or-later`.

## [0.4.7] - 2026-02-26

- Bug Fix:
  - Ensured startup sequence always runs via renderer `app:ready` signal plus main-process fallback timer.
  - Restored reliable execution of `Update Libraries on Startup` and `Check for Updates on Startup` preferences.

## [0.4.6] - 2026-02-26

- Bug Fix:
  - Fixed AppUpdateService coordination race condition causing `updateLibrariesOnStartup` to hang waiting for update checks.

## [0.4.5] - 2026-02-26

- Performance:
  - Optimized startup sequence with immediate update checks and parallel library scans.
- UI:
  - Improved "Start Minimized" behavior on Windows to ensure the app stays in the tray when configured.
- Importer:
  - Redirected one-click scans to the full Game Importer workbench for enhanced editing capabilities.
  - Automatic background scans now open the Game Importer when new games are detected.

## [0.4.4] - 2026-02-25

- Fix:
  - Expanded onyx-local protocol support for .ico and .avif.
- Internal:
  - Standardized ESM loading via dynamicImport helper.
- Security:
  - Case-insensitive path validation for Windows protocol handler.
- Test:
  - Added vitest-based unit tests for core services.

## [0.4.3] - 2026-02-25

- Cleanup:
  - Removed unused variables in LibraryListView and OnyxSettingsModal.
- Performance:
  - Switched ImageCacheService file operations to async I/O.

## [0.4.2] - 2026-02-25

- Security:
  - Fix path traversal vulnerability in onyx-local protocol handler.
  - Restrict file execution in app:openPath IPC handler to trusted directories.
- Test:
  - Add comprehensive GameMatcher unit tests using vitest.
- Fix:
  - Exclude test files from production TypeScript build.
- UI:
  - Performance improvements to LibraryGrid and SortableGameCard components.

## [0.4.1] - 2026-02-24

- Feature:
  - Added alternative background options to Carousel and Cover Flow views.
  - Added background blur amount slider to Cover Flow view settings.
- Fix:
  - Improved game removal logic with a new confirmation dialog for missing games.

## [0.4.0] - 2026-02-23

- "**The Animated Update**"
- Feature:
  - Added animated image preferences (boxart and banners) globally and to the onboarding screens.
  - SteamGridDB sorting strictly enforces animated preferences.
- Polish:
  - Fixed animation stuttering in the Game Details panel background.

## [0.3.54] - 2026-02-23

- UI:
  - Fixed custom import dialog not refreshing settings to reflect imported preferences until next app restart.
  - Improved custom defaults import preview layout with side-by-side section display and grid-based conflict options.
  - Added currentResolution property to UserPreferences type to track resolution-aware preferences across sessions.

## [0.3.53] - 2026-02-23

- UI:
  - Refined right-click menu with compact top action controls and cleaner view/header spacing.
  - Standardized slider controls across menu contexts with in-title current values and per-slider reset actions.
  - Improved button color editors to use a compact single-row layout and streamlined color chips.

## [0.3.52] - 2026-02-23

- UI:
  - Set default game logo size to 100px across all views (Grid, List, Logo, Carousel, Right Panel).
  - Updated various component fallbacks and preference defaults to maintain consistent 100px sizing for new games.

## [0.3.51] - 2026-02-23

- Importer:
  - Replaced slow Steam HTML scraping search (20+ API calls per game, 20-30s) with fast storesearch API (~200ms per game).
  - IGDB now only used as artwork fallback when Steam and SteamGridDB don't produce boxArt; still used for links/descriptions.
  - Added 15s timeout to IGDB description/link calls to prevent indefinite hangs.
  - Reduced metadata retry count from 3 to 1 to prevent timeout multiplication.
  - Relaxed "ready" criteria to boxArt-only (banner and description no longer required).
  - Added variant title search for non-Steam games (handles CamelCase/space mismatches like "CloverPit" vs "Clover Pit").

## [0.3.50] - 2026-02-23

- Importer:
  - Fixed bug where cancelling the importer confirmation dialog would not cancel background game scan requests.
  - Fixed game matching issue where titles identified correctly could be bypassed by an inaccurate zero-confidence match.
  - Fixed bug where Xbox applications (with Windows App IDs) would incorrectly pass their App IDs to IGDB breaking the metadata matching for games like "FINAL FANTASY".

## [0.3.49] - 2026-02-23

- Documentation:
  - Updated setup instructions for IGDB API to include the required OAuth Redirect URL (http://localhost).
- UI:
  - Added IGDB redirect URL registration steps to the Integrations tab in Settings and the initial Welcome flow.
- Importer:
  - Improved game identification and metadata fetching for "afop" (Avatar: Frontiers of Pandora) and other mapped titles.
  - Centralized title normalization to ensure consistent game matching across all metadata providers.

## [0.3.48] - 2026-02-23

- Importer:
  - Fixed game title cleaning (e.g., mapping "AFOP" to "Avatar: Frontiers of Pandora™") to display official names instantly.
  - Simplified discovery progress to show actual games found instead of raw scanner counts.
  - Fixed duplicate detection to prevent skipping valid games when local path data is missing.
  - Added an "Identifying" pass to update game titles faster during scans.
- Fix:
  - Resolved metadata validation bugs that caused official titles to be discarded.

## [0.3.47] - 2026-02-21

- Security:
  - Added API credential validation check for IGDB, RAWG, SteamGridDB, and Giant Bomb before starting a scan in the importer.
- Fix:
  - Resolved issue with game banners and background images not updating correctly when changed in the Game Manager.
- Importer:
  - Reset importer state after successful import for a clean start next session.

## [0.3.46] - 2026-02-21

- Game Importer:
  - Allow switching tabs (Metadata, Images, Links, Mod Manager) and viewing discovered content while a scan is in progress.
  - Selectively disable only interactive inputs and action buttons during scan to prevent race conditions while keeping the UI responsive for viewing.

## [0.3.45] - 2026-02-21

- Game Importer:
  - Disable editing (metadata, images, Save) while scan is in progress; show notification explaining why to avoid app hang.

## [0.3.44] - 2026-02-21

- Welcome:
  - New Overview step after “Games in other folders” with checklist of APIs and custom folders; “Next” opens overview, “Start scan” runs from there.
  - Overview shows “Good to go” for added APIs; missing APIs get inline key input and Save; Giant Bomb shows “Currently Unavailable” overlay.
  - Ready to scan section improved (icon animation, copy, layout); metadata services refresh when API credentials are saved so Start scan uses all added APIs.
- Importer:
  - Full metadata (artwork, icons, logos, links) from all configured APIs; links saved with games.

## [0.3.43] - 2026-02-21

- Security:
  - Removed test script that contained hardcoded credentials (fixes secret scan).

## [0.3.42] - 2026-02-21

- Game details:
  - Up-arrow “more links” popover is now top-level (portaled) so it no longer clips; Link Management context menu footer text is easier to read.
- Link bar and Settings:
  - Link order and visibility from Link Management are the source of truth; up-arrow shows titles and icons; right-click shows all links and “fix wrong URL” note.

## [0.3.41] - 2026-02-20

- Game details:
  - Link icons are now packaged locally (Simple Icons); no CDN dependency. Icons are centered in their badges.
  - By default only Official Website, YouTube, Subreddit, and Discord are shown; other link types are hidden until enabled in Link Management.
- Settings:
  - New "Link Management" page to set default visibility and order of link types (Official Website, YouTube, Steam, etc.).
- Game Manager:
  - "Refresh Metadata" renamed to "Manage Metadata" with options: Refresh all metadata (nuclear), Search for missing images only, Refresh all Links (nuke and re-fetch from IGDB).
- Game Manager Links tab:
  - Icons shown next to each link; click icon to search for or upload a custom SVG.

## [0.3.40] - 2026-02-21

- Game Importer:
  - Enhanced Battle.net game detection with Windows Registry fallback.
  - Battle.net games are now auto-detected even if the launcher is not explicitly configured/enabled.
- Bug Fix:
  - Resolved issue where PowerShell registry queries failed due to shell variable interpolation.

## [0.3.39] - 2026-02-20

- Cover Flow:
  - Added boxart vertical position slider to the right-click menu.
  - Added side boxart opacity slider to the right-click menu.

## [0.3.38] - 2026-02-20

- UI:
  - Added creative hover animations to all primary action buttons (Play, Edit, Favorite, Mod Manager) across the app.
  - Animated the Onyx brand icon in the navigation bar.
  - Enhanced SVG icons with smooth transitions and group-hover effects.

## [0.3.37] - 2026-02-19

- Cover Flow:
  - reflection at 0% transparency is now fully opaque (mask no longer fades to transparent at bottom).

## [0.3.36] - 2026-02-19

- Cover Flow view:
  - Apple-style horizontal cover flow with reflections and smooth scrolling.
- Cover Flow right-click menu simplified (boxart size, reflection transparency, background brightness, show buttons with position and colours); Flip View and button location options removed for Cover Flow.

## [0.3.35] - 2026-02-19

- Quick tips overlay (library tour) with callouts for Onyx menu and right-click; available via Onyx menu > Quick tips.
- Game Importer:
  - show import progress (phase, count, current game); skip artwork fetch when already present.
- Auto-select first (top-left) game when none is selected.

## [0.3.34] - 2026-02-19

- Release build:
  - Steam provider uses GET fallback for game icon when HEAD fails (fixes missing icons in packaged app).

## [0.3.33] - 2026-02-19

- Game Importer:
  - move scan status inline to header (remove top blue banner); show Found/Processed and progress next to title.
- Onboarding:
  - "Click here to get started" flow with SteamGridDB, optional APIs, and other folders steps; more quick tips; create custom categories on setup.
- Importer:
  - improve alternative banner and icon from metadata; fix corrupt icon (only set when valid, clear failed image URLs in UI).

## [0.3.32] - 2026-02-15

- Fix the startup "New Games Found" modal so long game lists scroll instead of overflowing off-screen.
- Keep modal action buttons visible while scrolling large detected-game results.

## [0.3.31] - 2026-02-14

- Replace Windows native tray context menu with a custom Onyx-styled popup for better readability and layout control.
- Add game icons to Recently Played/Recently Installed tray entries and refine popup sizing/scroll behavior.

## [0.3.30] - 2026-02-14

- Add a new "Start Minimized" option in General settings and wire it through startup preferences/login item behavior.
- Make changelog fetching branch-agnostic by resolving default branch and falling back across release refs/tags for packaged builds.

## [0.3.29] - 2026-02-13

- Fix:
  - Fetch the full changelog from GitHub when release-specific notes are unavailable (fixes empty changelog in update modal)
- Implemented robust fallback for changelog fetching in packaged environments

## [0.3.28] - 2026-02-13

- Improve Battle.net game detection (parent directory scanning, `.build.info` identification)
- Fix "Blizzard" publisher filtering in game importer
- Detect downloading/staged states for games from multiple launchers (Steam, Epic, Ubisoft, Xbox, GOG)
- Improve Xbox search results for games in UUID folders
- Added visual "Downloading" badge to the new games detection window

## [0.3.27] - 2026-02-12

- Fix "Start Closed to Tray" so Onyx can launch hidden when configured or started with a hidden flag
- Improve minimize-on-game-launch behavior by monitoring the launched game process before restoring the window

## [0.3.26] - 2026-02-11

- Fetch changelog from GitHub Releases on-demand, keeping app packages lean
- Include CHANGELOG.md in packaged app as fallback when GitHub is unavailable
- Load release notes only when update is available (not on startup)

## [0.3.25] - 2026-02-11

- Added Mod Manager button color customization (per-view)
- Added reset button for button colors to restore defaults
- Extended button color system to support all three button types (Play, Edit, Mod Manager)

## [0.3.24] - 2026-02-11

- Game title fallback now displays when logo is missing
- Title fallback size is resizable with game logo size slider
- Title fallback updates in real-time when logo size is adjusted

## [0.3.23] - 2026-02-11

- Update notification popup now shows changelog by default
- Changelog view displays changes between current and new version
- Dev:
  - update popup can show on startup for local refinement

## [0.3.22] - 2026-02-11

- Enhanced "Quick All" image search with multi-source support (IGDB, RAWG, Steam, SteamGridDB)
- Added source attribution badges to the image selection panel
- Implemented Run ID tracking to prevent race conditions during async image searches
- Relaxed logo requirement in the game importer (allow import with BoxArt + Banner/Hero)
- Fixed IGDB API errors caused by invalid synthetic ID formats

## [0.3.21] - 2026-02-11

- Fix individual image searches to include results from IGDB and RAWG
- Add metadata:
  - searchMetadata IPC handler for more robust game matching
- Enhanced image aggregation from multiple providers in the image search panel

## [0.3.20] - 2026-02-10

- Improve boxart selection animation:
  - gentle breathing scale, no harsh outlines.

## [0.3.19] - 2026-02-10

- Updated default logo sizes (Grid/List/Logo: 200px, Carousel: 300px)
- Updated agent guide with default logo size documentation

## [0.3.18] - 2026-02-05

- Fix controller settings build error:
  - support step value on navigation speed input

## [0.3.17] - 2026-02-05

- Fix installer download URL:
  - use dots in artifact name (Onyx.Setup) to match GitHub release

## [0.3.16] - 2026-02-04

- Workflow:
  - push to git runs build first; fix isViewFlippedByView preference load (duplicate keys)

## [0.3.15] - 2026-02-04

- Flip view option in all views (grid, list, logo, carousel); per-view flip state; flipped rounded corners on details panel
- Right-click menu:
  - wider list view layout with Games View in two columns; view type always visible
- Alpha badge shown only on alpha builds (not in dev)

## [0.3.14] - 2026-02-04

- Test update notification popup

## [0.3.13] - 2026-02-04

- Fixed update notification modal:
  - startup scan now waits for update check to complete
- Improved update notification flow:
  - Download Update button downloads, then Install Now button quits and installs
- Moved alpha badge from top-right corner to menu bar (between bug report and settings buttons)

## [0.3.12] - 2026-02-04

- Persistent update notification modal on startup when update is available
- Update check coordination:
  - startup library scan pauses when update is found
- Update notification allows download and install directly from notification

## [0.3.11] - 2026-02-04

- Fix alpha update version comparison:
  - use semantic versioning so 0.3.10+ is correctly seen as newer than 0.3.9.

## [0.3.10] - 2026-02-04

- Update toast notifications:
  - app styling (dark theme with cyan/red borders), slide up from bottom of screen.

## [0.3.9] - 2026-02-04

- Changelog bump for alpha update test.

## [0.3.8] - 2026-02-04

- Alpha:
  - check for updates via GitHub API (bypass Atom feed order so newest prerelease is detected).

## [0.3.7] - 2026-02-04

- Alpha:
  - one-time migration of user data from legacy "Onyx" folder to "Onyx Alpha" on first run (fixes reset after upgrading from 0.3.5 to 0.3.6).
- Note:
  - 0.3.5 could not detect newer alpha updates; the fix is in 0.3.6. Install 0.3.6+ manually once, then in-app updates work for future alphas.

## [0.3.6] - 2026-02-04

- Fix alpha update detection:
  - detect alpha at runtime from executable path (OnyxAlpha.exe) so packaged alpha sees new prereleases.

## [0.3.5] - 2026-02-04

- AppUpdate:
  - clarify debug log comment (test alpha update flow).

## [0.3.4] - 2026-02-04

- AppUpdate:
  - set allowPrerelease before setFeedURL for alpha release detection.

## [0.3.3] - 2026-02-04

- Fix electron-updater GitHub configuration - explicitly set feed URL for proper release detection.

## [0.3.2] - 2026-02-04

- Agent guide:
  - single canonical file (`.agent/workflows/agents.md`), Force to Alpha changelog and commit format, Force to Main ref note.

## [0.2.40] and earlier

- Full release history and installers:
  - [GitHub Releases](https://github.com/Lasikiewicz/onyx/releases).
- Onyx unifies games from Steam, Epic, GOG, Xbox, Ubisoft, EA, Battle.net, Humble, Itch, and manual folders.
- Multiple view modes (Grid, List, Logo, Carousel), metadata and artwork from IGDB, RAWG, SteamGridDB, and configurable launcher paths.
[Unreleased]: https://github.com/Lasikiewicz/onyx/compare/alpha-v0.3.14...master
[0.3.14]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.14
[0.3.13]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.13
[0.3.12]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.12
[0.3.11]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.11
[0.3.10]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.10
[0.3.9]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.9
[0.3.8]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.8
[0.3.7]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.7
[0.3.6]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.6
[0.3.5]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.5
[0.3.4]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.4
[0.3.3]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.3
[0.3.2]: https://github.com/Lasikiewicz/onyx/releases/tag/alpha-v0.3.2
[0.2.40]: https://github.com/Lasikiewicz/onyx/releases/tag/v0.2.40
