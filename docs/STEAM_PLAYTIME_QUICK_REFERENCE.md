# Steam Playtime Sync — Quick Reference

Status: DISABLED (as of 2026-01-21)

Overview:
- Playtime sync is implemented but remains disabled behind a settings flag (`syncPlaytime`) and requires the user to link a Steam account.
- UI display code in `renderer/src/components/GameDetailsPanel.tsx` is currently commented out.

When to enable:
1. Ensure `steam:syncPlaytime` IPC is gated by a short-circuit check and supported by tests (done).
2. Provide a clear settings toggle and documentation for privacy implications.
3. Add integration tests that validate playtime data parsing and storage.

Developer notes:
- Playtime is stored on the `Game.playtime` field (minutes).
- To display in the UI, ensure `syncPlaytime` is enabled and the game ID startsWith `steam-`.