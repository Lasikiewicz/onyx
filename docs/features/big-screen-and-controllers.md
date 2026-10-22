# Big Screen and Controllers

## What This Feature Does

Lets a gamepad drive the library, and adds a separate fullscreen TV layout so Onyx can be used from the couch and launched from a Moonlight host (Sunshine or Apollo) the way Steam Big Picture and Playnite Fullscreen are.

Controller movement uses the browser Gamepad API in the renderer. Raising Onyx while another window is focused uses a global keyboard shortcut, plus a Windows-only Xbox Guide-button watch in the main process. The desktop grid, list, and logo layouts stay in place. Big Screen replaces that chrome for the session and does not change the saved view mode.

## Related Documentation

- [App shell](./app-shell.md) — where the controller hook and the Big Screen swap sit in the root layout.
- [Main view](./main-view.md) and [Games list](./main-view/components/games-list.md) — desktop highlight movement.
- [Game details panel](./main-view/components/game-details-panel.md) — desktop action row (Play, Favorite, and the rest). Big Screen uses its own Play button instead of this panel.
- [Menu bar](./main-view/components/menu-bar.md) — the Big Screen menu item.
- [Settings General](./settings/general.md) and [Settings and preferences](./settings-and-preferences.md) — persisted toggles.
- [Game launch and process tracking](./game-launch-and-process-tracking.md) — returning to Big Screen after a tracked game exits.
- [Suspend and resume](./suspend-and-resume.md) — the bring-to-front shortcut must not reuse the suspend shortcut.

## User-Facing Surfaces

- Desktop library: D-pad and left stick move the highlighted game in grid, list, and logo. A focus ring (`.controller-focus` in [index.css](../../renderer/src/index.css)) is drawn because a programmatic focus does not match `:focus-visible`.
- Desktop actions, from [Settings General](./settings/general.md): A moves to the action row and confirms, B goes back, X opens the game menu, Y favorites the highlighted game, View focuses search, Menu opens the app menu, and the shoulder buttons change category. Button names follow the Button Labels setting (Xbox or PlayStation). The mapping itself is the standard gamepad mapping.
- Big Screen ([BigScreenShell.tsx](../../renderer/src/components/bigScreen/BigScreenShell.tsx)): large poster tiles, a hero, Play and Favorite, a search field, controller hints ([ControllerHints.tsx](../../renderer/src/components/bigScreen/ControllerHints.tsx)), and an on-screen keyboard ([OnScreenKeyboard.tsx](../../renderer/src/components/bigScreen/OnScreenKeyboard.tsx)). A plays the highlighted game. B leaves Big Screen when no overlay is open. Menu toggles the Big Screen menu (Search, Settings, Exit). View opens search and the on-screen keyboard.
- Entry points: the Onyx menu item "Big Screen" in [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx), Settings > General > Enter Big Screen, the `startInBigScreen` preference, and the `--big-screen` launch flag.
- Settings > General > Moonlight, Sunshine, and Apollo ([SettingsSunshineSection.tsx](../../renderer/src/components/settings/SettingsSunshineSection.tsx)) lists detected `apps.json` files and asks before adding or removing "Onyx Big Screen".
- While a settings dialog, confirmation, context menu, on-screen keyboard, or Big Screen menu is open, the D-pad moves between its buttons instead of the library. Those surfaces are marked `data-spatial-root`.

## Settings and Toggles

Stored by [UserPreferencesService.ts](../../main/UserPreferencesService.ts). Defaults:

| Setting | Key | Default |
| --- | --- | --- |
| Controller Navigation | `enableGamepadSupport` | on |
| Button Labels | `gamepadButtonLayout` | `playstation` |
| Navigation Repeat | `gamepadNavigationSpeed` | `180` (clamped to 100–650 ms) |
| Bring Onyx to Front | `enableBringToFrontShortcut` | on |
| Bring-to-Front Shortcut | `bringToFrontShortcut` | `Ctrl+Shift+G` |
| Xbox Guide Button | `enableGuideButtonWake` | on |
| Start in Big Screen | `startInBigScreen` | off |
| Display | `bigScreenDisplay` | `current` |

`current` fullscreens the display the window is already on. `primary` uses the primary display. A numeric display id uses that display. `--big-screen` enters Big Screen for that launch and does not write `startInBigScreen`. `--big-screen-display=primary`, `current`, or a display id overrides the saved display for that launch. An unrecognized display value falls back to `current`.

The renderer starts with controller polling off until preferences load, so a test window that never returns the preference does not start a gamepad loop. After a normal load the default is on.

Carousel and cover flow still skip the controller loop. Big Screen always navigates its own tile grid, including when the saved desktop view is carousel or cover flow.

## Confirmed End-to-End Flows

1. A focused Onyx window polls `navigator.getGamepads()` from [useControllerNavigation.ts](../../renderer/src/hooks/useControllerNavigation.ts). Directions repeat at `gamepadNavigationSpeed`. Other buttons fire on the press edge.
2. On the desktop, A enters the action row on the highlighted game (Play is focused first). A second A activates the focused action. B returns to the game list. X opens the game context menu. B closes an open game menu, shell menu, or app menu before it does anything else.
3. Choosing Big Screen calls `bigScreen.enter` through [preload.ts](../../main/preload.ts). [bigScreenHandlers.ts](../../main/ipc/bigScreenHandlers.ts) asks [bigScreenWindow.ts](../../main/bigScreenWindow.ts) to show the window, move it onto the chosen display, and fullscreen it. [useBigScreenMode.ts](../../renderer/src/hooks/useBigScreenMode.ts) swaps in the TV shell. The saved `viewMode` is left alone.
4. Launching with `--big-screen`, or with `startInBigScreen` saved, does the same after the window finishes loading, including when startup would otherwise stay in the tray. A second instance started with `--big-screen` focuses the existing window, enters Big Screen, and tells the renderer with `big-screen:requested`.
5. Escape during a Big Screen session is sent to the renderer as `big-screen:escape`. The topmost overlay with `data-spatial-dismiss` closes. If none is open, Big Screen exits. F11 still toggles fullscreen. If fullscreen stays off, the TV layout exits after a short wait so a display move (which leaves fullscreen for a moment) does not drop the user back to the desktop.
6. Leaving Big Screen calls `bigScreen.exit`. The window returns to the fullscreen state it had before the session. While the session is active, [main.ts](../../main/main.ts) persists that earlier fullscreen flag, so quitting during Big Screen does not force the next desktop launch into fullscreen.
7. Launching a game from Big Screen minimizes Onyx even when Minimize on Game Launch is off. When that launch has a tracked process id and the process exits, [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts) calls `bigScreen.returnFromGame`, which shows and fullscreens the window again if the session is still active. A protocol launch that never reports a process id does not auto-return. Ctrl+Shift+G or the Guide button brings Onyx forward instead.
8. The bring-to-front shortcut is registered at startup and again when settings are saved ([bringToFrontService.ts](../../main/bringToFrontService.ts)). If Suspend/Resume is enabled and the two accelerators normalize to the same keys, the bring-to-front shortcut is not registered and Settings reports that. The Guide button never calls suspend.
9. Sunshine or Apollo: see the host entry below. The in-app helper only writes after confirmation.

### Moonlight host entry

Sunshine and Apollo keep the app list in `apps.json`. The stream follows `cmd`. `detached` commands are started and not tracked. `prep-cmd` is a list of `{ "do", "undo" }` commands run around the session. `image-path` is box art, next to `apps.json` or as an absolute path. `auto-detach: true` drops the stream off `cmd` as soon as it starts, which is what people use for `steam://open/bigpicture` because that protocol returns immediately. Playnite Fullscreen is a long-running window, so its entry keeps `auto-detach` false and usually sets `wait-all` true so a game it launches can keep the stream.

Onyx Big Screen matches the Playnite shape. A production install is typically:

```json
{
  "name": "Onyx Big Screen",
  "cmd": "\"C:\\Program Files\\Onyx\\Onyx.exe\" --big-screen",
  "image-path": "onyx-big-screen.png",
  "elevated": false,
  "auto-detach": false,
  "wait-all": true,
  "exclude-global-prep-cmd": false,
  "detached": [],
  "prep-cmd": []
}
```

Optional display override, appended to `cmd`: `--big-screen-display=primary`, `--big-screen-display=current`, or `--big-screen-display=<id>`.

The helper copies [resources/onyx-big-screen.png](../../resources/onyx-big-screen.png) beside `apps.json` and sets `image-path` to that copy. A packaged app uses its own executable path, quoted with the same Windows command-line rules as [windowsCommandLine.ts](../../main/windowsCommandLine.ts). It looks for `apps.json` only in:

- `%ProgramFiles%\Sunshine\config\apps.json` and the Apollo equivalent
- `%ProgramFiles(x86)%\Sunshine\config\apps.json` and the Apollo equivalent
- `%LOCALAPPDATA%\Sunshine\config\apps.json` and the Apollo equivalent
- `~/.config/sunshine/apps.json` and `~/.config/apollo/apps.json`
- `~/.var/app/dev.lizardbyte.app.Sunshine/config/sunshine/apps.json`

It does not create `apps.json` if the file is missing. It refuses files over 2 MB. Before a write it copies the file to `apps.json.onyx-backup-<timestamp>`, writes a temp file, and renames it over `apps.json`. Add replaces every app named "Onyx Big Screen" with this one entry and leaves every other app alone. Remove deletes an entry only when the name is "Onyx Big Screen" and `cmd` contains `--big-screen`. A same-named app with a different command is left unchanged. A development build shows the command preview and refuses to write, so the entry cannot point at the Electron binary.

## Discovery and Data Sources

- Focused input: Chromium's Gamepad API (`standard` mapping). Button 0 is A/Cross, 1 is B/Circle, 2 is X/Square, 3 is Y/Triangle, 4 and 5 are the shoulders, 8 is View/Create, 9 is Menu/Options, 12–15 are the D-pad, and 16 is Guide when the browser reports it. Left stick is axes 0 and 1. Non-standard D-pad axes 6 and 7 and hat axis 9 are also read. The stick deadzone is 0.55.
- The Gamepad API does not deliver input while the Onyx window is unfocused. The global shortcut and the Guide watch cover that case.
- Guide uses `XInputGetStateEx` (xinput1_4.dll ordinal 100) because the public `XInputGetState` does not report the Guide bit (`0x0400`). Koffi loads that ordinal as the number 100. A prototype string such as `#100` does not parse, and the Guide watch then stays off. The poll runs every 200 ms for user indexes 0–3 and only on Windows. If the DLL or the ordinal cannot be loaded, the keyboard shortcut still works and the failure is logged.
- Displays come from Electron `screen` through [displayChoice.ts](../../main/displayChoice.ts).
- Sunshine and Apollo are discovered only by the known `apps.json` paths above. Nothing is read from the network.

## Data Model and Persistence

- Preferences listed above live in the user-preferences store. New fields flow through `normalizePreferences` with the defaults.
- The Big Screen session (`active`, `displayChoice`, `wasFullscreen`) is memory only, in [bigScreenSession.ts](../../main/bigScreenSession.ts). Entering again while already active updates the display and keeps the original `wasFullscreen`.
- `activeGameId` is still saved when the highlight moves, because selection uses the existing click path. A long D-pad sweep writes that preference as the highlight changes.
- Sunshine writes stay in the host's `apps.json` plus `onyx-big-screen.png` beside it. Onyx does not keep a second copy of that list.

## Failure Modes and Triage

### Symptom: The controller does nothing while Onyx is focused

- Confirm Controller Navigation is on and the page has loaded preferences. The hook stays off until that load, and it stays off in carousel and cover flow on the desktop.
- Confirm the browser reports a gamepad (`navigator.getGamepads()`). A pad with no standard mapping can still move if its D-pad or left stick crosses the deadzone. Buttons that are not in the standard indexes are ignored.
- `window.__onyxControllerDebug` shows the last sampled buttons, axes, and routed action while the hook is enabled.

### Symptom: Guide or Ctrl+Shift+G does not raise Onyx

- The shortcut is registered at startup and again when settings are saved. If it matches the enabled Suspend/Resume shortcut (default `Ctrl+Shift+S`), it is refused on purpose. Pick a different accelerator.
- Another application may already own the accelerator. The settings save reports that.
- Guide works only on Windows, only for XInput devices, and only when xinput1_4.dll exports ordinal 100. PlayStation and generic pads use the keyboard shortcut. Guide never suspends a game.

### Symptom: Big Screen does not cover the TV

- Check Display in Settings, or pass `--big-screen-display=primary` (or a display id from the Settings list).
- `--big-screen` and `startInBigScreen` show the window even when Start Closed to Tray is on.

### Symptom: The desktop layout comes back as soon as Big Screen opens on another display

- Moving displays leaves fullscreen for a moment. The renderer waits and re-reads fullscreen state before exiting. If it still drops out, confirm `fullscreen-changed` is not being forced false by something other than that move.

### Symptom: Onyx stays minimized after the game exits

- Return is limited to launches that reported a process id and that were started while Big Screen was active. Protocol launches without a pid do not auto-return. Use the bring-to-front shortcut or Guide.

### Symptom: The Sunshine entry was not written

- The file must already exist on a known path, be at most 2 MB, and be selected in Settings. The app must be a packaged build. A development build refuses the write.
- Add and remove both ask for confirmation first. A backup named `apps.json.onyx-backup-<timestamp>` is written beside the file before a successful change.
- Remove refuses to touch an app named "Onyx Big Screen" whose command does not contain `--big-screen`.

### Symptom: Game Manager, Add Games, or the importer ignores the controller

- Those surfaces are not spatial targets yet. Controller input is swallowed while they are open and no `data-spatial-root` is active. Close them with the mouse or keyboard, or leave Big Screen and use the desktop.

## File Ownership Map

- **Renderer**
  - [App.tsx](../../renderer/src/App.tsx) — enables the controller hook and swaps the TV shell in for the desktop chrome.
  - [useControllerNavigation.ts](../../renderer/src/hooks/useControllerNavigation.ts) — Gamepad API polling, button mapping, library movement, and spatial overlay routing.
  - [useBigScreenMode.ts](../../renderer/src/hooks/useBigScreenMode.ts) — TV-layout session, launch-flag boot, Escape, and fullscreen exit.
  - [useGameLaunchFlow.ts](../../renderer/src/hooks/useGameLaunchFlow.ts) — minimize on a Big Screen launch and return after a tracked process exits.
  - [BigScreenShell.tsx](../../renderer/src/components/bigScreen/BigScreenShell.tsx) — TV layout.
  - [ControllerHints.tsx](../../renderer/src/components/bigScreen/ControllerHints.tsx) — footer button hints.
  - [OnScreenKeyboard.tsx](../../renderer/src/components/bigScreen/OnScreenKeyboard.tsx) — search keyboard.
  - [spatialNavigation.ts](../../renderer/src/utils/spatialNavigation.ts) — direction picking inside an overlay.
  - [controllerLabels.ts](../../renderer/src/utils/controllerLabels.ts) — Xbox and PlayStation hint names.
  - [SettingsGeneralTab.tsx](../../renderer/src/components/settings/SettingsGeneralTab.tsx) and [SettingsSunshineSection.tsx](../../renderer/src/components/settings/SettingsSunshineSection.tsx) — settings and the host helper.
  - [useOnyxSettingsModalPersistence.ts](../../renderer/src/hooks/useOnyxSettingsModalPersistence.ts) — saves the new preferences and re-registers the wake shortcut.
- **Main process**
  - [launchFlags.ts](../../main/launchFlags.ts) — `--big-screen` and `--big-screen-display`.
  - [displayChoice.ts](../../main/displayChoice.ts) — display selection.
  - [bigScreenSession.ts](../../main/bigScreenSession.ts) — in-memory session.
  - [bigScreenWindow.ts](../../main/bigScreenWindow.ts) — move, fullscreen, return, and focus.
  - [ipc/bigScreenHandlers.ts](../../main/ipc/bigScreenHandlers.ts) — IPC for Big Screen and Sunshine.
  - [bringToFrontService.ts](../../main/bringToFrontService.ts) — global shortcut and Guide watch.
  - [acceleratorConflict.ts](../../main/acceleratorConflict.ts) — shortcut collision with Suspend/Resume.
  - [xinputGuide.ts](../../main/xinputGuide.ts) and [xinputGuidePoller.ts](../../main/xinputGuidePoller.ts) — Guide edge and Windows poll.
  - [sunshineApps.ts](../../main/sunshineApps.ts) — `apps.json` entry, paths, and safe add/remove rules.
  - [preload.ts](../../main/preload.ts) — `bigScreen` and `sunshine` bridge.
  - [main.ts](../../main/main.ts) — startup flag, second instance, Escape, fullscreen persistence, and wake registration.
  - [UserPreferencesService.ts](../../main/UserPreferencesService.ts) — preference defaults.
- **Packaging**
  - [onyx-big-screen.png](../../resources/onyx-big-screen.png) — box art, also shipped by [electron-builder.config.js](../../electron-builder.config.js).
