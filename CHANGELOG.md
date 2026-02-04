# Changelog

All notable changes to Onyx are documented in this file. For download links and full release notes, see [GitHub Releases](https://github.com/Lasikiewicz/onyx/releases).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

- See the [repository](https://github.com/Lasikiewicz/onyx) for the latest work in progress.

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
