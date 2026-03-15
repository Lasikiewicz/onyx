# Documentation Structure Map

This file defines which documentation must be updated when specific file areas change.
Always check this map first before editing code.

## Source of Truth

- Mapping source: `.agent/docs/doc-map.json`
- Guardrails: `npm run docs:sync` and `npm run docs:check`
- Enforcement points: `.husky/pre-commit` and `.github/workflows/docs-guard.yml`

## Ownership Map

<!-- AUTO-GENERATED:MAP:START -->
| Rule | File Area(s) | Required Doc(s) | Match | Scope |
| --- | --- | --- | --- | --- |
| agent-workflows | `agents.md`<br>`.agent/workflows/` | `agents.md` | all | Agent rules and operating workflow |
| app-architecture-main | `main/` | `.agent/docs/architecture.md` | all | Electron main-process architecture and services |
| app-architecture-renderer | `renderer/src/` | `.agent/docs/architecture.md` | all | Renderer architecture, state and IPC usage |
| build-release-pipeline | `.github/workflows/`<br>`electron-builder.config.js`<br>`package.json`<br>`vite.config.ts`<br>`vitest.config.ts`<br>`tsconfig.json`<br>`tailwind.config.js`<br>`postcss.config.js` | `.agent/docs/architecture.md` | all | Build, CI/CD, and quality gates |
| developer-automation | `scripts/`<br>`.husky/` | `.agent/docs/structure.md` | all | Automation scripts and commit-time guardrails |
| feature-docs-source-of-truth | `main/`<br>`renderer/src/` | `docs/features/updater.md`<br>`docs/features/library-import-and-startup-scan.md`<br>`docs/features/metadata-matching-and-enrichment.md`<br>`docs/features/image-search-and-selection.md`<br>`docs/features/image-cache-and-optimization.md`<br>`docs/features/links-and-link-management.md`<br>`docs/features/game-launch-and-process-tracking.md`<br>`docs/features/settings-and-preferences.md`<br>`docs/features/settings/README.md`<br>`docs/features/settings/general.md`<br>`docs/features/settings/animations.md`<br>`docs/features/settings/scanning.md`<br>`docs/features/settings/libraries.md`<br>`docs/features/settings/api-integrations.md`<br>`docs/features/settings/link-management.md`<br>`docs/features/settings/advanced.md`<br>`docs/features/settings/suspend-resume.md`<br>`docs/features/settings/about.md`<br>`docs/features/suspend-and-resume.md`<br>`docs/features/crash-detection-and-bug-reporting.md` | any | For application code changes, at least one feature runbook must be updated in the same commit |
<!-- AUTO-GENERATED:MAP:END -->

## Last Sync

<!-- AUTO-GENERATED:LAST_SYNC:START -->
- Synced (UTC): 2026-03-15T22:46:50.289Z
<!-- AUTO-GENERATED:LAST_SYNC:END -->

## Manual Update Policy

1. If you modify any code file, identify its owner doc from the ownership map above.
2. Stage narrative doc updates in the same commit as code changes.
3. If architecture, data flow, module responsibilities, or release pipeline changed, update `.agent/docs/architecture.md`.
4. If workflow rules or guardrails changed, update `agents.md` (project root).
5. If files under `main/` or `renderer/src/` change, stage at least one updated file from `docs/features/` to keep feature runbooks as source of truth.
6. Every updated feature doc must satisfy `docs/features/FEATURE_DOC_STANDARD.md` (required sections and depth).
