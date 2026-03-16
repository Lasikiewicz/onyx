# Onyx TODO

## Security
- [x] **Sanitize game launch arguments** — [`LauncherService.ts`](../main/LauncherService.ts) now uses `spawn` with an arguments array and `shell: false` to prevent command injection while correctly handling paths.
- [x] **Restrict `app:openExternal` URLs** — Validated URLs in [`appHandlers.ts`](../main/ipc/appHandlers.ts) to allow only allowed protocols (http, https, steam, epic, etc.).

## Performance
- [x] **Virtualize LibraryGrid** — Implemented CSS-based virtualization using `content-visibility: auto` and `contain-intrinsic-size` for zero-overhead performance gains.
- [x] **Virtualize LibraryCarousel** — Implemented CSS-based virtualization for the carousel view.
- [x] **GameStore write-behind caching** — Implemented `flushSync()` on app quit to ensure debounced saves are committed to disk before exit.
- [x] **Async Steam scanning** — Updated all callers to correctly `await` the async Steam scanning process.

## Features
- [x] **Steam process detection by install directory** — Implemented `getActiveSteamProcessId` using `wmic` to track playtime for Steam games.
- [x] **IGDB fallback for non-Steam metadata** — Verified and optimized IGDB descriptor and link fetching as a fallback for non-Steam games.
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
