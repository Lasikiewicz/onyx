# Updater and Release Install

## What This Feature Does

Checks for new versions, offers download, and installs updates for packaged builds.

## User-Facing Surfaces

- `Onyx Settings` -> `About` tab update area.
- Update notification modal and startup update messaging.
- App-level renderer state that shows update progress and download/install actions.

## Settings and Toggles

- `Check for Updates on Startup` in the scanning settings tab gates startup update checks.
- Packaged-versus-development runtime state determines whether updater actions are available.

## Confirmed End-to-End Flows

1. UI triggers check from settings/about or menu.
2. Renderer calls preload API (`checkForUpdates`, `downloadUpdate`, `quitAndInstall`).
3. Main process routes to `AppUpdateService`.
4. `AppUpdateService` emits status events (`checking`, `available`, `not-available`, `downloading`, `downloaded`, `error`).
5. Renderer updates modal/button state from `app:update-status`.

Alpha builds use GitHub Releases API prerelease selection logic. Production uses `electron-updater` feed behavior.

## Discovery and Data Sources

- Update source is GitHub releases and packaged-app update metadata.
- Main orchestration lives in `AppUpdateService`.
- Startup coordination with library scan/update prompts runs through `main.ts` and renderer app readiness state.

## Data Model and Persistence

- Updater state is mostly runtime state rather than long-lived user data.
- Startup update-check preference is persisted in user preferences.
- Downloaded installer/update artifacts are managed by Electron updater infrastructure and release assets.

## Failure Modes and Triage

### Symptom: Stuck on “Checking...”

- Confirm runtime is packaged (`app:isPackaged`), not dev.
- Confirm status events are received in renderer (`onUpdateStatus`).
- Confirm timeout fallback in settings UI is not removed.

### Symptom: Update available but cannot download

- Check GitHub release assets include installer executable.
- Verify network access and no API response HTML/error page.
- Inspect update error sanitization output in UI.

### Symptom: Startup scan blocks after update check

- Verify `app:update-found` and `app:update-dismissed` coordination events fire.
- Check startup wait loop logic in main process.

### Symptom: Update controls do not appear

- Expected in development mode.
- Confirm the About tab is reading packaged-state flags correctly.

## File Ownership Map

- Main process
  - `main/AppUpdateService.ts`
  - `main/main.ts`
  - `main/ipc/appHandlers.ts`
- Preload bridge
  - `main/preload.ts`
- Renderer
  - `renderer/src/components/OnyxSettingsModal.tsx`
  - `renderer/src/components/UpdateNotificationModal.tsx`
  - `renderer/src/App.tsx`
  - `renderer/src/types/game.ts`
- Build/release config
  - `electron-builder.config.js`
  - `package.json`
