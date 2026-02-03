# Steam Playtime Sync — Quick Reference

Steam playtime synchronization and display is **disabled by default** and is not enabled in production builds.

## What it does

Playtime sync fetches playtime data for Steam games (e.g. via Steam Web API or Community API) and can display it in the UI. The logic exists in `main/SteamService.ts` (`fetchPlaytimeData`) and is exposed via IPC (e.g. `steam:syncPlaytime`). User preference `showPlaytime` controls display.

## Why it's disabled

- Requires additional testing and documentation before being turned on in production
- Steam profile must be public for Community API fallback; Web API requires a Steam Web API key

## Implementation details

- **Service**: `main/SteamService.ts` — `fetchPlaytimeData(steamId, apiKey?)`
- **Preload**: `syncSteamPlaytime` in `main/preload.ts`
- **Preferences**: `showPlaytime` in `main/UserPreferencesService.ts`

## Enabling (for development only)

Enabling requires wiring the sync flow in the UI and ensuring Steam credentials/profile are configured. Do not enable in production until the feature has been fully reviewed and validated.
