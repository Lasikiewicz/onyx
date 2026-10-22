# Game Launch and Process Tracking

## What This Feature Does

Launches games from multiple sources and tracks running state for UX actions (minimize/restore/background scan behavior).

## Related Documentation

- [Main View](./main-view.md) — game cards and [Game Details Panel](./main-view/components/game-details-panel.md) host Play buttons and launch actions.
- [Settings and preferences](./settings-and-preferences.md) — launch confirmation, minimize on launch, restore on exit.

## User-Facing Surfaces

- Launch buttons on game cards and game details views.
- Context menus and right-click launch actions ([GameContextMenu.tsx](../../renderer/src/components/GameContextMenu.tsx), [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx)).
- Running-state indicators and post-launch window behavior.
- Uninstall actions that can also remove the game from the Onyx library after the uninstall flow is opened.

## Settings and Toggles

- `Minimize on Game Launch`, `Restore Window on Game Exit`, `Confirm Game Launch` (persisted via [UserPreferencesService.ts](../../main/UserPreferencesService.ts)).
- Launcher and library configuration that determines whether launch targets are valid.

## Confirmed End-to-End Flows

1. Renderer invokes launch action from game card ([GameCard.tsx](../../renderer/src/components/GameCard.tsx)) or context menu; [App.tsx](../../renderer/src/App.tsx) delegates the callback to [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts).
2. Main [LauncherService.ts](../../main/LauncherService.ts) resolves launch target and spawns process/URI.
3. Process state is monitored and signaled back to renderer via IPC ([appHandlers.ts](../../main/ipc/appHandlers.ts)).
4. Renderer applies UI state changes (running status, minimize/restore behavior).
5. `Restore Window on Game Exit` only restores the window for launches that returned a concrete tracked PID and that Onyx itself minimized during launch.
6. When the user chooses `Uninstall`, [`App.tsx`](../../renderer/src/App.tsx) opens a confirmation dialog, [`LauncherService.ts`](../../main/LauncherService.ts) launches the detected uninstaller or Windows Settings fallback, and the shell can optionally remove the game from the library through the existing delete flow.
7. A launch started while Big Screen is active minimizes Onyx. If that launch reported a process id, the exit path calls `bigScreen.returnFromGame` instead of the normal restore, so the TV layout comes back fullscreen. A launch with no process id does not auto-return. See [Big Screen and controllers](./big-screen-and-controllers.md).

## Discovery and Data Sources

- Launch sources include executable paths, launcher-managed titles, and URI-based launch targets.
- Launcher resolution and process tracking live in [LauncherService.ts](../../main/LauncherService.ts) with supporting app bootstrap in [main.ts](../../main/main.ts).
- **Resolution order:** a stored `launchUri` on the game record is checked **first**, before any source-derived protocol branch. This is how Linux launcher integrations work — a Heroic-managed game carries `heroic://launch/<runner>/<appName>`, and routing through Heroic is what preserves the per-game Wine/Proton prefix, environment and wrappers Heroic was configured with. Spawning the game binary directly would discard all of it.
  - Xbox is the deliberate exception: its `shell:AppsFolder\…` URIs need `explorer.exe` rather than the shell's external handler, so the generic branch skips any `shell:`-prefixed URI and leaves those to the Xbox branch.
  - On Windows the only writer of `launchUri` is [XboxService.ts](../../main/XboxService.ts), and it only ever writes `''` or a `shell:` URI, so the generic branch is inert on Windows and existing libraries are unaffected.
- The Windows-only store protocols (`com.epicgames.launcher://`, `origin2://`, `goggalaxy://`, `uplay://`, `shell:AppsFolder\`) are gated behind `HAS_NATIVE_STORE_CLIENTS`; off Windows those branches fall through to a stored launch URI or a direct executable launch. `steam://` is **not** gated, because the native Linux Steam client registers that handler.
- Direct executable launch differs by platform: Windows goes through PowerShell `Start-Process` so UAC elevation prompts work, while other platforms `spawn` detached. On non-Windows the executable bit is checked first and a missing one is reported with the `chmod +x` command to run, because the raw spawn failure for that is an opaque `EACCES`.
- Uninstall fallback is platform-specific: with no uninstaller in the game folder, Windows opens `ms-settings:appsfeatures`; elsewhere there is no system equivalent, so the user is told to use their package manager or the launcher that installed the game. `UNINSTALLER_NAMES` gains `uninstall.sh`/`uninstall` on Linux only, so the file picked in a Windows game folder cannot change.
- Known title launchers that can be misidentified by generic executable scanning are normalized before launch. [knownGameLaunchers.ts](../../main/knownGameLaunchers.ts) currently redirects Neverness To Everness entries under the install root to `NTEGlobalLauncher.exe`, including older records that point at nested client executables or only the install folder.
- Running-state updates are emitted back to renderer through IPC/state events and local shell state managed in [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts).
- PID-less launches still use a timeout fallback to clear stale running state, but that fallback no longer triggers automatic window restore because exit timing is not reliable there.

## Data Model and Persistence

- Launch metadata is stored on the game record, including paths, launcher identifiers, and source details.
- Running process state is runtime-only and is held in [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts).
- The main process keeps its own copy in [scanningHandlers.ts](../../main/ipc/scanningHandlers.ts) purely to suppress background scanning during gameplay. It is a `Map<gameId, { pid?, startedAt }>`, not a bare `Set`, because the renderer's `scanning:gameStopped` is not guaranteed to arrive — a game crash, a renderer reload, or a torn-down monitor interval all leave the entry behind, and a single stale entry disabled background scanning for the rest of the session. Three independent drains cover that: `scanning:gameStarted` now carries the PID (`gameStarted(gameId, pid)` in [preload.ts](../../main/preload.ts)) so entries are verified with a `process.kill(pid, 0)` liveness check before each scan; PID-less entries (the poll-only launch path) expire after a 2-minute TTL, comfortably past the renderer's ~60s fallback poll; and `clearRunningGames()` runs on the main window's `did-finish-load`, since a fresh renderer has no monitors for anything the previous one reported.
- User preferences ([UserPreferencesService.ts](../../main/UserPreferencesService.ts)) govern launch confirmation and window behavior around active sessions.

## Failure Modes and Triage

### Symptom: Game launch button does nothing

- Verify executable/URI path exists and is valid.
- Check launcher configuration for that source ([LauncherService.ts](../../main/LauncherService.ts), [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts)).
- Inspect main-process launch errors in logs.

### Symptom: Running state never clears

- Confirm process PID tracking is correct in launcher/process handling.
- Check process existence polling/termination handling.
- Verify game stop events are being emitted to renderer.

### Symptom: background scanning stops happening for the rest of the session

- Check `runningGames` in [scanningHandlers.ts](../../main/ipc/scanningHandlers.ts): a non-empty map suppresses every background scan. `[BackgroundScan] Skipping scan - N game(s) currently running` with no game actually running means a drain is not firing.
- Confirm the renderer is passing `result.pid` into `scanning:gameStarted`; without a PID the entry can only be cleared by the slower TTL path.
- Confirm `clearRunningGames()` is still wired to the main window's `did-finish-load` in [main.ts](../../main/main.ts).

### Symptom: App minimizes or restores at the wrong time

- Confirm launch-behavior preferences were saved and reloaded ([UserPreferencesService.ts](../../main/UserPreferencesService.ts)).
- Check whether the launched target is actually being tracked as the active game process.
- Automatic restore is intentionally limited to launches with a real PID; URI/protocol launches without a tracked PID should not be expected to restore reliably. The same limit applies to returning to Big Screen.

## File Ownership Map

- **Main process**
  - [LauncherService.ts](../../main/LauncherService.ts)
  - [knownGameLaunchers.ts](../../main/knownGameLaunchers.ts)
  - [platformSupport.ts](../../main/platformSupport.ts) - platform flags gating the Windows-only store protocols and the PowerShell vs `spawn` launch paths.
  - [HeroicService.ts](../../main/HeroicService.ts) - produces the `heroic://launch/<runner>/<appName>` URIs the generic launch-URI branch consumes on Linux.
  - [LauncherDetectionService.ts](../../main/LauncherDetectionService.ts)
  - [ipc/appHandlers.ts](../../main/ipc/appHandlers.ts)
  - [main.ts](../../main/main.ts)
- **Renderer**
  - [App.tsx](../../renderer/src/App.tsx)
  - [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts)
  - [GameCard.tsx](../../renderer/src/components/GameCard.tsx)
  - [RightClickMenu.tsx](../../renderer/src/components/RightClickMenu.tsx)
  - [GameContextMenu.tsx](../../renderer/src/components/GameContextMenu.tsx)

## Process tracking and launch paths (2026-10)

- **Exe launches (Windows)** use `Start-Process -PassThru` and return the new PID. Arguments are passed as one pre-quoted command line (`main/windowsCommandLine.ts`), so values with spaces stay intact.
- **Protocol launches** (Steam, Epic, stored `launchUri`) return no PID. `LauncherService.watchForInstallDirProcess` polls `main/ProcessLookup.ts` (CIM process list, whole-segment install-directory match, helper executables skipped) for up to 90 s and publishes the match on `main/gameProcessEvents.ts` as `process-found`. `scanningHandlers` records the PID against the running game.
- **Epic** launches by AppName: `apps/<AppName>`. The scan stores the URI on import; older games get the AppName from the Epic manifest (`main/epicManifest.ts`) at launch and save it. No match falls back to the exe.
- **Double-launch guard:** `useGameLaunchFlow.launchGame` refuses a game that is running or still launching, and reports through the toast.
- **Playtime:** a finished session (normal stop, vanished process, or stale entry) emits `session-ended`; `main/playtime.ts` adds minutes and one play, with a 60 s minimum and a 24 h cap.
- **Folders are not executables:** launch returns "No executable set" when `exePath` points at a folder.
- **Not yet verified on Windows:** the restore-after-launch and background-scan pause scenarios, and the Epic launch. Both paths are unit-tested only.
