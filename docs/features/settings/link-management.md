# Settings Link Management Tab

## What This Feature Does

Controls how external store and information links are displayed, discovered, and refreshed across the app.

## User-Facing Surfaces

- `Onyx Settings` -> `Link Management` tab.
- Global link discovery and display controls.
- Related runtime surfaces are documented in the main Links feature runbook.

## Settings and Toggles

- Link provider enablement flags.
- Link visibility and refresh behavior flags.
- Any display preferences used by game details or game manager link views.

## Confirmed End-to-End Flows

1. User changes link-management settings.
2. Save persists preferences.
3. Metadata refresh and game detail surfaces read the updated rules.
4. Link fetch or refresh paths include or exclude providers accordingly.

## Discovery and Data Sources

- This tab is the configuration surface for [../links-and-link-management.md](../links-and-link-management.md).
- Runtime consumers include metadata fetchers, link UI, and refresh dialogs.

## Data Model and Persistence

- Stored in user preferences.
- These values alter how link sets are built rather than creating links themselves.

## Failure Modes and Triage

### Symptom: Links are missing after disabling or enabling a provider

- Confirm the preference was saved.
- Confirm the affected surface performed a fresh metadata or links refresh.

## File Ownership Map

- Renderer
  - `renderer/src/components/OnyxSettingsModal.tsx`
  - `renderer/src/components/GameLinks.tsx`
  - `renderer/src/components/RefreshMetadataDialog.tsx`
- Main process
  - `main/UserPreferencesService.ts`
  - `main/MetadataFetcherService.ts`
