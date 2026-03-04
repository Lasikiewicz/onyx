# Changelog

All notable changes to Onyx are documented in this file. For download links and full release notes, see [GitHub Releases](https://github.com/Lasikiewicz/onyx/releases).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.7.0] - 2026-03-04

- Game Manager / uploads: Block animated PNG (APNG) local uploads with a clear error, and route regular image browsing through cache validation so rejected files are not saved.
- Game Details links: Force icon-bar rendering in details view so Link Management visibility is respected (visible links on bar, hidden-by-default links in overflow/up-arrow menu).

## [0.6.34] - 2026-03-03

- Library performance: Prefetch game artwork on hover/focus in grid and list views to reduce first-open image delays.
- Carousel/Coverflow performance: Warm selected and nearby game artwork so next/previous navigation displays images faster.
- Asset loading: Add a shared deduplicated renderer prefetch utility for images and `.webm` metadata warming.

## [0.6.33] - 2026-03-03

- Animation settings: Fix `.webm` pause enforcement so `Disable all animations` and per-category toggles reliably pause animated media and hold first frame when disabled.
- Animation categories: Separate banner behavior so `Disable animated banners` controls the top Game Details banner, and rename background toggle to `Disable animated alt banners` for alternative background targeting only.
- Settings behavior: Remove the `Show Links as Icons` setting from the Settings UI and automatically disable `Update Libraries on Startup` after `Remove All Games` is executed.

## [0.6.32] - 2026-03-03

- WEBM video playback: Add app-wide support for `.webm` video assets throughout Game Manager, library views (list/carousel/coverflow), and details panel with proper `<video>` rendering and IPC/CSP fixes.
- Add Games / Onboarding: Remove `Prefer Animated Box Art` and `Prefer Animated Banners` UI toggles and deprecate their preference keys.
- Animation behavior: Pause `.webm` videos when right-click menus or settings overlays are open, while keeping them visible.
- Security: Centralize external URL protocol validation with a shared whitelist for IPC and launcher flows.
- Accessibility: Add ARIA labels and focus improvements to MenuBar, GameManager view toggles, TopBar, and related UI.
- Performance: Optimize GameCard rendering, game filtering allocations, library carousel windowing, and animated image optimization defaults.
- Game Manager: Rework Images tab search to fan out across Steam Store, SteamGridDB, IGDB, RAWG, and show per-provider status with filtering and counts.
- Animations: Add dedicated animation settings tab, global kill-switch, and pause animated backgrounds when overlays are open to reduce CPU usage.

## [0.6.31] - 2026-03-03

- Crash reporting: Generate human-readable `report.txt` files for native process crashes.
- Crash reporting: Capture unhandled JavaScript exceptions into text logs instead of silent failing.

## [0.6.30] - 2026-03-02

- Game Manager: Fix image flicker when switching games by stabilizing background/details image swap behavior and preventing animation restarts.
- Game Manager: Auto-load missing image tabs on tab switch and prefetch other image types after a search.
- Game Manager: Add local animated/static filter toggles with improved provider-by-provider search progress feedback.
- UI: Move optimizer report action to the Game Manager header, remove it from the main navbar, and align category button sizing.
- Navbar: Hide stale pinned categories (for example `Demo`) when that category has no current games.

## [0.6.29] - 2026-03-02

- Optimization (Alpha): Use the local-working animated WebP fallback strategy by prioritizing Sharp recompression before FFmpeg when worker optimization is insufficient.
- Optimization (Animated WebP): Remove restrictive Sharp pixel/output guards for fallback and add aggressive Sharp recompress fallback for oversized files.

## [0.6.28] - 2026-03-02

- Optimization (Alpha): Fix animated FFmpeg fallback filtergraph by replacing malformed `scale=min(...,iw):-2` expression with a safe `force_original_aspect_ratio=decrease` scale filter.
- Optimization diagnostics: Preserve FFmpeg args/exit telemetry so future filter/codec failures are directly visible in exported logs.

## [0.6.27] - 2026-03-02

- Optimization diagnostics: Add startup preflight and runtime probes for worker path/availability and sharp dependency resolution chain (`sharp`, `semver`, `detect-libc`, platform `@img` package).
- Optimization telemetry: Expand per-stage attempt reporting with duration, failure category, and FFmpeg execution diagnostics (args, exit code, timeout, stderr tail, output existence).
- Optimization report: Upgrade log export to `reportVersion: 3` with improved decision classification, per-stage timings, and failure-category digest.
- Packaging/CI: Unpack `semver` for packaged worker runtime and add packaged artifact verifier to fail builds when optimizer runtime dependencies are missing.

## [0.6.26] - 2026-03-02

- Packaging: Unpack `detect-libc` and `@img` sharp runtime modules so packaged optimizer workers can resolve sharp dependency chain.
- Optimization (Alpha/Release): Fix worker fallback path that kept originals when sharp dependency resolution failed in packaged builds.

## [0.6.25] - 2026-03-02

- CI: Harden workflow dependency installs with npm fetch retry settings and retry/backoff loops to reduce transient network TLS/download failures.

## [0.6.24] - 2026-03-02

- Packaging: Move `sharp` to runtime dependencies so packaged Alpha/Release builds can load optimizer worker image processing modules.
- Optimization diagnostics: Preserve per-stage attempt telemetry in exported reports to confirm packaged runtime behavior.

## [0.6.23] - 2026-03-02

- Optimization report: Add per-image stage telemetry (`decisionReason`, worker/ffmpeg/sharp attempt summary) so diagnostics can explain why originals were kept.
- Build: Restore `openGameUninstaller` preload/renderer typing and `Game.launchArgs` renderer typing to keep production build/typecheck green.

## [0.6.22] - 2026-03-02

- Optimization report: Upgrade exported diagnostics log to `reportVersion: 2` with summary metrics, per-job decision labels, cache/error digest, and environment snapshot.
- Optimization report: Include worker/FFmpeg diagnostics payload when available and keep an explicit note when those diagnostics are missing.

## [0.6.21] - 2026-03-02

- Build: Fix `MenuBar` prop mismatch in `App.tsx` by removing stale development-only props, resolving TypeScript build failure on CI.

## [0.6.20] - 2026-03-02

- Optimization report: Add `Download logs` action in the background image optimization modal so diagnostic export is available in packaged builds.
- Optimization diagnostics: Expose runtime diagnostics IPC and app profile wiring for build/debug visibility in optimization troubleshooting.
- Update modal: Constrain height and allow scrolling to keep changelog content accessible on smaller windows.

## [0.6.11] - 2026-03-01

- Optimization: `Optimize animated images` now forces animated WebP processing for all `.webp` files in this mode.
- Optimization UI: Forced animated WebP mode now reports completion instead of skip/fail for no-gain outcomes after optimization attempts.
- IPC/API: Added `forceAnimatedWebp` option wiring for image cache optimization between renderer, preload, and main IPC handler.

## [0.6.10] - 2026-03-01

- Optimization: Fixed Alpha hangs by replacing blocking oversized WebP FFmpeg sweep calls with non-blocking async execution.
- Optimization: Added strict attempt/time limits to aggressive oversized WebP fallback passes to keep the app responsive.

## [0.6.9] - 2026-03-01

- Optimization: Added aggressive FFmpeg fallback sweeps (fps/scale/quality) for oversized animated WebP files in `Optimize animated images`.
- Optimization: Forced oversized WebP processing now picks the best result across aggressive Sharp and FFmpeg passes.

## [0.6.8] - 2026-03-01

- Optimization: For `Optimize animated images`, oversized WebP files now use an aggressive re-encode pass instead of being skipped as no-gain.
- Optimization UI: Completed entries now show actual skip/fail reason text instead of a generic `cached (skipped)` label.

## [0.6.7] - 2026-03-01

- Optimization UI: Fixed cache optimization status mapping so skipped items no longer appear as processing.
- Optimization UI: Published runtime worker/profile/CPU metrics during cache optimization so the top runtime panel is populated.

## [0.6.6] - 2026-03-01

- Manage Metadata: Added `Optimize animated images` action to open the optimizer and run WebP-only optimization.
- Optimization: WebP-only optimization now force-processes files above 15MB instead of skipping oversized files.
- UI: Renamed `Game Importer` to `Add Games` across menu and importer surfaces.

## [0.6.5] - 2026-03-01

- Release pipeline: Use the matching `CHANGELOG.md` version section as GitHub release notes body instead of a fixed notice block.
- Website (mobile): Use a `Send Link` CTA in the header and keep desktop header CTA as `Download`.
- Website (mobile): Hide mouse-follow hero cube and disable custom cursor on touch/coarse pointers.

## [0.6.4] - 2026-03-01

- Startup: Pause automatic library scan when an update prompt is active; resume only after dismiss/download completion to avoid launch stutter.
- Website: Improve hero CTA flow for mobile users (no direct mobile download CTA; add send-link behavior and quicker value messaging).
- Website: Improve navigation dropdown readability with a less transparent desktop dropdown panel.

## [0.6.3] - 2026-02-28

- Fix: Ensure release builds optimize WebP images identically to dev (robust fallback: worker → ffmpeg → sharp → original)
- Fix: Bundle ffmpeg-static and update packaging config for release runtime parity
- Fix: Patch fallback logic for animated WebP optimization (no more skipped/failed optimizations in packaged builds)

## [0.6.2] - 2026-02-28

- Storage: Isolate API credential keychain entries by build profile (dev/alpha/production) with legacy fallback reads.
- Cache: Use the active `ImageCacheService` directory in `onyx-local` protocol resolution to avoid wrong-folder 404s.
- Test: Add missing test dependencies so `vitest` runs without interactive install prompts.

## [0.6.1] - 2026-02-28

- Optimization: Reprocess cached image files during "Optimize all game images" instead of skipping `onyx-local` references.
- Optimization: Apply fast animated WebP worker settings (`quality 80`, `effort 0`, resized by image type) across optimize flows.
- Optimization: Fix cache re-opt path to avoid deleting source files before read and improve terminal job status reporting.

## [0.6.0] - 2026-02-28

- Release: The optimized update.
- Optimization: Prevent duplicate image-job records from keeping stale queued items and making progress appear stuck after import.

## [0.5.13] - 2026-02-28

- Crash report modal: Note that reports are only saved when the app crashes, not when it stops responding and is closed.
- Image cache: Document single-folder storage (no separate pre-import path); limitInputPixels for animated WebP; skip files over 15MB in optimize existing to avoid hang.

## [0.5.12] - 2026-02-28

- Crash reporting: Crash dumps enabled in all builds; on next launch after a crash, option to save the report, open folder, or dismiss.
- Optimization: Hardened image pipeline (limitInputPixels, worker fallback after repeated exits, queue try/catch).

## [0.5.11] - 2026-02-28

- Manage Metadata: Unified NUCLEAR / Images only / Links only / Optimizer; NUCLEAR clears library and opens importer; all options require confirmation; refresh flows run in importer.
- Onboarding: Manual folders from Settings → Libraries shown on "Games in other folders?"; add/remove/category changes sync to Settings immediately (onboarding is source of truth).
- Onboarding: "Start scan" opens importer and starts scan; existing manual folders persist when removing in onboarding.

## [0.5.10] - 2026-02-28

- Optimization: Debug logging (local dev) and crash-capture script; single-game queue cap to reduce native crash risk.
- Optimization: ONYX_FORCE_OPTIMIZE env to auto-start image optimization on launch for testing.

## [0.5.9] - 2026-02-28

- Docs: Guideline for commit messages that land on main (keep wording neutral for production history).

## [0.5.8] - 2026-02-28

- UI: Moved alpha badge, bug report, and console buttons to top right of navbar; tray tooltip shows branch (Onyx Dev / Onyx Alpha / Onyx).
- Update: Changelog in update modal shows only version-to-version changes and strips GPL/legal notices; modal and changelog box constrained so they stay on screen.

## [0.5.7] - 2026-02-28

- Importer: Fixed static/animated optimization barrier sequencing to prevent optimizer lockups during large queue runs.
- Game Manager: Restored "Optimize all game images" action in Manage Metadata for testing and operational use.
- Optimization UI: Improved skipped/cache-hit completion visibility and runtime barrier diagnostics.

## [0.5.6] - 2026-02-27

- Update: Prefer branch `CHANGELOG.md` sources before tag refs so the update modal shows actual changelog entries for version ranges.

## [0.5.5] - 2026-02-27

- Onboarding: Compacted Overview layout, improved API key-entry actions, and clarified scan/optimization messaging.
- Optimization: Improved existing cache optimization concurrency handling and performance profile usage during runs.

## [0.5.4] - 2026-02-27

- Update: Prioritized `CHANGELOG.md` content over GitHub release body text so the update modal shows real changelog entries.

## [0.5.3] - 2026-02-27

- CI: Added missing `fast-check` dev dependency required by property-based tests.
- Test: Added explicit callback parameter typing in `GameDetailsPanel` tests to fix TypeScript `implicit any` errors.

## [0.5.2] - 2026-02-27

- Optimization: Restored unified optimization IPC bridge so status is visible in the renderer.
- Optimization: Added performance profiles and onboarding/settings controls for image optimization CPU usage.
- UI: Improved background optimization progress details and source file type visibility.

## [0.5.1] - 2026-02-26

- Settings: Added the Nyrna credit link at the bottom of Suspend/Resume (Experimental).
- Release: Version bump to 0.5.1.

## [0.5.0] - 2026-02-26

- Suspend/Resume: Added dedicated Settings tab and improved launch tracking for launcher/protocol games.
- About: Updated credit line to link Nyrna directly from the About section.
- Release: Version bump to 0.5.0.

## [0.4.8] - 2026-02-26

- Licensing: Switched project license from MIT to GPL-3.0-or-later.
- Docs: Updated README badge/text and added a license decision matrix document.
- Metadata: Updated package license field to `GPL-3.0-or-later`.

## [0.4.7] - 2026-02-26

- Bug Fix: Ensured startup sequence always runs via renderer `app:ready` signal plus main-process fallback timer.
- Bug Fix: Restored reliable execution of `Update Libraries on Startup` and `Check for Updates on Startup` preferences.

## [0.4.6] - 2026-02-26

- Bug Fix: Fixed AppUpdateService coordination race condition causing `updateLibrariesOnStartup` to hang waiting for update checks.

## [0.4.5] - 2026-02-26

- Performance: Optimized startup sequence with immediate update checks and parallel library scans.
- UI: Improved "Start Minimized" behavior on Windows to ensure the app stays in the tray when configured.
- Importer: Redirected one-click scans to the full Game Importer workbench for enhanced editing capabilities.
- Importer: Automatic background scans now open the Game Importer when new games are detected.

## [0.4.4] - 2026-02-25

- Fix: Expanded onyx-local protocol support for .ico and .avif.
- Internal: Standardized ESM loading via dynamicImport helper.
- Security: Case-insensitive path validation for Windows protocol handler.
- Test: Added vitest-based unit tests for core services.

## [0.4.3] - 2026-02-25

- Cleanup: Removed unused variables in LibraryListView and OnyxSettingsModal.
- Performance: Switched ImageCacheService file operations to async I/O.

## [0.4.2] - 2026-02-25

- Security: Fix path traversal vulnerability in onyx-local protocol handler.
- Security: Restrict file execution in app:openPath IPC handler to trusted directories.
- Test: Add comprehensive GameMatcher unit tests using vitest.
- Fix: Exclude test files from production TypeScript build.
- UI: Performance improvements to LibraryGrid and SortableGameCard components.

## [0.4.1] - 2026-02-24

- Feature: Added alternative background options to Carousel and Cover Flow views.
- Feature: Added background blur amount slider to Cover Flow view settings.
- Fix: Improved game removal logic with a new confirmation dialog for missing games.

## [0.4.0] - 2026-02-23

- "**The Animated Update**"
- Feature: Added animated image preferences (boxart and banners) globally and to the onboarding screens.
- Feature: SteamGridDB sorting strictly enforces animated preferences.
- Polish: Fixed animation stuttering in the Game Details panel background.

## [0.3.54] - 2026-02-23

- UI: Fixed custom import dialog not refreshing settings to reflect imported preferences until next app restart.
- UI: Improved custom defaults import preview layout with side-by-side section display and grid-based conflict options.
- UI: Added currentResolution property to UserPreferences type to track resolution-aware preferences across sessions.

## [0.3.53] - 2026-02-23

- UI: Refined right-click menu with compact top action controls and cleaner view/header spacing.
- UI: Standardized slider controls across menu contexts with in-title current values and per-slider reset actions.
- UI: Improved button color editors to use a compact single-row layout and streamlined color chips.

## [0.3.52] - 2026-02-23

- UI: Set default game logo size to 100px across all views (Grid, List, Logo, Carousel, Right Panel).
- UI: Updated various component fallbacks and preference defaults to maintain consistent 100px sizing for new games.

## [0.3.51] - 2026-02-23

- Importer: Replaced slow Steam HTML scraping search (20+ API calls per game, 20-30s) with fast storesearch API (~200ms per game).
- Importer: IGDB now only used as artwork fallback when Steam and SteamGridDB don't produce boxArt; still used for links/descriptions.
- Importer: Added 15s timeout to IGDB description/link calls to prevent indefinite hangs.
- Importer: Reduced metadata retry count from 3 to 1 to prevent timeout multiplication.
- Importer: Relaxed "ready" criteria to boxArt-only (banner and description no longer required).
- Importer: Added variant title search for non-Steam games (handles CamelCase/space mismatches like "CloverPit" vs "Clover Pit").

## [0.3.50] - 2026-02-23

- Importer: Fixed bug where cancelling the importer confirmation dialog would not cancel background game scan requests.
- Importer: Fixed game matching issue where titles identified correctly could be bypassed by an inaccurate zero-confidence match.
- Importer: Fixed bug where Xbox applications (with Windows App IDs) would incorrectly pass their App IDs to IGDB breaking the metadata matching for games like "FINAL FANTASY".

## [0.3.49] - 2026-02-23

- Documentation: Updated setup instructions for IGDB API to include the required OAuth Redirect URL (http://localhost).
- UI: Added IGDB redirect URL registration steps to the Integrations tab in Settings and the initial Welcome flow.
- Importer: Improved game identification and metadata fetching for "afop" (Avatar: Frontiers of Pandora) and other mapped titles.
- Importer: Centralized title normalization to ensure consistent game matching across all metadata providers.

## [0.3.48] - 2026-02-23

- Importer: Fixed game title cleaning (e.g., mapping "AFOP" to "Avatar: Frontiers of Pandora™") to display official names instantly.
- Importer: Simplified discovery progress to show actual games found instead of raw scanner counts.
- Importer: Fixed duplicate detection to prevent skipping valid games when local path data is missing.
- Importer: Added an "Identifying" pass to update game titles faster during scans.
- Fix: Resolved metadata validation bugs that caused official titles to be discarded.

## [0.3.47] - 2026-02-21

- Security: Added API credential validation check for IGDB, RAWG, SteamGridDB, and Giant Bomb before starting a scan in the importer.
- Fix: Resolved issue with game banners and background images not updating correctly when changed in the Game Manager.
- Importer: Reset importer state after successful import for a clean start next session.

## [0.3.46] - 2026-02-21

- Game Importer: Allow switching tabs (Metadata, Images, Links, Mod Manager) and viewing discovered content while a scan is in progress.
- Game Importer: Selectively disable only interactive inputs and action buttons during scan to prevent race conditions while keeping the UI responsive for viewing.

## [0.3.45] - 2026-02-21

- Game Importer: Disable editing (metadata, images, Save) while scan is in progress; show notification explaining why to avoid app hang.

## [0.3.44] - 2026-02-21

- Welcome: New Overview step after “Games in other folders” with checklist of APIs and custom folders; “Next” opens overview, “Start scan” runs from there.
- Welcome: Overview shows “Good to go” for added APIs; missing APIs get inline key input and Save; Giant Bomb shows “Currently Unavailable” overlay.
- Welcome: Ready to scan section improved (icon animation, copy, layout); metadata services refresh when API credentials are saved so Start scan uses all added APIs.
- Importer: Full metadata (artwork, icons, logos, links) from all configured APIs; links saved with games.

## [0.3.43] - 2026-02-21

- Security: Removed test script that contained hardcoded credentials (fixes secret scan).

## [0.3.42] - 2026-02-21

- Game details: Up-arrow “more links” popover is now top-level (portaled) so it no longer clips; Link Management context menu footer text is easier to read.
- Link bar and Settings: Link order and visibility from Link Management are the source of truth; up-arrow shows titles and icons; right-click shows all links and “fix wrong URL” note.

## [0.3.41] - 2026-02-20

- Game details: Link icons are now packaged locally (Simple Icons); no CDN dependency. Icons are centered in their badges.
- Settings: New "Link Management" page to set default visibility and order of link types (Official Website, YouTube, Steam, etc.).
- Game details: By default only Official Website, YouTube, Subreddit, and Discord are shown; other link types are hidden until enabled in Link Management.
- Game Manager: "Refresh Metadata" renamed to "Manage Metadata" with options: Refresh all metadata (nuclear), Search for missing images only, Refresh all Links (nuke and re-fetch from IGDB).
- Game Manager Links tab: Icons shown next to each link; click icon to search for or upload a custom SVG.

## [0.3.40] - 2026-02-21

- Game Importer: Enhanced Battle.net game detection with Windows Registry fallback.
- Game Importer: Battle.net games are now auto-detected even if the launcher is not explicitly configured/enabled.
- Bug Fix: Resolved issue where PowerShell registry queries failed due to shell variable interpolation.

## [0.3.39] - 2026-02-20

- Cover Flow: Added boxart vertical position slider to the right-click menu.
- Cover Flow: Added side boxart opacity slider to the right-click menu.

## [0.3.38] - 2026-02-20

- UI: Added creative hover animations to all primary action buttons (Play, Edit, Favorite, Mod Manager) across the app.
- UI: Animated the Onyx brand icon in the navigation bar.
- UI: Enhanced SVG icons with smooth transitions and group-hover effects.

## [0.3.37] - 2026-02-19

- Cover Flow: reflection at 0% transparency is now fully opaque (mask no longer fades to transparent at bottom).

## [0.3.36] - 2026-02-19

- Cover Flow view: Apple-style horizontal cover flow with reflections and smooth scrolling.
- Cover Flow right-click menu simplified (boxart size, reflection transparency, background brightness, show buttons with position and colours); Flip View and button location options removed for Cover Flow.

## [0.3.35] - 2026-02-19

- Quick tips overlay (library tour) with callouts for Onyx menu and right-click; available via Onyx menu > Quick tips.
- Game Importer: show import progress (phase, count, current game); skip artwork fetch when already present.
- Auto-select first (top-left) game when none is selected.

## [0.3.34] - 2026-02-19

- Release build: Steam provider uses GET fallback for game icon when HEAD fails (fixes missing icons in packaged app).

## [0.3.33] - 2026-02-19

- Game Importer: move scan status inline to header (remove top blue banner); show Found/Processed and progress next to title.
- Onboarding: "Click here to get started" flow with SteamGridDB, optional APIs, and other folders steps; more quick tips; create custom categories on setup.
- Importer: improve alternative banner and icon from metadata; fix corrupt icon (only set when valid, clear failed image URLs in UI).

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

- Fix: Fetch the full changelog from GitHub when release-specific notes are unavailable (fixes empty changelog in update modal)
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
- Dev: update popup can show on startup for local refinement

## [0.3.22] - 2026-02-11

- Enhanced "Quick All" image search with multi-source support (IGDB, RAWG, Steam, SteamGridDB)
- Added source attribution badges to the image selection panel
- Implemented Run ID tracking to prevent race conditions during async image searches
- Relaxed logo requirement in the game importer (allow import with BoxArt + Banner/Hero)
- Fixed IGDB API errors caused by invalid synthetic ID formats

## [0.3.21] - 2026-02-11

- Fix individual image searches to include results from IGDB and RAWG
- Add metadata:searchMetadata IPC handler for more robust game matching
- Enhanced image aggregation from multiple providers in the image search panel

## [0.3.20] - 2026-02-10

- Improve boxart selection animation: gentle breathing scale, no harsh outlines.

## [0.3.19] - 2026-02-10

- Updated default logo sizes (Grid/List/Logo: 200px, Carousel: 300px)
- Updated agent guide with default logo size documentation

## [0.3.18] - 2026-02-05

- Fix controller settings build error: support step value on navigation speed input

## [0.3.17] - 2026-02-05

- Fix installer download URL: use dots in artifact name (Onyx.Setup) to match GitHub release

## [0.3.16] - 2026-02-04

- Workflow: push to git runs build first; fix isViewFlippedByView preference load (duplicate keys)

## [0.3.15] - 2026-02-04

- Flip view option in all views (grid, list, logo, carousel); per-view flip state; flipped rounded corners on details panel
- Right-click menu: wider list view layout with Games View in two columns; view type always visible
- Alpha badge shown only on alpha builds (not in dev)

## [0.3.14] - 2026-02-04

- Test update notification popup

## [0.3.13] - 2026-02-04

- Fixed update notification modal: startup scan now waits for update check to complete
- Improved update notification flow: Download Update button downloads, then Install Now button quits and installs
- Moved alpha badge from top-right corner to menu bar (between bug report and settings buttons)

## [0.3.12] - 2026-02-04

- Persistent update notification modal on startup when update is available
- Update check coordination: startup library scan pauses when update is found
- Update notification allows download and install directly from notification

## [0.3.11] - 2026-02-04

- Fix alpha update version comparison: use semantic versioning so 0.3.10+ is correctly seen as newer than 0.3.9.

## [0.3.10] - 2026-02-04

- Update toast notifications: app styling (dark theme with cyan/red borders), slide up from bottom of screen.

## [0.3.9] - 2026-02-04

- Changelog bump for alpha update test.

## [0.3.8] - 2026-02-04

- Alpha: check for updates via GitHub API (bypass Atom feed order so newest prerelease is detected).

## [0.3.7] - 2026-02-04

- Alpha: one-time migration of user data from legacy "Onyx" folder to "Onyx Alpha" on first run (fixes reset after upgrading from 0.3.5 to 0.3.6).
- Note: 0.3.5 could not detect newer alpha updates; the fix is in 0.3.6. Install 0.3.6+ manually once, then in-app updates work for future alphas.

## [0.3.6] - 2026-02-04

- Fix alpha update detection: detect alpha at runtime from executable path (OnyxAlpha.exe) so packaged alpha sees new prereleases.

## [0.3.5] - 2026-02-04

- AppUpdate: clarify debug log comment (test alpha update flow).

## [0.3.4] - 2026-02-04

- AppUpdate: set allowPrerelease before setFeedURL for alpha release detection.

## [0.3.3] - 2026-02-04

- Fix electron-updater GitHub configuration - explicitly set feed URL for proper release detection.

## [0.3.2] - 2026-02-04

- Agent guide: single canonical file (`.agent/workflows/agents.md`), Force to Alpha changelog and commit format, Force to Main ref note.

## [0.2.40] and earlier

- Full release history and installers: [GitHub Releases](https://github.com/Lasikiewicz/onyx/releases).
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
