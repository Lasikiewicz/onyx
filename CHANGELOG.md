# Changelog

All notable changes to Onyx are documented in this file. For download links and full release notes, see [GitHub Releases](https://github.com/Lasikiewicz/onyx/releases).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
