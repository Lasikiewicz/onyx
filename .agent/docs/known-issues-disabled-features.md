# Known Issues and Disabled Features

## Disabled Features

### Steam Playtime Display

- Status: implemented but disabled.
- Primary file: `renderer/src/components/GameDetailsPanel.tsx`.
- Enablement notes:
  - uncomment hidden UI block
  - restore layout balancing (`justify-between` where applicable)
  - ensure Steam auth and `syncPlaytime` setting are enabled

### Suspend/Resume Feature (Nyrna-like)

- Status: implemented but disabled.
- Related files:
  - `main/ProcessSuspendService.ts`
  - `main/main.ts` (commented IPC wiring)
  - `renderer/src/components/OnyxSettingsModal.tsx` (commented UI/settings)
- Constraints: Windows-focused behavior, possible admin privilege requirement.

## Known Issues

### Image optimization crash reproduction

1. Clear game library.
2. Re-import games at scale.
3. Start import so optimization queue runs heavily.

Debug artifacts:

- `debug-logs/optimization.log`
- `debug-logs/crash-context.txt`
- `debug-logs/crash-dumps/`

Force optimization on startup:

- `ONYX_FORCE_OPTIMIZE=1`

### Logo flickering root cause and fix

- Root cause: cache-buster timestamps were being re-applied on repeated state updates.
- Fix direction: apply cache busters during initial load path only.
- Related file: `renderer/src/hooks/useGameLibrary.ts`.

### Per-game logo sizing behavior

- Stored per game and per view mode.
- Uses `logoSizePerViewMode` object and local state for immediate UI response.
- Default fallback currently centered in right-click/logo sizing flows.
