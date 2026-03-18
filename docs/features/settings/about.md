# Settings About Tab

## What This Feature Does

Provides version, project, and update-related information inside the settings modal.

## User-Facing Surfaces

- `Onyx Settings` -> `About` tab.
- Update information and app metadata.
- Credits and project references.
- External project links for Discord, website, Reddit, Ko-fi, link-icon attribution, and Nyrna credit.
- The About header now uses [`InteractiveSettingsAboutLogo.tsx`](../../../renderer/src/components/settings/InteractiveSettingsAboutLogo.tsx), which replaces the static logo with a smaller unboxed shared mouse-tracked Onyx cube and opens a larger free-floating draggable/throwable version when clicked.

## Settings and Toggles

- This tab is informational.
- It may expose update-trigger actions but does not own persistent preference toggles.

## Confirmed End-to-End Flows

1. User opens the tab.
2. Renderer displays current version/update state and the interactive About logo.
3. Clicking the logo opens a larger free-floating version that still tracks mouse motion and can be dragged/thrown across the full app window until it slows to a stop.
4. If update actions are available, renderer invokes updater IPC calls.
5. If the user opens a project/support link, the renderer uses the preload `openExternal` bridge.

## Discovery and Data Sources

- UI is now rendered by [`SettingsAboutTab.tsx`](../../../renderer/src/components/settings/SettingsAboutTab.tsx) and mounted from [`OnyxSettingsModal.tsx`](../../../renderer/src/components/OnyxSettingsModal.tsx).
- About-logo interaction is owned by [`InteractiveSettingsAboutLogo.tsx`](../../../renderer/src/components/settings/InteractiveSettingsAboutLogo.tsx), which reuses the shared importer/onboarding cube component from [`InteractiveOnyxLogo.tsx`](../../../renderer/src/components/importer/InteractiveOnyxLogo.tsx).
- Update state supplied by app/update services.

## Data Model and Persistence

- No primary preferences are persisted by this tab.
- Displayed values are derived from app metadata and updater state.

## Failure Modes and Triage

### Symptom: Version or update status is stale

- Check app metadata source.
- Check updater status event wiring.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [SettingsAboutTab.tsx](../../../renderer/src/components/settings/SettingsAboutTab.tsx)
  - [InteractiveSettingsAboutLogo.tsx](../../../renderer/src/components/settings/InteractiveSettingsAboutLogo.tsx)
  - [InteractiveOnyxLogo.tsx](../../../renderer/src/components/importer/InteractiveOnyxLogo.tsx)
- **Main process**
  - [AppUpdateService.ts](../../../main/AppUpdateService.ts)
  - [main.ts](../../../main/main.ts)
  - [preload.ts](../../../main/preload.ts)
