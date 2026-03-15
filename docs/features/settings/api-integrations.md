# Settings API Integrations Tab

## What This Feature Does

Manages credentials and enablement for third-party metadata and artwork providers.

## User-Facing Surfaces

- `Onyx Settings` -> `API Integrations` tab.
- Credential inputs and provider toggles for supported services.

## Settings and Toggles

- SteamGridDB API key and enablement.
- IGDB client credentials and enablement.
- RAWG API key and enablement.
- Giant Bomb API key and enablement.

## Confirmed End-to-End Flows

1. User enters credentials or toggles provider state.
2. Save persists credentials through credential storage and settings services.
3. Metadata and artwork features read provider state before requesting remote data.

## Discovery and Data Sources

- UI: `OnyxSettingsModal` integrations tab.
- Main consumers: metadata providers, image/artwork services, credentials service.

## Data Model and Persistence

- Secrets may be stored outside plain preferences depending on provider credential handling.
- Enablement flags are used to decide whether providers participate in search/fetch pipelines.

## Failure Modes and Triage

### Symptom: Metadata provider never runs

- Confirm the provider is enabled.
- Confirm credentials are present and valid.
- Check provider-specific logs and rate-limit failures.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
- **Main process**
  - [APICredentialsService.ts](../../../main/APICredentialsService.ts)
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [IGDBService.ts](../../../main/IGDBService.ts)
  - [GiantBombService.ts](../../../main/GiantBombService.ts)
  - [IGDBMetadataProvider.ts](../../../main/IGDBMetadataProvider.ts)
  - [GiantBombMetadataProvider.ts](../../../main/GiantBombMetadataProvider.ts)
