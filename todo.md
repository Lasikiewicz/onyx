# Onyx TODO

## Security
- [ ] **Sanitize game launch arguments** — `LauncherService.ts` uses `shell: true` in `spawn()` which allows command injection via `launchArgs`. Fix by escaping/sanitizing args rather than removing `shell: true` (needed for Windows paths with spaces).
- [ ] **Restrict `app:openExternal` URLs** — Validate URLs passed to `shell.openExternal()` to only allow `http://`, `https://`, and known launcher protocols (steam://, epic://, etc.). Prevent `file://` or other dangerous schemes.

## Performance
- [ ] **Virtualize LibraryGrid** — Large game libraries cause slow rendering. Add react-window or react-virtualized to only render visible game cards. Must preserve drag-and-drop, keyboard navigation, and gamepad support.
- [ ] **Virtualize LibraryCarousel** — Same virtualization approach for the carousel view to improve scroll performance with many games.
- [ ] **GameStore write-behind caching** — Debounce frequent `saveGame()` calls with a 2s write-behind cache to reduce disk I/O. Must handle edge cases: crash safety (flush on app quit), concurrent writes, and cache invalidation.
- [ ] **Async Steam scanning** — Change `SteamService.scanSteamGames()` from sync to async. Breaking API change — requires updating `ImportService`, `GameStore.getMissingGames()`, `SteamMetadataProvider`, and all callers.

## Features
- [ ] **Steam process detection by install directory** — Use `wmic` (Windows) to find running game PIDs by matching executable path against the game's `installationDirectory`. Enables play-time tracking for Steam games.
- [ ] **IGDB fallback for non-Steam metadata** — When fetching metadata for Epic/GOG/Xbox games, use IGDB search as a fallback provider if the primary source returns no description.
- [ ] **Per-game mod manager URL** — Add `modManagerUrl` field to Game interface and `launchModManager()` to LauncherService. Supports both web URLs and local exe paths.
- [ ] **Track per-game settings in saved defaults** — Include per-game custom settings count and details in the exported/imported defaults list.

## Testing
- [ ] **GameFilteringService tests** — Test `isLikelyDownloading()` to verify detection of downloading/staged game states across launchers.
- [ ] **IGDBService tests** — Test `inferLinkNameFromUrl()` for correct link name inference from various URL patterns.
- [ ] **UserPreferencesService snapshot test** — Snapshot test for `createDefaultPreferences()` to catch unintended changes to default values.
- [ ] **normalizeResolutionKey tests** — Test resolution key normalization in UserPreferencesService.
- [ ] **MetadataFetcherService tests** — Test IGDB fallback logic for non-Steam providers.

## Refactoring (Future — do incrementally, not all at once)
- [ ] **Break down App.tsx** — Extract layout, context providers, and routing into separate files.
- [ ] **Break down RightClickMenu** — Split into sub-components per section (view settings, game actions, display options).
- [ ] **Break down GameManager.tsx** — Extract tab panels (Metadata, Images, Links, Mod Manager) into separate components.
- [ ] **Simplify main.ts initialization** — Extract protocol handler, tray setup, and window creation into dedicated modules.
- [ ] **ImportService Strategy Pattern** — Replace the monolithic scanner switch/case with a pluggable scanner strategy per launcher.
- [ ] **Simplify ImportWorkbenchV2** — Break overview/confirmation/progress into smaller sub-components.

## Code Quality
- [ ] **RateLimitCoordinator** — Current implementation awaits each request sequentially. Consider allowing parallel execution within rate limits, but be careful not to break error propagation.
