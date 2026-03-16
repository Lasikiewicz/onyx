# Settings Architecture

## What This Feature Does

Explains how Onyx settings are structured end to end: the renderer settings UI, the shared preload/API save paths, the main-process preference store, and the runtime consumers that apply settings across the shell, import flows, launching, scanning, updater behavior, and suspend/resume.

This is the architecture-level companion to the user-facing settings overview in [Settings and Preferences](./settings-and-preferences.md).

## Related Documentation

- [Settings and Preferences](./settings-and-preferences.md)
- [App Shell](./app-shell.md)
- [Library Import and Startup Scan](./library-import-and-startup-scan.md)
- [Game Launch and Process Tracking](./game-launch-and-process-tracking.md)
- [Updater and Release Install](./updater.md)
- [Suspend and Resume](./suspend-and-resume.md)
- [settings/README.md](./settings/README.md)

## User-Facing Surfaces

- The main settings UI in [`OnyxSettingsModal.tsx`](../../renderer/src/components/OnyxSettingsModal.tsx), which collects tab-level settings changes from the user.
- Tab-specific renderer slices in [`renderer/src/components/settings/`](../../renderer/src/components/settings), which now hold larger tab bodies such as [`SettingsIntegrationsTab.tsx`](../../renderer/src/components/settings/SettingsIntegrationsTab.tsx) and [`SettingsAboutTab.tsx`](../../renderer/src/components/settings/SettingsAboutTab.tsx) so the modal shell does not own every tab inline.
- The shell/runtime consumers in [`App.tsx`](../../renderer/src/App.tsx), [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts), and [`useGameLaunchFlow.ts`](../../renderer/src/hooks/useGameLaunchFlow.ts), which apply settings that need to affect the renderer immediately.
- Main-process consumers such as [`main.ts`](../../main/main.ts), [`startupCoordinator.ts`](../../main/startupCoordinator.ts), tray/window code, scanning services, and updater services that read preferences at startup or on demand.
- Specialized settings tabs documented in [settings/README.md](./settings/README.md), which define the detailed per-tab behavior and UI.

## Settings and Toggles

- Most settings persist through [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts).
- Settings are divided broadly into shell/view preferences, scanning/library configuration, API and credential-backed integrations, link display/management, launch/suspend behavior, and updater/about/maintenance options.
- Some values are true preferences, while others are operational config or credentials:
- preferences: [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts)
- credentials: [`APICredentialsService.ts`](../../main/APICredentialsService.ts)
- launcher/library configuration: [`AppConfigService.ts`](../../main/AppConfigService.ts)

## Confirmed End-to-End Flows

1. User opens [`OnyxSettingsModal.tsx`](../../renderer/src/components/OnyxSettingsModal.tsx) from the app shell and views current settings state loaded from preload-backed APIs.
2. A settings tab updates local UI state and saves through a preload bridge method exposed by [`main/preload.ts`](../../main/preload.ts).
3. Main-process persistence services such as [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts), [`APICredentialsService.ts`](../../main/APICredentialsService.ts), or [`AppConfigService.ts`](../../main/AppConfigService.ts) validate and store the change.
4. Renderer runtime consumers either react immediately through existing state updates in [`App.tsx`](../../renderer/src/App.tsx) and related hooks, re-read settings through explicit refresh flows such as [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts), or pick the new setting up on next startup if the feature is startup-only.
5. Main-process startup consumers such as updater/scanning/window/tray flows read stored settings on launch and change app behavior before or alongside renderer startup.

## Discovery and Data Sources

- Renderer settings UI: [`OnyxSettingsModal.tsx`](../../renderer/src/components/OnyxSettingsModal.tsx)
- Settings overview and per-tab docs: [settings-and-preferences.md](./settings-and-preferences.md) and [settings/README.md](./settings/README.md)
- Shared renderer preference application: [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts)
- Root renderer consumers: [`App.tsx`](../../renderer/src/App.tsx)
- Main-process persistence: [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts), [`APICredentialsService.ts`](../../main/APICredentialsService.ts), [`AppConfigService.ts`](../../main/AppConfigService.ts)
- Main-process runtime consumers: [`main.ts`](../../main/main.ts), [`startupCoordinator.ts`](../../main/startupCoordinator.ts), scanning/import services, launcher flows, updater flows, and suspend handlers

## Data Model and Persistence

- The main structured preference document is owned by [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts), including defaults, migrations, export/import helpers, and merged preference reads.
- Credentials and secrets live outside the general preferences store in [`APICredentialsService.ts`](../../main/APICredentialsService.ts).
- Launcher/library source configuration is handled separately in [`AppConfigService.ts`](../../main/AppConfigService.ts).
- Renderer state in [`App.tsx`](../../renderer/src/App.tsx) and related hooks should be treated as runtime mirrors of persisted settings, not the source of truth.
- Settings import/export and shell refresh flows must be careful not to re-run full startup bootstrap implicitly during normal in-session shell changes.

## Failure Modes and Triage

### Symptom: A setting saves but the UI snaps back or another shell state regresses

- Check [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) for bootstrap-vs-refresh behavior.
- Confirm the setting is not causing an unintended whole-preference reload during ordinary renderer state changes.
- Check whether the runtime consumer in [`App.tsx`](../../renderer/src/App.tsx) is separately overriding the persisted value.

### Symptom: A setting persists in storage but does not affect the app

- Find the runtime consumer first: [`App.tsx`](../../renderer/src/App.tsx), launch hooks, scanning services, updater flow, or startup/bootstrap code.
- Confirm the consumer reads the same preference key that the UI writes.
- Check whether the consumer only evaluates the key at startup rather than live.

### Symptom: Import/export of settings changes unrelated behavior

- Check import/export and merge logic in [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts).
- Check explicit renderer refresh pathways that re-apply settings after import.
- Confirm credentials/config-backed settings are not being mistaken for normal preferences.

## File Ownership Map

- [`OnyxSettingsModal.tsx`](../../renderer/src/components/OnyxSettingsModal.tsx) - primary renderer settings UI, shared modal state, and tab routing.
- [`SettingsIntegrationsTab.tsx`](../../renderer/src/components/settings/SettingsIntegrationsTab.tsx) - extracted API credentials and integration instructions tab UI.
- [`SettingsAboutTab.tsx`](../../renderer/src/components/settings/SettingsAboutTab.tsx) - extracted About tab UI for updater actions, credits, and external project links.
- [`useAppPreferences.ts`](../../renderer/src/hooks/useAppPreferences.ts) - renderer bootstrap and explicit preference refresh/application for the shell.
- [`App.tsx`](../../renderer/src/App.tsx) - root renderer consumer for many persisted layout/display/shell settings.
- [`useGameLaunchFlow.ts`](../../renderer/src/hooks/useGameLaunchFlow.ts) - renderer launch behavior consumer for launch-related settings.
- [`UserPreferencesService.ts`](../../main/UserPreferencesService.ts) - primary preference schema, defaults, persistence, migrations, and import/export behavior.
- [`APICredentialsService.ts`](../../main/APICredentialsService.ts) - separate credential persistence for API-backed settings.
- [`AppConfigService.ts`](../../main/AppConfigService.ts) - launcher/library source configuration persistence outside the general preference document.
- [`main/preload.ts`](../../main/preload.ts) - bridge methods that expose settings reads/writes to the renderer.
- [`main.ts`](../../main/main.ts) - main-process startup/runtime consumers for stored settings.
