# Settings API Integrations Tab

## What This Feature Does

Manages credentials and enablement for third-party metadata and artwork providers.

## User-Facing Surfaces

- `Onyx Settings` -> `API Integrations` tab.
- Credential inputs and provider toggles for supported services.

## Settings and Toggles

- SteamGridDB API key and a "Use SteamGridDB" switch.
- IGDB client credentials and a "Use IGDB" switch.
- RAWG API key and a "Use RAWG" switch.
- Giant Bomb API key. Deliberately has **no** switch: the provider is unavailable and its key field is already disabled, so a switch there would be dead UI. The persistence layer still carries a `giantbomb` flag for when the service returns.

Switching a provider off is not the same as clearing its key. The key stays saved, and the provider is simply not constructed — this is the supported way to stop calling a provider that is down or rate limiting, without losing credentials.

## Confirmed End-to-End Flows

1. User enters credentials and/or flips a provider switch.
2. Save persists credentials, then provider switches, through [APICredentialsService.ts](../../../main/APICredentialsService.ts).
3. Both paths call `refreshMetadataServices` in [main.ts](../../../main/main.ts), which constructs a service **only** when the provider is enabled *and* its credentials are present. A disabled provider is passed as `null`, and `MetadataFetcherService`'s setters drop it from the provider list, so nothing downstream can call it.
4. Metadata and artwork features read that provider list; there is no second place that needs to re-check enablement.

## Discovery and Data Sources

- UI: `OnyxSettingsModal` integrations tab.
- Main consumers: metadata providers, image/artwork services, credentials service.

## Data Model and Persistence

- Secrets may be stored outside plain preferences depending on provider credential handling.
- When secure credential-store migration fails with known OS credential manager availability/resource errors, credentials fall back to `electron-store` so integrations remain usable.
- Enablement flags live in the `providerEnabled` key of `api-credentials.json`, separate from the `credentials` key. They are **always** `electron-store` and never the OS credential store — they are settings, not secrets.
- A provider with no stored flag is treated as enabled, so installs predating this setting keep every configured provider active.
- `setProviderEnabled` merges partial updates and ignores unknown ids and non-boolean values, since the payload comes from the renderer.
- `clearCredentials` (full app reset) drops `providerEnabled` too, restoring every provider to enabled.

## Failure Modes and Triage

### Symptom: Metadata provider never runs

- Confirm the provider is enabled — check for the amber **Off** pill on its tab, and the `disabled: …` list in the `[App] Metadata services refreshed` log line.
- Confirm credentials are present and valid.
- Check provider-specific logs and rate-limit failures.

### Symptom: a provider switch does not stick

- The switches persist with the modal's **Save** button, matching the credential fields beside them; closing without saving discards them.
- Confirm `api:setProviderEnabled` is reached. It calls `refreshMetadataServices` itself, so a provider should stop being called immediately rather than after a restart.

## File Ownership Map

- **Renderer**
  - [OnyxSettingsModal.tsx](../../../renderer/src/components/OnyxSettingsModal.tsx)
  - [SettingsIntegrationsTab.tsx](../../../renderer/src/components/settings/SettingsIntegrationsTab.tsx)
  - [useOnyxSettingsModalShellState.ts](../../../renderer/src/hooks/useOnyxSettingsModalShellState.ts)
  - [useOnyxSettingsModalPersistence.ts](../../../renderer/src/hooks/useOnyxSettingsModalPersistence.ts)
- **Main process**
  - [APICredentialsService.ts](../../../main/APICredentialsService.ts)
  - [UserPreferencesService.ts](../../../main/UserPreferencesService.ts)
  - [IGDBService.ts](../../../main/IGDBService.ts)
  - [GiantBombService.ts](../../../main/GiantBombService.ts)
  - [IGDBMetadataProvider.ts](../../../main/IGDBMetadataProvider.ts)
  - [GiantBombMetadataProvider.ts](../../../main/GiantBombMetadataProvider.ts)
