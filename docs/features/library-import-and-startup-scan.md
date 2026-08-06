# Library Import and Startup Scan

## What This Feature Does

Finds games from configured launchers/folders and imports them into the local library.

## Related Documentation

- [Add Games](./add-games.md) - staged import-review workspace for editing discovered games before they are committed to the library.
- [Settings and preferences](./settings-and-preferences.md) — [Libraries](./settings/libraries.md) and [Scanning](./settings/scanning.md) tabs for startup and background scan options.
- [Game launch and process tracking](./game-launch-and-process-tracking.md) — launcher resolution uses [LauncherService](../../main/LauncherService.ts) and [LauncherDetectionService](../../main/LauncherDetectionService.ts).
- [Metadata matching and enrichment](./metadata-matching-and-enrichment.md) — identity and matching during import.
- [Game Manager](./game-manager.md) - per-game maintenance modal that reuses import-adjacent cleanup, fix, and refresh workflows after games are already in the library.

## User-Facing Surfaces

- Initial startup scan flow.
- Manual library update/import dialogs.
- Add Games review/editor surfaces for per-title metadata, links, and artwork changes before import completes.
- Found games, missing games, and remove-deleted-games review dialogs.
- Startup scan progress and found-games review overlay in [`StartupScanOverlay.tsx`](../../renderer/src/components/appShell/StartupScanOverlay.tsx), mounted from [`AppShellOverlays.tsx`](../../renderer/src/components/appShell/AppShellOverlays.tsx).
- Settings surfaces for launcher configuration, library folders, and startup scanning.

## Settings and Toggles

- `Update Libraries on Startup`
- Background scanning enablement and interval
- Library folder configuration
- Launcher-specific install and library path configuration
- Automatic background scans are temporarily paused while the update notification modal is open, then resumed when the modal closes.

## Confirmed End-to-End Flows

1. Renderer starts scan from menu/settings/startup flow.
2. Main startup sequence initializes the packaged update service before the renderer can signal `app:ready`, then hands control to [startupCoordinator.ts](../../main/startupCoordinator.ts) to gate update checks, startup-scan timing, cancellation, and fallback startup.
3. [ImportService.ts](../../main/ImportService.ts) orchestrates launcher readers and normalization through pluggable source-scanner modules (starting with `main/scanners/SteamScanner.ts` and `main/scanners/XboxScanner.ts`), instead of keeping launcher-specific scan logic inline. Shared executable ranking lives in [executableSelection.ts](../../main/executableSelection.ts) so manual and launcher folder scans prefer true game launch binaries consistently.
4. Renderer-side update/import entry points keep effect dependencies explicit so reopening update/import flows does not rely on stale closures while lint guardrails around hook usage continue tightening.
5. [GameMatcher.ts](../../main/GameMatcher.ts) deduplicates and resolves identity.
6. Add Games review can adjust staged metadata and run the shared multi-provider image search/browse flow before import.
7. Staged edits that are represented on the `Game` model, such as categories, links, launch arguments, screenshots, and launcher-specific launch fields, are copied into the imported library record.
8. [GameStore.ts](../../main/GameStore.ts) persists the resulting game set.
9. Startup scans emit `startup:*` progress/new-game events so the startup overlay owns the UX, while recurring background scans avoid that startup-only progress UI and use `background:newGamesFound`.
10. Manual importer scans keep the main panel in a lightweight progress state until scanning completes; the full staged editor only mounts after scan-time discovery/metadata churn settles.

## Discovery and Data Sources

- Sources include configured launchers, manual library folders, and hardcoded known game paths.
- Folder scans include Unreal Engine `Binaries` trees and prefer `Binaries\Win64\*-Shipping.exe` launch binaries over shallow bootstrap executables when both are present. On Linux the same ranking applies to `Binaries/Linux/*-Linux-Shipping`, where the shipping binary carries no extension (or is a `.sh` launcher script) — see [executableSelection.ts](../../main/executableSelection.ts).
- **Which sources exist is platform-dependent, not just which paths they use.** [platformSupport.ts](../../main/platformSupport.ts) owns the platform seam and the Linux launcher-root tables, and [librarySourceDefaults.ts](../../renderer/src/utils/librarySourceDefaults.ts) owns the corresponding UI list:
  - **Windows:** Steam, Epic, EA App/Origin, GOG Galaxy, Ubisoft Connect, Battle.net, Xbox Game Pass, Humble, itch.io, Rockstar.
  - **Linux:** Steam, Epic (via Heroic), GOG (via Heroic, falling back to `~/GOG Games`), Lutris, Bottles, itch.io. Xbox Game Pass, EA App, Ubisoft Connect, Battle.net, Humble and Rockstar are omitted because no Linux client exists — listing them would only produce rows that can never match.
- Steam discovery on Linux probes every root the client can occupy, in preference order: `~/.steam/steam`, `~/.steam/root`, the pre-2019 `~/.local/share/Steam`, the Flatpak sandbox (`~/.var/app/com.valvesoftware.Steam/...`) and the Snap sandbox. `libraryfolders.vdf` parsing only folds forward slashes to native separators on Windows; doing so on Linux would mangle every path.
- Epic and GOG on Linux come from Heroic Games Launcher via [HeroicService.ts](../../main/HeroicService.ts), which reads `legendaryConfig/legendary/installed.json` (Epic) and `gog_store/installed.json` plus `store_cache/gog_library.json` (GOG) as plain JSON. No Heroic process or CLI is invoked. DLC entries are skipped because they share their parent's install directory and would otherwise import as duplicates. Native and Flatpak Heroic installs are both found.
- **Executable recognition is platform-specific**, owned by `describeGameExecutableCandidate` in [platformSupport.ts](../../main/platformSupport.ts) rather than by the scanners. Windows matches `.exe` only. Linux additionally matches `.x86_64`, `.x64`, `.x86`, `.appimage` and `.sh`, plus extension-less files carrying the executable bit — that last branch is restricted to names with no suffix at all, so asset trees (`.pak`, `.dat`, `.so.1`) never reach the extra `stat`. `.exe` remains in the Linux list because Steam and Heroic libraries are full of Windows builds run through Proton/Wine. Linux-only exclusion names and the `lib`/`lib64`/`lib32` directory skips are gated behind `!IS_WINDOWS` so they cannot change which executables a Windows scan finds.
- Configured source paths are resolved through `expandPathVariables` before any existence check, so `~`-prefixed Linux defaults and `%LOCALAPPDATA%`/`%USERPROFILE%` Windows defaults both work. This is also why itch.io, Humble and Rockstar now scan on Windows at all: their defaults are variable-based, the old code checked for a folder named literally `%LOCALAPPDATA%\itch`, and the source was skipped in silence despite defaulting to enabled.
- Hardcoded known game paths are Windows-only (they are all `C:\`-rooted) and include:
  - `C:\Program Files\Neverness To Everness` — automatically discovered if installed (specifically targets `NTEGlobalLauncher.exe`)
- When a hardcoded path match is found, scan results under that same install root are collapsed to the hardcoded entry so launcher support folders do not appear as separate games.
- Launcher detection and launcher-specific metadata come from [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts) and [LauncherService.ts](../../main/LauncherService.ts). Both the registry reads and the seven per-launcher probes are async and run in parallel; they were `execFileSync`, which blocked the main process for the whole detection pass.
- EA App / Origin discovery ([eaRegistry.ts](../../main/eaRegistry.ts)) does not work like the other launchers, because EA installs its client and its games into unrelated trees (`C:\Program Files\Electronic Arts\EA Desktop` vs `C:\Program Files\EA Games`). Three rules hold:
  - **The configured path is a games library root, never the client folder.** `detectEA` derives it from the per-game `Install Dir` values under `HKLM\SOFTWARE\[WOW6432Node\]EA Games\<title>`, then the well-known `EA Games`/`Origin Games` roots, and only stores the client directory as a last resort. It previously read an `Install Dir` value that EA Desktop does not write, fell through to Origin's `ClientPath`, and stored `EADesktop.exe` itself.
  - **`scanEA` does not trust that path.** It probes the well-known library roots and the registry on every scan, so a stale or client-pointing path still finds games, and `getEnabledConfigs` keeps the source enabled when the path is missing.
  - **The client folder is never walked as a library root.** `EAGEP.exe`, `Link2EA.exe`, `EACefSubProcess.exe` and friends all pass the generic executable filter and scan as games if it is.
- Xbox scanning ([XboxService.ts](../../main/XboxService.ts)) is fully asynchronous. Three constraints hold there and must survive future edits:
  - **No synchronous fs or `spawnSync`.** Directory walks use `fs.promises`, and every PowerShell call goes through the single `runPowerShell` helper (async `execFile`, `windowsHide`, bounded timeout and buffer). The scan previously recursed with `readdirSync`/`statSync` to depth 20 and made three `spawnSync` calls, freezing the UI for the duration.
  - **One `Get-AppxPackage` enumeration per scan, not per game.** `extractPackageInfo` runs once per game folder, and each run used to spawn its own PowerShell to resolve a PackageFamilyName — a 30-game Game Pass install paid 30 process startups, the dominant cost of an Xbox scan. The table is now loaded once by `loadPackageFamilyNames`, cached on the service, and cleared at the top of `scanGames` so a later scan still sees newly installed packages. Because the query no longer interpolates the manifest-supplied package name, that value never reaches a shell; the identity-grammar check on it remains as defence in depth.
  - **Junction cycles are bounded by identity, not depth.** `findExecutables` in both [XboxService.ts](../../main/XboxService.ts) and [ImportService.ts](../../main/ImportService.ts) threads a `visited` set of resolved real paths through the recursion. Both walks deliberately follow directory junctions, so without it a junction pointing at an ancestor is bounded only by `maxDepth` — 20 levels of re-walking the same subtree.
- `scanGames` dispatches on the *path string*: a path containing `XboxGames` takes the PC Game Pass branch, and one containing `WindowsApps` takes the UWP branch. Behaviour is pinned by [XboxService.test.ts](../../main/XboxService.test.ts).
- Matching uses known IDs, executable paths, launcher identifiers, and title heuristics.
- Renderer-side post-import maintenance flows launched from Game Manager now route through [useGameManagerRefresh.ts](../../renderer/src/components/gameManager/useGameManagerRefresh.ts), which owns refresh confirmation/progress state plus match-fix and boxart-fix continuation behavior after library updates are started from the manager.

## Data Model and Persistence

- Imported games are persisted in [GameStore.ts](../../main/GameStore.ts).
- User preferences ([UserPreferencesService.ts](../../main/UserPreferencesService.ts)) determine whether startup and background scans run automatically.
- Launcher and library configuration must remain stable across rescans to avoid duplicates.
- Importer staging trims oversized scan-time metadata arrays (currently screenshots and links) before storing them in renderer state so large scans remain stable.
- Scan cancellation is reference-counted. [ImportService.ts](../../main/ImportService.ts) tracks `activeScanCount` and only the outermost scan resets `isScanCancelled`, so overlapping background/manual/missing-games scans no longer un-cancel one another. `isScanInProgress()` exposes that state.
- [scanningHandlers.ts](../../main/ipc/scanningHandlers.ts) guards `performBackgroundScan` with an in-flight flag: the hourly interval and the `app:performBackgroundScan` IPC could otherwise both enter and run full multi-source disk walks concurrently.
- `startup:cancel-scan` in [startupCoordinator.ts](../../main/startupCoordinator.ts) invokes an injected `cancelBackgroundScan` callback (wired to `importService.cancelScanAllSources` in [main.ts](../../main/main.ts)). The `startupScanCancelled` flag alone is only checked *before* the scan begins, so without this the button did nothing once a scan was underway.
- Folder-size classification in [GameFilteringService.ts](../../main/GameFilteringService.ts) counts breadth-first and short-circuits once the large-folder threshold is exceeded, caching the verdict per folder. It previously used `readdirSync(path, { recursive: true })`, fully enumerating a multi-GB install just to compare a count against 20/100 — twice for `manual` sources.

## Failure Modes and Triage

### Symptom: the UI freezes during an Xbox or launcher scan

- Check for reintroduced synchronous calls: `grep -n "Sync(" main/XboxService.ts main/LauncherDetectionService.ts` should match nothing but the comments explaining why they were removed.
- Confirm `extractPackageInfo` still resolves package family names through the cached table rather than spawning PowerShell per game folder.
- Confirm no new PowerShell call bypasses the `runPowerShell` helper, which is what applies the timeout and `windowsHide`.

### Symptom: an Xbox scan takes far longer than the number of games suggests

- A junction cycle re-walks the same subtree up to `maxDepth` times. Confirm the `visited` set is still threaded through every recursive `findExecutables` call in both [XboxService.ts](../../main/XboxService.ts) and [ImportService.ts](../../main/ImportService.ts) — a call site that omits the argument silently starts a fresh set.

### Symptom: Startup scan never starts

- Confirm `updateLibrariesOnStartup` preference is true.
- Check update-check gate is not waiting forever.
- Confirm the update modal is not still open; startup/background scan work stays paused until that prompt is dismissed or completed.
- Verify `notifyAppReady()` is emitted from renderer through [preload.ts](../../main/preload.ts), which is the single source of truth for the preload contract.
- In packaged builds, confirm the update service initialized before the renderer handshake so the first startup update check can publish a completion status.

### Symptom: Scan runs but finds zero games

- Validate launcher paths/config in settings.
- Check per-launcher detection output from [`LauncherDetectionService`](../../main/LauncherDetectionService.ts).
- Verify any manual folders exist and are accessible.

### Symptom: an installed EA App game is never found

- Check the `[EA]` scan log lines. `Configured path is the EA client folder, not a games library` is expected and harmless — the scan continues into the well-known roots and the registry.
- Confirm the game is registered: `reg query "HKLM\SOFTWARE\WOW6432Node\EA Games" /s /v "Install Dir"`. If the game is absent there and is not under an `EA Games`/`Origin Games` root, nothing will find it; add its folder as a manual library instead.
- If the registry lists the game but the scan skips it, check for the `Registry lists "<name>" at a path that no longer exists` warning — EA leaves entries behind after an uninstall or a drive letter change.

### Symptom: Scan selects the wrong executable

- Check [executableSelection.ts](../../main/executableSelection.ts) ranking when a game ships both root bootstrap executables and nested game binaries.
- For Unreal Engine games, confirm the expected `Binaries\Win64\*-Shipping.exe` path exists and was not excluded by helper-executable filtering.
- Confirm the staged game's install path groups nested Unreal shipping binaries at the game/project directory rather than the platform folder.

### Symptom: Duplicate games appear

- Review matcher logic and ID conventions.
- Confirm source IDs remain stable between scans.
- Verify hardcoded-root collapse is active for known game paths (for example, Neverness To Everness) so nested launcher folders such as `Client` and `NTEGlobal` are not staged as separate games.

### Symptom: Games disappear after refresh

- Check missing-games and remove-deleted-games review flows.
- Confirm launcher or library source paths still exist and are accessible.

### Symptom: Startup scan opens the full importer immediately

- Confirm the scan was started through the startup path, which should emit `startup:newGamesFound` rather than `background:newGamesFound`.
- Check the renderer is listening for startup-overlay events separately from the recurring background scan importer flow.

### Symptom: Manual scan blanks the app or crashes the renderer

- Check whether the importer is mounting the lightweight scanning view first; the heavy staged editor should wait until `isScanning` is false.
- Confirm staged metadata is being trimmed before it is written into importer queue state, especially screenshots and links from multi-provider metadata.
- Inspect main-process renderer crash logs from `render-process-gone` for the crash reason and exit code.

### Symptom: App is "Not Responding" during a scan, or the tray icon won't restore the window until the scan finishes

- All filesystem I/O in [ImportService.ts](../../main/ImportService.ts)'s scanners (`findExecutables`, the per-launcher folder walkers, manifest/`.info` reads, and the Battle.net registry lookup) runs on the async `fs.promises`/`child_process.exec` APIs, not `*Sync`/`execSync`. The missing-games check in [scanningHandlers.ts](../../main/ipc/scanningHandlers.ts) (`app:performBackgroundScan`'s missing-game filter and the `scan:getMissingGames` handler) uses the same async `pathExists` pattern instead of `existsSync` per library game. Since Electron's main process is single-threaded, any sync fs/exec call in these paths blocks window paint/input and the tray's `click` handler ([main.ts](../../main/main.ts) `tray.on('click', ...)`) for as long as the call takes — reintroducing a `*Sync` or `execSync` call in a scanner or the missing-games check is the most likely cause of this symptom coming back.
- If a new scanner is added, use `fsp.readdir`/`fsp.stat`/`fsp.readFile`/`fsp.access` (see the `pathExists` helpers in `ImportService.ts` and `scanningHandlers.ts`) instead of the sync `node:fs` equivalents, and prefer `promisify(exec)`/`execFile` over `execSync` for any shell-out.

## File Ownership Map

- **Main process**
  - [main.ts](../../main/main.ts)
  - [startupCoordinator.ts](../../main/startupCoordinator.ts)
  - [ImportService.ts](../../main/ImportService.ts)
  - [executableSelection.ts](../../main/executableSelection.ts)
  - [platformSupport.ts](../../main/platformSupport.ts) - platform seam: platform flags, path-variable expansion, Linux launcher-root tables, and what counts as a game executable per platform.
  - [HeroicService.ts](../../main/HeroicService.ts) - reads Heroic Games Launcher's Epic and GOG install records, which is how those libraries exist on Linux.
  - [LauncherService.ts](../../main/LauncherService.ts)
  - [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts)
  - [GameMatcher.ts](../../main/GameMatcher.ts)
  - [GameStore.ts](../../main/GameStore.ts)
  - [UserPreferencesService.ts](../../main/UserPreferencesService.ts)
- **Preload bridge**
  - [preload.ts](../../main/preload.ts)
- **Renderer**
  - [App.tsx](../../renderer/src/App.tsx)
  - [gameManager/useGameManagerRefresh.ts](../../renderer/src/components/gameManager/useGameManagerRefresh.ts)
  - [FoundGamesModal.tsx](../../renderer/src/components/FoundGamesModal.tsx)
  - [UpdateLibraryModal.tsx](../../renderer/src/components/UpdateLibraryModal.tsx)
  - [MissingGamesModal.tsx](../../renderer/src/components/MissingGamesModal.tsx)
  - [RemoveDeletedGamesDialog.tsx](../../renderer/src/components/RemoveDeletedGamesDialog.tsx)
