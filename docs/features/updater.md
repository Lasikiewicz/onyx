# Updater and Release Install

## What This Feature Does

Checks for new versions, offers download, and installs updates for packaged builds.

## Related Documentation

- [Settings and preferences](./settings-and-preferences.md) — [About](./settings/about.md) tab hosts update area; update-check preference.
- [Settings / About](./settings/about.md) — update UI and packaged-state handling.

## User-Facing Surfaces

- `Onyx Settings` -> `About` tab update area ([OnyxSettingsModal.tsx](../../renderer/src/components/OnyxSettingsModal.tsx)).
- Update notification modal ([UpdateNotificationModal.tsx](../../renderer/src/components/UpdateNotificationModal.tsx)) and startup update messaging. When the changelog view is shown, the modal body uses a flex layout so the changelog panel expands to fill the available dialog height and becomes the scroll container.
- App-level renderer state in [App.tsx](../../renderer/src/App.tsx) that shows update progress and download/install actions.
- Shell update/changelog runtime state in [useAppShellSystemState.ts](../../renderer/src/hooks/useAppShellSystemState.ts), which owns changelog fetches, background-scan pause/resume while the update modal is visible, and the renderer-side update action callbacks.
- Development-only `Help -> Develop -> Open Update Found` preview in [MenuBar.tsx](../../renderer/src/components/MenuBar.tsx) now targets the newest parsed changelog data and shows the latest three changelog entries so local modal testing reflects a realistic multi-release update view.
- While the update modal is visible, the renderer pauses automatic background library scanning through the preload bridge so update prompts are not interrupted by scan-driven importer dialogs.

## Settings and Toggles

- `Check for Updates on Startup` in the scanning settings tab gates startup update checks.
- Packaged-versus-development runtime state determines whether updater actions are available.

## Confirmed End-to-End Flows

1. UI triggers check from settings/about or menu.
2. Renderer calls preload API (`checkForUpdates`, `downloadUpdate`, `quitAndInstall`) ([preload.ts](../../main/preload.ts)).
3. Main process routes to [AppUpdateService.ts](../../main/AppUpdateService.ts).
4. [AppUpdateService](../../main/AppUpdateService.ts) emits status events (`checking`, `available`, `not-available`, `downloading`, `downloaded`, `error`), and download progress now carries a numeric percent for the modal progress bar while an update is being fetched. That progress path now covers both the standard `electron-updater` download flow and the alpha GitHub asset download flow when the asset response includes `content-length`.
5. [useAppShellSystemState.ts](../../renderer/src/hooks/useAppShellSystemState.ts) receives the renderer-side update state from [App.tsx](../../renderer/src/App.tsx), fetches matching changelog content when a version is known, and exposes the update actions used by the modal.

Alpha builds use GitHub Releases API prerelease selection logic. Production uses `electron-updater` feed behavior.

## Discovery and Data Sources

- Update source is GitHub releases and packaged-app update metadata.
- Main orchestration lives in [AppUpdateService.ts](../../main/AppUpdateService.ts).
- Startup coordination with library scan/update prompts runs through [main.ts](../../main/main.ts) and renderer app readiness state.
- The renderer fetches the full changelog source through `app:getChangelog`, parses version sections from `CHANGELOG.md`, and renders grouped per-version release bullets in the update modal, split into `New features` and `Fixed issues`, instead of a raw preformatted markdown block.

## Data Model and Persistence

- Updater state is mostly runtime state rather than long-lived user data.
- Startup update-check preference is persisted in [UserPreferencesService.ts](../../main/UserPreferencesService.ts).
- Downloaded installer/update artifacts are managed by Electron updater infrastructure and release assets.
- Runtime download progress is transient renderer/main-process state carried over `app:update-status`; it is not persisted.

## Failure Modes and Triage

### Symptom: Stuck on "Checking..."

- Confirm runtime is packaged (`app:isPackaged`), not dev.
- Confirm status events are received in renderer (`onUpdateStatus` in [App.tsx](../../renderer/src/App.tsx)).
- Confirm timeout fallback in settings UI is not removed.

### Symptom: Update available but cannot download

- Check GitHub release assets include installer executable.
- Verify network access and no API response HTML/error page.
- Inspect update error sanitization output in UI.

### Symptom: Startup scan blocks after update check

- Verify `app:update-found` and `app:update-dismissed` coordination events fire.
- Check startup wait loop logic in [main.ts](../../main/main.ts).

### Symptom: Update controls do not appear

- Expected in development mode.
- Confirm the About tab is reading packaged-state flags correctly ([settings/about.md](./settings/about.md)).

## File Ownership Map

- **Main process**
  - [AppUpdateService.ts](../../main/AppUpdateService.ts)
  - [main.ts](../../main/main.ts)
  - [ipc/appHandlers.ts](../../main/ipc/appHandlers.ts)
- **Preload bridge**
  - [preload.ts](../../main/preload.ts)
- **Renderer**
  - [OnyxSettingsModal.tsx](../../renderer/src/components/OnyxSettingsModal.tsx)
  - [UpdateNotificationModal.tsx](../../renderer/src/components/UpdateNotificationModal.tsx)
  - [App.tsx](../../renderer/src/App.tsx)
  - [useAppShellSystemState.ts](../../renderer/src/hooks/useAppShellSystemState.ts)
  - [types/game.ts](../../renderer/src/types/game.ts)
- **Build/release config**
  - [`electron-builder.config.js`](../../electron-builder.config.js)
  - [`package.json`](../../package.json)
