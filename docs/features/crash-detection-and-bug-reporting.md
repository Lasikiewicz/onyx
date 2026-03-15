# Crash Detection and Bug Reporting

## What This Feature Does

Detects crash dumps from prior runs, prompts the user, and generates bug-report bundles for support/debugging.

## Related Documentation

- [Settings and preferences](./settings-and-preferences.md) — no dedicated tab; feature is event-driven.
- [Updater](./updater.md) — startup flow; crash check can interact with update-check timing.

## User-Facing Surfaces

- Crash-dump modal shown after startup when prior crash evidence is found.
- Bug-report modal for packaging logs, context, and user notes.
- Supporting filesystem outputs in debug-log and crash-dump locations.

## Settings and Toggles

- This feature is primarily event-driven and diagnostic.
- There are no primary user preference toggles owned by this runbook.

## Confirmed End-to-End Flows

1. Main process checks crash dump locations on startup.
2. Renderer is notified when dumps are available (IPC from [main.ts](../../main/main.ts) / [appHandlers.ts](../../main/ipc/appHandlers.ts)).
3. User can save/open/dismiss through [CrashDumpModal.tsx](../../renderer/src/components/CrashDumpModal.tsx) actions.
4. [BugReportService.ts](../../main/BugReportService.ts) bundles logs/context/user description.

## Discovery and Data Sources

- Crash evidence comes from crash-dump and related debug-log directories.
- Main-process analysis happens before or during renderer startup notification.
- Bug reports aggregate logs, crash analysis, and user-supplied description/context.

## Data Model and Persistence

- Crash dumps and generated report bundles are filesystem artifacts.
- UI state for showing modals is runtime-only.
- Included report content depends on available log and crash-analysis files.

## Failure Modes and Triage

### Symptom: Crash modal never appears after crash

- Verify crash dump paths are scanned at startup.
- Confirm IPC event is emitted and renderer listener is registered.

### Symptom: Bug report generation fails

- Check log/destination directory permissions.
- Validate required context files exist.

### Symptom: Generated report is missing useful context

- Confirm debug-log and crash-analysis generation happened before report packaging.
- Check whether the user-selected destination write succeeded for every attachment.

## File Ownership Map

- **Main process**
  - [BugReportService.ts](../../main/BugReportService.ts)
  - [crashDumpAnalyzer.ts](../../main/crashDumpAnalyzer.ts)
  - [main.ts](../../main/main.ts)
  - [ipc/appHandlers.ts](../../main/ipc/appHandlers.ts)
- **Renderer**
  - [BugReportModal.tsx](../../renderer/src/components/BugReportModal.tsx)
  - [CrashDumpModal.tsx](../../renderer/src/components/CrashDumpModal.tsx)
  - [App.tsx](../../renderer/src/App.tsx)
