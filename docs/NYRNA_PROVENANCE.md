# Nyrna Integration Provenance

This document tracks direct reuse/adaptation of logic from the `Merrit/nyrna` project into Onyx.

## Upstream
- Project: https://github.com/Merrit/nyrna
- License: GNU GPL v3.0 (verify per imported file headers when pulling code)
- Scope in Onyx v1: Suspend/Resume behavior and process-management flow (Windows)

## Import Rules
- Preserve upstream copyright and license notices in imported files.
- Record every imported/adapted file with upstream path + commit hash.
- Mark local modifications with date and summary.
- Do not reuse Nyrna trademarks/branding/assets unless explicitly permitted.

## Mapping Log

| Onyx Path | Upstream Path | Upstream Commit | Strategy | Date | Notes |
|---|---|---|---|---|---|
| `main/ProcessSuspendService.ts` | _TBD during import_ | _TBD_ | Adapt/rewrite | _TBD_ | Windows suspend/resume + child-process strategy |
| `main/ipc/suspendHandlers.ts` | _TBD during import_ | _TBD_ | Adapt | _TBD_ | Runtime toggle + shortcut orchestration |

## Reviewer Checklist
- [ ] Upstream file paths and commit hashes captured for all reused logic.
- [ ] Modified-file notices added where required.
- [ ] GPL notices preserved in imported code headers.
- [ ] Release notes include source links and provenance pointer.
- [ ] In-app About screen links to this document.
