# Settings and Preferences

## What This Feature Does

Defines the application-wide configuration surface for startup behavior, window behavior, visuals, scanning, library sources, third-party integrations, links, maintenance actions, suspend resume, and app information.

This parent file is the settings overview and routing document. Detailed behavior for each main tab lives in the settings sub-runbooks under `docs/features/settings/`.

## User-Facing Surfaces

- `Onyx Settings` modal.
- Main settings tabs:
  - `General` -> `docs/features/settings/general.md`
  - `Animations` -> `docs/features/settings/animations.md`
  - `Scanning` -> `docs/features/settings/scanning.md`
  - `Libraries` -> `docs/features/settings/libraries.md`
  - `API Integrations` -> `docs/features/settings/api-integrations.md`
  - `Link Management` -> `docs/features/settings/link-management.md`
  - `Advanced` -> `docs/features/settings/advanced.md`
  - `Suspend Resume` -> `docs/features/settings/suspend-resume.md`
  - `About` -> `docs/features/settings/about.md`

## Settings and Toggles

- This feature owns the app's complete settings surface.
- Detailed toggle inventories are maintained in the tab-specific runbooks.
- Shared persistence is centered on `UserPreferencesService`, with some tabs also calling dedicated IPC or credential storage APIs.

## Confirmed End-to-End Flows

1. Renderer opens `OnyxSettingsModal` and loads current settings state.
2. User edits values in one or more tabs.
3. Renderer saves through preload-exposed APIs.
4. Main-process services persist preferences, credentials, or operational config.
5. Renderer refreshes state and runtime consumers pick up changes immediately or on next startup, depending on the setting.

## Discovery and Data Sources

- Primary settings UI: `renderer/src/components/OnyxSettingsModal.tsx`
- Shared persistence: `main/UserPreferencesService.ts`
- Runtime application of settings happens in `renderer/src/App.tsx`, Electron bootstrap code, metadata services, import services, and launcher flows.
- Per-tab behavior is documented in `docs/features/settings/README.md` and the linked tab docs.

## Data Model and Persistence

- Most settings persist in the user preferences store.
- Some operational values use dedicated APIs or related stores:
  - background scanning configuration
  - API credentials
  - launcher and library configuration
- Defaults originate in `UserPreferencesService.createDefaultPreferences()`.

## Failure Modes and Triage

### Symptom: Setting saves in UI but is lost after restart

- Verify the save path writes to the expected persistence service.
- Confirm the preference key exists in defaults and readback logic.
- Check whether the setting belongs to credentials or another non-preferences store.

### Symptom: Setting persists but behavior does not change

- Confirm the runtime consumer reads the same key.
- Check whether the affected subsystem only reads the setting at startup.
- Inspect the relevant tab runbook for subsystem-specific application rules.

### Symptom: A settings area is unclear or incomplete

- Treat the matching tab doc in `docs/features/settings/` as the first required update target.
- Update this parent overview if architecture or cross-tab behavior changed.

## File Ownership Map

- Overview and navigation docs
  - `docs/features/settings/README.md`
  - `docs/features/settings/general.md`
  - `docs/features/settings/animations.md`
  - `docs/features/settings/scanning.md`
  - `docs/features/settings/libraries.md`
  - `docs/features/settings/api-integrations.md`
  - `docs/features/settings/link-management.md`
  - `docs/features/settings/advanced.md`
  - `docs/features/settings/suspend-resume.md`
  - `docs/features/settings/about.md`
- Main process
  - `main/UserPreferencesService.ts`
  - `main/AppConfigService.ts`
  - `main/InstallerPreferenceService.ts`
  - `main/APICredentialsService.ts`
  - `main/electronStoreShim.ts`
  - `main/ipc/appHandlers.ts`
  - `main/main.ts`
- Renderer
  - `renderer/src/components/OnyxSettingsModal.tsx`
  - `renderer/src/App.tsx`

