# Suspend/Resume Feature — Quick Reference

Status: DISABLED (as of 2026-01-21)

Overview:
- The Suspend/Resume feature is implemented but intentionally disabled by default.
- The implementation lives in `main/ProcessSuspendService.ts` and related IPC handlers are commented out or return disabled responses in `main/preload.ts`.

When to enable:
1. Ensure thorough security review and automated tests are present.
2. Add integration test coverage for Windows-specific suspend/resume behavior.
3. Add a documented user consent flow and explicit UI toggle guarded by admin warnings.

Developer notes:
- Unit tests (mocked) are provided: `npm run test:suspend:service-mock`.
- On Windows, suspending/resuming may require administrator privileges and can crash some games.

Operations:
- To run mock tests locally: `npm run test:suspend:service-mock`.
- To enable the feature in code: uncomment IPC handlers in `main/main.ts` and the Suspend tab in `renderer/src/components/OnyxSettingsModal.tsx`, then add an enablement migration and UI confirmation.