# Onyx — Optimization Report & Bug Bash

**Date:** 2026-08-05
**Scope:** Full read-only audit of `main/`, `renderer/src/`, and repo-level health (deps, tests, lint, build config).
**Baseline:** commit `01e3f35` (0.12.0), branch `master`.

## How to read this

Every finding cites `file:line` and was verified against source. Findings are grouped by severity, then by theme. **No source files under `main/` or `renderer/src/` were changed as part of this audit** — this document is the deliverable, and each item is written so it can be picked up as its own task later. The only code change made alongside this report is the dependency bump described in [Dependency remediation](#dependency-remediation).

Severity means:

- **High** — causes data loss, freezes the UI, runs unbounded/attacker-influenced code, or is an outright logic defect users will hit.
- **Medium** — real performance or correctness cost under normal use, but degraded rather than broken.
- **Low** — waste, papercuts, and latent hazards worth cleaning up opportunistically.

---

## Executive summary

The app's security posture at the Electron boundary is solid (see [What's already correct](#whats-already-correct) — worth reading so this ground isn't re-audited). The renderer correctly uses the preload bridge everywhere, with zero raw `ipcRenderer`. TypeScript is `strict` with zero `@ts-ignore`. Those are real strengths.

The problems cluster in four places:

1. **Persistence is unsafe.** The `electron-store` shim writes the whole library non-atomically and silently falls back to an empty library when the file is corrupt — a crash mid-write can lose the entire game library with no backup and no error. Concurrent read-modify-write in `GameStore` compounds this by losing artwork updates.
2. **The main process blocks constantly.** Synchronous `fs`, `spawnSync('powershell')`, and `spawnSync(ffmpeg)` run on the main thread in hot paths — including once per game during Xbox scans and once per image request in the custom protocol handler. This is the most likely source of the "app not responding" reports and is closely related to the image-optimization crash already documented in `.agent/docs/known-issues-disabled-features.md`.
3. **The renderer re-renders far more than it needs to,** and one hook contains a genuine infinite loop. `React.memo` on game tiles is defeated by unstable callback props, so memoization currently buys nothing.
4. **Testing and linting don't cover the risky code.** The four files with `react-hooks/exhaustive-deps` disabled are precisely the four where stale-closure bugs were found. The largest and crash-prone services have no tests at all.

The single highest-value fix is **atomic writes + non-destructive corrupt-file handling in `main/electronStoreShim.ts`** — it is small, self-contained, and it is the only finding here that can permanently destroy user data.

---

## High severity

### Data loss and persistence

**H1 — Non-atomic store writes with silent fallback to empty. Can permanently destroy the user's library.**
`main/electronStoreShim.ts:52-59`

```ts
private save(): void {
  try {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
  } catch {
    // Ignore persistence errors (e.g. read-only filesystem)
  }
}
```

The write is not atomic, so a crash or power loss mid-write truncates `game-library.json`. On next launch, `load()` at `:47` swallows the `JSON.parse` failure and keeps the empty defaults — and the very next `set()` overwrites the truncated file with `{"games": []}`. The library is gone, permanently, with no user-visible error and no backup.

The blast radius is large because this shim backs every store: `game-library`, `user-preferences`, `app-configs`, and `steam-auth`.

*Fix shape:* write to `${filePath}.tmp` then `fs.renameSync` (atomic on NTFS); on parse failure, rename the bad file to `.corrupt-${Date.now()}` and surface an error rather than silently continuing with defaults. Both changes are confined to this one 84-line file.

**H2 — Concurrent read-modify-write in `GameStore.saveGame` loses artwork updates.**
`main/GameStore.ts:215-250`

`saveGame` reads a snapshot, mutates it, and writes the whole array back — across `await` boundaries:

```ts
const games = await this.getLibrary();     // :218 — returns [...this.gamesCache] (:106)
// ...mutate games...
this.scheduleSave(games);                  // :247 — replaces the entire cached array
```

`main/ImageOptimizationQueue.ts:238` runs up to 6 games in parallel (`maxGameWorkers = Math.min(maxGameWorkers, 6)`), each doing exactly this. Worker B's stale snapshot silently overwrites worker A's just-written artwork URLs, producing missing box art after an import — non-deterministically, which makes it hard to report and hard to reproduce.

The same pattern appears in `main/ipc/gameHandlers.ts:238-249` (`clearAllImages`) and in the metadata refresh path in `metadataHandlers`.

*Fix shape:* mutate `gamesCache` in place, or serialize writes behind an async mutex.

**H3 — `getLibrary()` leaks the store's live internal array.**
`main/GameStore.ts:104-110`

```ts
async getLibrary(): Promise<Game[]> {
  if (this.gamesCache) {
    return [...this.gamesCache];
  }
  const store = await this.ensureStore();
  return (store as any).get('games', []);   // :109 — no copy
}
```

On the cache-miss branch this hands back the shim's live `this.data.games` reference. `main/ipc/gameHandlers.ts:196-209` then mutates those objects directly (`g[flagKey] = true`), silently mutating persisted state outside any save path. Note the cached branch copies the *array* but not the game *objects*, so nested mutation escapes on both branches.

**H4 — Per-game flush defeats the save debounce; every optimized game rewrites the entire library synchronously.**
`main/ImageOptimizationQueue.ts:339-341`

```ts
await gameStore.saveGame(updated);
await gameStore.flushPending();
```

`flushPending` → `flush` → `store.set('games', …)` → the `writeFileSync` in H1. So each optimized game serializes and sync-writes the **whole** pretty-printed library. Importing 500 games means 500 full-file synchronous writes of a multi-megabyte file on the main thread, six workers deep. The 2-second debounce in `scheduleSave` (`GameStore.ts:115-124`) is entirely bypassed.

This combines with H1: 500 non-atomic full-file writes is 500 chances to corrupt the library.

### Main-thread freezes

**H5 — The entire Xbox scan is synchronous, including one PowerShell launch per game.**
`main/XboxService.ts:879`

`scanGames()` is a sync method doing `readdirSync` + `statSync` recursion to depth 20 (`findExecutables`, `:466`), a recursive `AppxManifest.xml` search to depth 10 (`:381`), `readFileSync` of manifests (`:411`), and three separate `spawnSync('powershell', …)` calls (`:425`, `:741`, `:803`).

`Get-AppxPackage` / `Get-StartApps` typically take 2–10 seconds *each*, and `extractPackageInfo` is called **once per game folder** (`:311`). A 30-game Game Pass install therefore serializes 30 PowerShell startups with the UI completely frozen. `main/scanners/XboxScanner.ts:19` wraps it in an `async` that never actually yields.

Additionally, `findExecutables` follows directory junctions (`XboxService.ts:497`; `ImportService.ts:890` explicitly `stat`s symlinks to recurse into them) with no visited-inode set. Windows junction cycles are bounded only by `maxDepth`, and 20 levels of a cyclic junction is effectively unbounded work.

**H6 — `spawnSync(ffmpeg)` with a 60-second timeout on the main process.**
`main/ImageCacheService.ts:523`

```ts
const result = spawnSync(ffmpegPath, args, { encoding: 'utf8', timeout: 60000, windowsHide: true });
```

`ImageCacheService` is instantiated in the main process (`main/main.ts:358`), and this runs from the optimization queue for every animated asset. Each call blocks the main thread for up to 60 seconds: no window paint, no IPC, no tray response. The escalating retry loop at `:422-465` (3 dimensions × N fps × M quality, up to `maxAttempts`) uses async `spawn`, but this path does not.

This is very likely the "app not responding" that the `setImmediate` yields elsewhere in the codebase are attempting to work around, and it sits directly in the image-optimization crash area documented in `.agent/docs/known-issues-disabled-features.md`.

**H7 — Synchronous file I/O in the custom protocol handler, per image request.**
`main/onyxLocalProtocol.ts:145-181`

```ts
for (const ext of extensions) {          // 8 extensions
  const filePath = path.join(cacheDir, filename);
  if (existsSync(filePath)) {            // :155
    const fileData = readFileSync(filePath);   // :165
```

Up to 8 `existsSync` calls plus a `readFileSync` of a potentially multi-megabyte webp/webm, on the main thread, for **every** image the renderer requests. A grid view painting 100 covers performs 100 blocking reads. `protocol.handle` is promise-based and can return a stream — this should use `fs.promises.readFile` at minimum.

**H8 — Recursive synchronous userData copy at module import time, before the window exists.**
`main/main.ts:248` (implementation at `:211-240`)

`migrateAlphaUserDataFromOnyx()` runs at import time and does `readdirSync` + `copyFileSync` recursion over the entire legacy userData folder — which contains the image cache and can be gigabytes. Startup is fully blocked until it finishes.

### Correctness

**H9 — Infinite effect/render loop in fullscreen, plus an IPC storm.**
`renderer/src/hooks/useFullscreen.ts:95-129`

`mouseIdleTimer` is React state *and* a dependency of the effect that sets it:

```ts
    handleMouseMove();                       // :118 → setMouseIdleTimer(timer)
    window.addEventListener('mousemove', handleMouseMove);
    return () => { /* ... */ };
  }, [state.isFullscreen, cursorHideTimeout, mouseIdleTimer]);   // :129
```

The effect body calls `handleMouseMove()` immediately, which calls `setMouseIdleTimer` with a new timer id → re-render → cleanup + re-run → `handleMouseMove()` again → forever, with no user input required.

This is compounded by `:62-92`, where the same `mouseIdleTimer` is a dependency of an effect that `await`s `window.electronAPI.getPreferences()`. The loop therefore drives a continuous IPC round-trip storm the whole time the app is in fullscreen.

*Fix shape:* hold the timer in a `useRef`, and drop `mouseIdleTimer` from both dep arrays — it does not belong in either.

**H10 — `event.preventDefault()` called after `await` in a `close` handler does nothing.**
`main/main.ts:1203-1234`

```ts
win.on('close', async (event) => {
  await flushWindowStateSave();                       // :1218
  const prefs = await userPreferencesService.getPreferences();
  if (prefs.closeToTray !== false) {
    event.preventDefault();                           // :1226 — too late
```

Electron requires `preventDefault()` to be called synchronously; after two `await`s the close has already been committed. Whenever the cached `closeToTrayEnabled` flag is stale or false but the persisted preference is true, the window closes instead of hiding to tray.

**H11 — Cache-buster reapplied on every library reload, invalidating all artwork.**
`renderer/src/hooks/useGameLibrary.ts:112-126`

```ts
const timestamp = Date.now();
const convertedGames = library.map((game: Game) => ({
  boxArtUrl: addCacheBuster(convertFileUrlToLocalProtocol(game.boxArtUrl), timestamp),
  // ...same for banner, logo, hero, icon
```

`loadLibrary()` runs after every save, delete, import, and settings change, and on every `gameStore:libraryUpdated` event. Each run stamps a fresh `?t=` onto every artwork URL in the library, forcing a full re-fetch and re-decode of every boxart, logo, and hero — through the synchronous protocol handler in H7.

The adjacent `updateGameInState` (`:136-139`) already documents exactly why this is wrong:

> `DO NOT add cache busters here - that causes image reloads on every state update`

`loadLibrary` does it unconditionally. This is the root cause already diagnosed for "logo flickering" in `.agent/docs/known-issues-disabled-features.md`, and the fix location named there is this file.

### Security

**H12 — Command injection: PowerShell built from a file-controlled string.**
`main/XboxService.ts:425-433`

```ts
const result = spawnSync('powershell', [
  '-NoProfile', '-NonInteractive', '-Command',
  `Get-AppxPackage | Where-Object { $_.Name -eq "${packageName}" } | Select-Object -First 1 PackageFamilyName | ConvertTo-Json`
], { encoding: 'utf-8', windowsHide: true });
```

`packageName` comes from a regex over an `AppxManifest.xml` found anywhere inside a scanned game folder (`:414`):

```ts
const nameMatch = manifestContent.match(/<Identity[^>]+Name="([^"]+)"/);
```

The captured value can contain `` ` ``, `$(…)`, or a closing `"`. A crafted manifest placed in any directory the user scans yields **arbitrary PowerShell execution** with the user's privileges. Scanned directories are frequently third-party content (downloaded games, shared drives), so this is reachable in practice.

The codebase already knows the right patterns: `main/LauncherService.ts:12` and `main/ipc/appHandlers.ts:225` escape their arguments, and `main/ImportService.ts:1612` uses `-EncodedCommand`.

*Fix shape:* validate `packageName` against the Appx identity grammar (`^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$`) and reject otherwise; or pass via `-EncodedCommand` as `ImportService` does.

**H13 — Unvalidated renderer-supplied path drives an unbounded synchronous walk.**
`main/ipc/gameHandlers.ts:161`

```ts
const games = await xboxService.scanGames(path);
```

No validation of `path`. Passing a large root such as `C:\` triggers the depth-20 synchronous directory walk from H5 and hangs the app. This is also the general pattern across the IPC surface: `gameStore:saveGame` (`gameHandlers.ts:271`) trusts the entire `Game` object shape without validation.

### Renderer performance

**H14 — `React.memo` on game tiles never hits.**
`renderer/src/App.tsx:482, 496-510, 535, 815-826`

`handleReorder` (`:482`), `handleEditGame` (`:496`), `handleEditCategories` (`:500`), `handleEditImages` (`:504`), `handleFixMatch` (`:508`), `handleSaveGame` (`:535`), `handleToggleFavorite` (`:815`), and `handleTogglePin` (`:822`) are plain functions recreated on every render. They flow down through `AppShellLibraryView` → `LibraryGrid` → `SortableGameCard` as `onEdit` / `onPlay` / `onFavorite` props.

`SortableGameCard` (`:141`) and `GameCard` (`:292`) are both wrapped in `React.memo` — and the memo can never hit, because the props differ by identity every time. The memoization is currently pure overhead.

Compounding this: `useGameDetailsPanelControls`, `useRightClickMenuControls`, `useMainViewShellControls`, `useAppShellSurfaceActions`, `useAppShellModalControls`, and `useAppShellCarouselControls` each `return { … }` a fresh object literal containing inline arrow functions, with no `useMemo`. `GameDetailsPanel` (1484 lines) and `MenuBar` (1560 lines) therefore re-render fully on every keystroke in the search box.

**H15 — Whole-document MutationObserver re-walks every `<video>` on any DOM change.**
`renderer/src/hooks/useAnimatedMediaPolicy.ts:179-182`

```ts
const observer = new MutationObserver(() => { applyPausePolicy(); });
observer.observe(document.body, { childList: true, subtree: true });
```

`applyPausePolicy` runs `document.querySelectorAll('video').forEach(...)`. There is no debounce or rAF batching, so any DOM mutation anywhere — typing in search, hovering a tile, opening a menu — triggers a full-document video walk. With a large library this is a sustained main-thread cost that scales with library size.

**H16 — No virtualization in any library view.**
`LibraryGrid.tsx:337`, `LibraryCardView.tsx:221`, `LibraryListView.tsx:190`, `GameManager.tsx:815`

Every view renders one DOM subtree per game. Grid and Card partially mitigate with `contentVisibility: 'auto'`, but `LibraryListView` and `GameManager`'s "Imported Games" list have no `contentVisibility`, no `loading="lazy"`, and `GameManager` autoplays a `<video>` per row for animated boxarts. A 2000-game library builds thousands of nodes and initiates thousands of media loads simultaneously.

**H17 — `DOMParser` constructed per row, per render.**
`renderer/src/components/LibraryListView.tsx:95-106`

```ts
const getDescriptionPreview = (description?: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${description}</div>`, 'text/html');
```

Called inline in the map at `:486` and `:618` for every visible game, on every render of a component that is not `React.memo`'d. Heavy synchronous DOM construction in render. Should be precomputed once when the library loads, or memoized per game.

---

## Medium severity

### Scan lifecycle and concurrency

- **Cancellation is a single shared boolean with no reentrancy guard.** `main/ImportService.ts:66,88,142` — `scanAllSources` sets `this.isScanCancelled = false` on entry. The hourly background scan (`scanningHandlers.ts:216`), a manual `import:scanAllSources` (`:253`), and `scan:getMissingGames` (`:307`) can all run concurrently; whichever starts last un-cancels the others, and a single cancel kills all of them. Identical shape at `main/ipc/metadataHandlers.ts:242`.
- **No in-flight guard on `performBackgroundScan`.** `main/ipc/scanningHandlers.ts:48,216` — the hourly interval and the `app:performBackgroundScan` IPC can both enter simultaneously, each doing a full multi-source disk walk.
- **`runningGames` never drains.** `main/ipc/scanningHandlers.ts:12` — only cleared by an explicit `scanning:gameStopped` IPC (`:400`). If the renderer reloads or a game crashes, the set stays populated and background scanning is disabled for the rest of the session.
- **`startup:cancel-scan` doesn't cancel anything.** `main/startupCoordinator.ts:162-167` — sets `startupScanCancelled = true`, but that flag is only checked *before* `await performBackgroundScan(…)` at `:127`. Once the scan is running the button is a no-op; it never calls `importService.cancelScanAllSources()`.
- **Async `setInterval` callbacks with no overlap guard.** `main/ProcessSuspendService.ts:195,232` — fires every 1500 ms, and each tick runs `Get-CimInstance Win32_Process | ConvertTo-Json` (`:474-477`, 15 s timeout). On a loaded machine that regularly exceeds 1500 ms, so PowerShell processes pile up. Same shape in `startProcessMonitoring` (`:852,864`, 5000 ms).

### Synchronous I/O in hot paths

- `main/ipc/gameHandlers.ts:180-187` — `readdirSync(cacheDir)` on **every** `gameStore:getLibrary` call. The cache holds ~6 files per game, so a 1000-game library means a 6000-entry synchronous directory listing per library fetch.
- `main/GameFilteringService.ts:164` and `main/XboxService.ts:653` — `readdirSync(path, { recursive: true })` used only to compare a count against a threshold of 20 or 100. This fully enumerates an entire game install directory (tens of thousands of files, tens of GB) to answer a question that could short-circuit after 101 entries. Called per candidate in `isLikelyNonGame`, and **twice** when `source === 'manual'` (`:208` and `:227`).
- `main/LauncherDetectionService.ts:33` — `execFileSync('reg', …)` per registry value, called repeatedly from `detectLauncher`. Arguments are passed as an array so there is no injection surface, but it is synchronous process spawning on the main thread.

### Memory

- `main/MetadataCache.ts:11` — unbounded `Map` with a 24 h TTL checked only on read. `clearExpired()` (`:74`) has **zero callers** anywhere in the codebase. Each entry holds full metadata including descriptions and screenshot arrays, so a full-library refresh grows this monotonically for the process lifetime.
- `main/crashDumpAnalyzer.ts:52-60` — reads an entire `.dmp` into memory, then does two full-buffer string conversions with regex replaces:
  ```ts
  const buf = fs.readFileSync(filePath);
  const asciiText = buf.toString('ascii').replace(/[^\x20-\x7E\r\n]/g, '');
  const utf16Text = buf.toString('utf16le').replace(/[\x00-\x1F\x7F-\xFF]/g, '');
  ```
  A 200 MB dump costs roughly 600 MB peak RSS plus multi-second regex scans. Invoked unawaited at `main/main.ts:67`; declared `async` but contains no `await`, so it blocks synchronously regardless.
- `main/ImageCacheService.ts:253-281` — `chunks.push(chunk)` with no `Content-Length` check and no cumulative size cap, so a hostile or misconfigured metadata URL streams unbounded data into main-process memory. Non-200 responses including 301/302 CDN redirects are rejected rather than followed.

### Redundant store writes

`main/UserPreferencesService.ts:1515-1516, 1528-1530` — each `store.set` triggers a complete `JSON.stringify` + `writeFileSync` (see H1), and the reset path issues three consecutive `set` calls, writing the entire file three times. Same pattern at `main/GameStore.ts:206`.

### Renderer state and re-render cost

- **Context value not memoized.** `renderer/src/contexts/FocusContext.tsx:139-154` — the provider's `value` object is a fresh literal every render, so every consumer re-renders whenever the provider's parent does, even when `region` and `index` are unchanged.
- **Unstable default object cascades through the preference layer.** `renderer/src/hooks/useAppShellViewState.ts:40-50` — `defaultListViewOptions` is a fresh literal every render and feeds `useAppPreferences` as a dependency of `applyPreferences` (`useAppPreferences.ts:406`), so `applyPreferences` and `refreshPreferences` (`:489`) get new identities on every App render, cascading into `useRightClickMenuControls`. Should be a module-level constant.
- **Dead state driving full-App re-renders.** `renderer/src/hooks/useAppShellViewState.ts:163` — `const [_panelWidth, setPanelWidth] = useState(800)` is never returned or read, yet `setPanelWidth` is called from preference bootstrap and on every panel drag tick, re-rendering the entire tree for a value nothing consumes. The effect at `:185-193` also depends on `backgroundBlur` while setting it (self-triggering; terminates only because it converges to 0).
- **A second preference bootstrap fighting the first.** `renderer/src/components/GameDetailsPanel.tsx:367-399` — re-reads `getPreferences()` on mount and overwrites `panelWidths`, `fanartHeight`, `descriptionWidth`, `bottomBarHeight`, `visibleLinkTypes`, and `linkDisplayOrder` with disk values, while those same values arrive as props from App. CLAUDE.md states app-shell preferences are bootstrapped **once** at startup; this is exactly the "snaps back to saved values" class of bug it warns about.
- **Debounced save starved by unstable deps.** `renderer/src/components/GameDetailsPanel.tsx:460-489` — `onDetailsPanelBottomBarHeightChange` is in the dep array and is a new function every App render, so the 500 ms timer is cleared and restarted on every render. Under sustained re-render (typing in search) the save can be starved indefinitely, then fires a full multi-key `savePreferences` write when renders stop.
- **Stale closures in the resize handler.** `renderer/src/components/GameDetailsPanel.tsx:491-554` — the mousemove handler closes over four `on*Change` callbacks that are not in its dep array (`[isResizing, isResizingFanart, isResizingDescription, isResizingDescriptionWidth, isResizingBottomBar, viewKey]`). Since those callbacks are recreated every App render (H14), the drag keeps calling the versions captured when it started.
- **Selection force-reset and persisted.** `renderer/src/hooks/useAppShellSelection.ts:34-46` — any search or filter change that hides the selected game silently reassigns selection to `filteredGames[0]`, and `handleGameClick` (`:50`) persists it to disk.
- **Full preference re-apply long after bootstrap.** `renderer/src/hooks/useAppPreferences.ts:489-492` — `refreshPreferences` re-applies the entire preference set including `viewMode` (`:347`) and `activeGameId` (`:370`). Wired to `onSettingsImported` (`useRightClickMenuControls.ts:448`). This is the "later reloads" pattern CLAUDE.md warns against, and will snap view mode and active selection back to persisted values.
- **Intervals with no unmount cleanup.** `renderer/src/hooks/useGameLaunchFlow.ts:34-52, 59-71` — `setInterval(…, 2000)` in `monitorGameProcess` and `pollForGameProcess` is only cleared from inside its own callback. Nothing tracks them for teardown, and `monitorGameProcess`'s interval never clears if `checkProcessRunning` keeps returning `true` after unmount.
- **Global keydown listeners re-subscribed constantly.** `LibraryGrid.tsx:225-279` and `LibraryCardView.tsx:126-170` — dep arrays are `[items, focusedIndex, gameTilePadding, onGameClick]`; `focusedIndex` changes on every arrow press and `items`/`onGameClick` change on every App render, so the document listener is torn down and re-added continuously. Use refs for the mutable parts.

### Image loading

Zero rendered `<img>` in the renderer sets `decoding="async"`, and `loading="lazy"` appears in only two files (`GameCard.tsx:128`, `GameCardWide.tsx:55`).

Notably missing, all rendering full-resolution artwork into small frames:

| Location | Rendered into |
|---|---|
| `LibraryListView.tsx:301, 400, 514, 538` | 96–128 px boxart/logo/icon frames |
| `LibraryCoverFlow.tsx:475, 555` | 17 slots, each decoding full art **twice** (cover + reflection) |
| `LibraryCarousel.tsx` | carousel tiles |
| `GameManager.tsx:835` | 64×80 tile |
| `gameManager/ImageSearchResultsSections.tsx:41, 70` | 6–10 column thumbnails |

---

## Low severity

- `main/onyxLocalProtocol.ts:175-176` — `failedUrlCounts.set(requestUrl + '_success', …)` stores success counters in the same map used for the `MAX_TRACKED_URLS` bound, doubling entry count. The bound trips at half its nominal value, and the resulting `clear()` discards all failure-tracking state.
- `main/debugOptimizationLog.ts:70-74` — two synchronous writes per log line (`appendFileSync` plus a full `writeFileSync` of the crash-context tail), and the function is called ~10× per game in the optimization queue. Intended as dev-only but reachable in packaged builds via `ONYX_OPTIMIZATION_DEBUG=1`.
- `main/main.ts:700-760, 884-917` — dozens of `existsSync` calls for icon resolution on every window creation, plus a `statSync` in an error path (`:760`).
- `main/ImageCacheService.ts:244` — unguarded `new URL(url)` inside `getFilenameFromUrl`; a malformed URL throws from a non-obvious location instead of being skipped.
- `main/ipc/metadataHandlers.ts:85` — `Promise.all(urls.map(…))` issues an unthrottled probe per candidate image URL (each up to 4.5 s + 7 s), with no per-host limit. Search results can carry dozens of URLs.
- `renderer/src/App.tsx:602-605` — `setTimeout(() => setToast(null), 3000)` is never cleared. Overlapping toasts each schedule their own timer, so an earlier timer clears a newer toast, and nothing cancels on unmount.
- `renderer/src/utils/imagePrefetch.ts:3` — `warmedAssets` Set grows unbounded for the process lifetime, retaining every distinct URL including every cache-busted variant produced by H11. `prefetchVideo` (`:24`) also creates detached `<video>` elements that fetch metadata and are dropped without `src = ''`.
- `renderer/src/components/LibraryCardView.tsx:222` — `contentVisibility: 'auto'` without `containIntrinsicSize`. Skipped tiles collapse to zero height, causing scrollbar jumps and repeated layout invalidation while scrolling. `LibraryGrid.tsx:341-343` gets this right and is the reference.
- `renderer/src/components/LibraryCarousel.tsx:120` — `window.innerWidth` read during render with no resize subscription, so the selected tile size goes stale until some unrelated state change re-renders the carousel. `:184-235` attaches window `keydown` + `click` listeners with a 9-entry dep array including `selectedGame` and `handleGameSelect`, re-subscribing on essentially every render.
- `renderer/src/components/LibraryGrid.tsx:281` / `LibraryCardView.tsx:172` — `handleDragEnd` not memoized, so `DndContext` receives a new handler prop every render.
- `renderer/src/components/LibraryListView.tsx:58-68` — default `listViewOptions` is an inline object default parameter, giving it a new identity every render. The component is not `React.memo`'d, and cannot usefully be memoized until this is fixed.
- `renderer/src/contexts/FocusContext.tsx:83-99, 113-131` — DOM-poking fallbacks via `document.querySelector('[data-context-menu]').__focusConfirm`. Not a performance issue, but a correctness hazard if two menus are ever mounted simultaneously.

---

## Tooling, tests, and build configuration

### ESLint is close to inert

`eslint.config.mjs` enables only **5 rules**: `import/no-duplicates`, `no-dupe-else-if`, `@typescript-eslint/no-unused-vars` (warn), `react-hooks/rules-of-hooks`, and `react-hooks/exhaustive-deps` (warn). There is no type-aware linting — `parserOptions.project` is unset — so the installed `typescript-eslint` recommended set is entirely unused. `no-floating-promises`, which would have caught several findings above, is not available without it.

Scoped disables, in order of impact:

| Location | Effect |
|---|---|
| `eslint.config.mjs:93-103` | `react-hooks/exhaustive-deps` off for `App.tsx`, `GameManager.tsx`, `GameDetailsPanel.tsx`, `importer/ImportWorkbench.tsx` |
| `:77-81` | `no-unused-vars` off for **all** of `main/**/*.ts` |
| `:82-92` | `no-unused-vars` off again for four named files (redundant with the above for `ImportService.ts`) |
| `:9` | `reportUnusedDisableDirectives: 'off'` |
| `:11-20` | `scripts/**` entirely unlinted (~20 build/release scripts) |

The first row deserves emphasis: those four files are **precisely** where the stale-closure and unstable-dependency findings in this report were found (H14, and the `GameDetailsPanel` cluster in Medium). The rule that would have flagged them is disabled exactly there.

There are 14 `eslint-disable` comments in the repo, of which **11 are no-ops** — they suppress `no-var-requires` and `no-console`, neither of which is enabled anywhere. `reportUnusedDisableDirectives: 'off'` is why nobody noticed. Turning that setting on and deleting the dead directives is a free cleanup.

### Test coverage

23 test files against 63 non-test modules in `main/` and 168 files in `renderer/src` — roughly 19% of main modules have a colocated test, ~5% of renderer files.

Critical modules with **zero** tests, ranked by size and risk:

| Module | Lines | Note |
|---|---|---|
| `main/ImportService.ts` | 1998 | largest file in the repo |
| `main/ImageCacheService.ts` | 1643 | the documented crash area |
| `main/XboxService.ts` | 920 | H5, H12 live here |
| `main/ProcessSuspendService.ts` | 888 | disabled feature, fully written |
| `main/onyxLocalProtocol.ts` | 656 | security-sensitive protocol handler |
| `main/ipc/metadataHandlers.ts` | 999 | only `appHandlers` + `scanningHandlers` are tested |
| `main/ImageOptimizationQueue.ts` | 566 | H2, H4 live here |
| `main/SteamService.ts` / `SteamAuthService.ts` / `APICredentialsService.ts` | 566 / 415 / 281 | credential and auth paths |
| `main/scanners/*` | — | all three scanners untested |

Two configuration gaps worth fixing regardless of coverage work:

- `vitest.config.mts:8` includes `main/**/*.{test,spec}.ts` and `renderer/**/*.{test,spec}.tsx`. A `.test.ts` (non-TSX) file placed under `renderer/` is **silently skipped** — no error, it simply never runs.
- Root `tsconfig.json:23` includes only `renderer/src`, so `renderer/tests/**` is never type-checked by `npm run build`.

### TypeScript

Both `tsconfig.json` and `main/tsconfig.json` set `strict: true`, and there are **zero** `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` in the repo — genuinely clean.

Gaps: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, and `noPropertyAccessFromIndexSignature` are unset everywhere; `skipLibCheck: true` in both. `main/tsconfig.json` lacks the `noUnusedLocals` / `noUnusedParameters` / `noFallthroughCasesInSwitch` flags the renderer config has at `:19-21` — asymmetric strictness that compounds the ESLint gap above, since unused code in `main/` is policed by neither.

81 `as any` in non-test source. Worst offenders: `renderer/src/types/EditableGame.ts` (7), `components/gameProperties/useGamePropertiesImages.ts` (7), `components/gameManager/useGameManagerImageSearch.ts` (7), `contexts/FocusContext.tsx` (6), then 4 each in `hooks/useImportWorkbenchScan.ts`, `main/ipc/metadataHandlers.ts`, `main/ipc/appHandlers.ts`, `main/electronStoreShim.ts`, `main/GameStore.ts`.

`EditableGame.ts` is the one to look at first — casts concentrated in a *type-definition* module usually mean the declared model doesn't match the runtime shape, which is also consistent with the unvalidated-IPC observation in H13.

### Build and release configuration

**Update integrity has no second line of defense.** `electron-builder.config.js:28` sets `verifyUpdateCodeSignature: false`, `:34` sets `forceCodeSigning: false`, and `package.json:40` (`build:prod`) clears `CSC_IDENTITY_AUTO_DISCOVERY` and `WIN_CSC_LINK`. The app therefore ships unsigned **and** the updater does not verify signatures on downloaded updates. Updates are fetched over HTTPS from GitHub, so this is not trivially exploitable — but combined with the `electron-updater` credential-leak CVE below, it is the most significant supply-chain finding in the repo. This is flagged for a deliberate decision, not changed here.

Correct and worth noting: `asar: true` with `asarUnpack` for the image worker, sharp, semver, detect-libc, and `@img` (`:59-66`) is the right setup for sharp's native bindings; `nsis.allowElevation: false` + `perMachine: false` + `requestedExecutionLevel: 'asInvoker'` is a consistent per-user install; `mac: null, linux: null` matches the Windows-only codebase.

Minor: `vite.config.mts` leaves `build.sourcemap` unset (defaults to `false`) and `main/tsconfig.json:19` sets `sourceMap: false`, so production stack traces from users are unsymbolicatable. Consider `sourcemap: 'hidden'` if crash reports are ever to be read. `declaration: true` with `declarationMap: false` emits `.d.ts` into `dist-electron`, which the builder then explicitly excludes (`electron-builder.config.js:38`) — harmless but wasteful. `:42` includes `node_modules/**/*` wholesale which, with `compression: 'maximum'` (`:67`), is why builds are slow.

`dist/` and `dist-electron/` are present in the working tree — worth confirming `.gitignore` covers them.

### Code hygiene

Exactly **one** TODO/FIXME/HACK comment across ~25k lines of `main/` and ~45k lines of `renderer/src`:

- `main/MetadataFetcherService.ts:1173` — `// TODO: Add Epic, GOG, Xbox providers here when implemented`

Worth noting that `package.json` keywords advertise `epic`, `gog`, and `xbox`. `main/XboxService.ts` exists as a *scanner*, but metadata fetching for all three sources does not.

---

## What's already correct

Recorded so this ground isn't re-audited:

- **Electron boundary:** main window uses `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true` (`main/main.ts:995-997`), a `will-navigate` allowlist (`:1239`), and `setWindowOpenHandler` denying all (`:1249`).
- **Steam auth window** is sandboxed (`main/SteamAuthService.ts:101-103`).
- **`app:openExternal`** is protocol-allowlisted (`main/SecurityUtils.ts:20`); **`app:openPath`** is path-scoped (`main/ipc/appHandlers.ts:568-585`).
- **DevTools** are blocked when packaged (`main/ipc/appHandlers.ts:403`).
- **Preload discipline:** zero raw `window.ipcRenderer` anywhere in the renderer — the `check:no-raw-ipc` invariant holds. Everything goes through `window.electronAPI`.
- **Escaping patterns exist and are used correctly** in `LauncherService.ts:12`, `appHandlers.ts:225`, and `ImportService.ts:1612` — H12 is a gap in an otherwise consistent practice.
- **Code splitting is already applied** to `OnyxSettingsModal`, `MetadataSearchModal`, `ImportWorkbench`, `GameManager`, `BugReportModal` (`App.tsx:47-61`) and `LibraryCoverFlow` / `LibraryCarousel` / `WelcomeScreen` (`AppShellLibraryView.tsx`).
- **No barrel-import bloat** — `@dnd-kit` and `dompurify` are imported by name only.
- **Object URLs** are handled correctly: the single `createObjectURL` site (`MenuBar.tsx:329`) is revoked at `:336`.

---

## Dependency remediation

`npm audit` reported 11 vulnerabilities (8 high, 2 moderate, 1 low). Three affect the production runtime path and were remediated alongside this report; the rest are build/dev-time only (`postcss`, `vite`, `esbuild`, `brace-expansion`, `fast-uri`, `tar`, transitive `undici`).

| Package | Was | Now | Reason |
|---|---|---|---|
| `sharp` | `^0.34.5` | `^0.35.3` | 4 libvips CVEs (CVE-2026-33327 / 33328 / 35590 / 35591). Highest value: sharp processes arbitrary artwork downloaded from third-party metadata providers. |
| `electron-updater` | `^6.3.9` (locked 6.7.3) | `^6.8.9` | Cross-origin redirect leaks the `Authorization` / `PRIVATE-TOKEN` header. |
| `electron` | `^42.6.0` | `^42.8.1` | Chromium security patches. Staying on the 42.x line; **not** moving to 43. |
| `@types/dompurify` | `^3.2.0` | *removed* | Zero source references; dompurify ≥3 ships its own types. npm reported a phantom `current 3.2.0` vs `latest 3.0.5`. |

**The `sharp` bump required one source change.** 0.35 restructured its type exports: the module namespace (`typeof import('sharp')`) is no longer callable, and the callable factory now lives only on the default export. `main/ImageCacheService.ts:92` annotated `getSharp()` as returning the namespace type, which broke `tsc` with three errors (TS2739 at :98, TS2349 at :301 and :335). Fixed by introducing a `SharpModule` type alias pointing at the default export:

```ts
type SharpModule = (typeof import('sharp'))['default'];
async function getSharp(): Promise<SharpModule> {
```

This is type-only — no runtime behavior changed — and it is correct against both 0.34 and 0.35. `main/ImageOptimizerWorker.worker.ts:81` already modelled this correctly with its own local `SharpConstructor` type and needed no change.

**This is the one exception to the "no changes under `main/`" rule in this report.** It is a build fix for the approved dependency bump, not a remediation of any finding above.

`sharp` remains a native module inside `asarUnpack`, so the packaged build is still the meaningful test — see the verification note at the end of this section.

Post-install state: `npm ls` confirms `sharp@0.35.3`, `electron@42.8.1`, `electron-updater@6.8.9`. `npm audit --omit=dev` now reports **2 remaining** production-tree vulnerabilities, down from 8 high:

- **`fast-uri` 3.1.3 (high)** — reached via `electron-store@11.0.2 → conf@15.0.2 → ajv@8.20.0`. See the note below; this one may be removable outright.
- **`dompurify` 3.4.11 (low)** — direct dependency, fixed in 3.4.13. Genuinely low risk, but it is a one-line bump whenever convenient.

### `electron-store` appears to be dead weight in the production bundle

`electron-store` is a runtime `dependency`, ships inside the asar, and is the **sole source of the remaining high-severity `fast-uri` advisory**. But this repo replaced it with its own `main/electronStoreShim.ts`. A repo-wide search for `from 'electron-store'` / `require('electron-store')` outside `node_modules` returns exactly two hits, both dev-only test scripts:

- `scripts/test-credentials-migration.js:14`
- `scripts/test-credentials-migration-mock.js:1`

Nothing under `main/` or `renderer/src/` references it. If that holds under a dynamic-import check as well, moving `electron-store` to `devDependencies` removes the high-severity CVE from the shipped app *and* shrinks the bundle, at zero runtime cost. This was **not** changed here because it alters what gets packaged and warrants its own verification pass — but it is the cheapest remaining security win in the repo.

The same question applies to `dotenv` (`package.json:99`): a runtime dependency referenced only at `main/main.ts:188-189` inside a dev-looking `require`. It currently ships inside the asar.

Left deliberately unchanged: React 18, Vite 5, Tailwind 3, jsdom 28, and the other major-version pins, plus the patch-level drift on `axios`, `dotenv`, `semver`, `autoprefixer`, and `typescript-eslint`.

### Validation performed

| Check | Result |
|---|---|
| `npm run build` (tsc + vite + main + preload) | pass |
| `npm test` | pass — 23 files, 146 tests |
| `npm run lint` | 0 errors, 5 pre-existing warnings (`GamePropertiesPanel.tsx:213`, `RightClickMenu.tsx:322,768,794`, `useControllerNavigation.ts:479`) — all unrelated to these changes |
| sharp native binding smoke test | pass — sharp 0.35.3 / libvips 8.18.3, `concurrency()` and a `resize().webp().toBuffer()` round-trip both succeed |
| `npm run dist` (production profile) | pass — `release/Onyx.Setup.0.12.0.exe`; native deps rebuilt against Electron 42.8.1 |
| `npm run verify:packaged-optimizer` | pass |
| Packaged `asarUnpack` contents | pass — `@img/sharp-win32-x64/lib/sharp-win32-x64-0.35.3.node` present and unpacked; packaged `sharp/package.json` reports 0.35.3 |
| `npm run build:alpha` | pass — `release/Onyx.Alpha.Setup.0.12.0.exe` |
| Packaged alpha launch (runtime) | pass — app started, library grid and right-hand details panel rendered artwork correctly (boxart, hero, logo, screenshots); no crash dumps written; clean shutdown |

The runtime check was done with the **alpha** profile (`com.lasikiewicz.onyx.alpha`) so it used its own userData and could not touch the production library. `migrateAlphaUserDataFromOnyx()` was a no-op on this run — the alpha profile already had `.alpha-migrated-from-onyx` and its own `game-library.json`, so the `existsSync(marker)` guard at `main/main.ts:216` returned early.

**Field corroboration for H5 / H6 / H8:** during that launch the window sat in a Windows "Not Responding" state for roughly the first minute, painting an empty frame, before becoming responsive and rendering normally. The process was alive and accumulating CPU throughout — this is the main thread being blocked during startup, not a hang or a crash. It is direct evidence for the synchronous-startup findings above.

**sharp encode verified inside packaged Electron.** A live 10-game import was run against the alpha profile with `ONYX_OPTIMIZATION_DEBUG=1`. The scan found 10 titles across Steam, Epic, Xbox Game Pass and Ubisoft Connect; all imported and rendered correctly, taking the library from 37 to 47 games.

`optimization.log` (935 lines) shows the encode path fully exercised through the worker host:

- **60 `optimizeImage start` → 60 `optimizeImage worker done`** — 100% completion.
- **Zero** occurrences of `error`, `fail`, `exception`, `module-not-found`, `timeout`, or `no-gain`.
- Real compression, e.g. `234019 → 121764`, `267179 → 134293`, `133709 → 76188` bytes.
- Clean exit via the app's own Exit menu; no crash dumps; library intact at 47 games.

All 60 were `mode=static`; **no animated assets were encoded**, so the `spawnSync(ffmpeg)` path in H6 was not exercised by this run and remains untested at runtime.

**Field evidence for H4.** The same log quantifies the write amplification described above. That single 10-game import produced **11 full-library flushes** inside an 8.8-second window:

```
queue flushPending start gameId=xbox-AppMixtapeShipping-757ebf
GameStore flush start games=47
GameStore flush set games count=47      ← all 47 games re-serialised
GameStore flush done
queue flushPending done gameId=xbox-AppMixtapeShipping-757ebf
```

Each of those is a complete `JSON.stringify` + synchronous `writeFileSync` of the entire 308 KB pretty-printed library, once per optimized game. This is H1 and H4 combined, observed in a packaged build: 11 non-atomic whole-file writes where 1 would do.

**Still not verified:** the `electron-updater` 6.8.9 update flow (requires a published release to exercise) and the animated/ffmpeg encode branch (H6).

---

## Suggested order of work

Sequenced by value per unit of risk, not by severity alone:

1. **H1** (atomic store writes) — small, self-contained, and the only finding that can permanently destroy user data.
2. **H12** (PowerShell injection) — a few lines of validation; the codebase already has the pattern to copy.
3. **H9** (fullscreen infinite loop) — one hook, `useRef` instead of state, immediately observable.
4. **H11** (cache-buster churn) — already root-caused in the known-issues doc; fixes the logo flicker and removes a large amount of redundant image decoding.
5. **H2 / H3 / H4** (GameStore write path) — related, best done as one change; fixes the intermittent missing-artwork reports.
6. **H6 / H7** (sync ffmpeg and protocol I/O) — the main-thread freezes users actually feel.
7. **H5 / H8** (async-ify Xbox scan and startup migration) — larger refactors, schedule deliberately.
8. **H14 / H15 / H16 / H17** (renderer render cost) — highest payoff on large libraries; H14 first, since fixing it is what makes the existing `React.memo` calls start working.
9. Re-enable `react-hooks/exhaustive-deps` on the four excluded files and fix the fallout — this is what prevents the Medium-severity stale-closure findings from recurring.

Regression risk is concentrated in items 5–7; each warrants a test before the change, particularly given that `ImageCacheService`, `ImageOptimizationQueue`, and `GameStore`'s concurrent paths currently have no coverage.
