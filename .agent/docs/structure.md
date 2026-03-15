# Documentation Structure Map

This file defines which documentation must be updated when specific file areas change.
Always check this map first before editing code.

## Source of Truth

- Mapping source: `.agent/docs/doc-map.json`
- Guardrails: `npm run docs:sync` and `npm run docs:check`
- Enforcement points: `.husky/pre-commit` and `.github/workflows/docs-guard.yml`

## Ownership Map

<!-- AUTO-GENERATED:MAP:START -->
| Rule | File Area(s) | Required Doc | Scope |
| --- | --- | --- | --- |
| agent-workflows | `.agent/workflows/` | `.agent/workflows/agents.md` | Agent rules and operating workflow |
| app-architecture-main | `main/` | `.agent/docs/architecture.md` | Electron main-process architecture and services |
| app-architecture-renderer | `renderer/src/` | `.agent/docs/architecture.md` | Renderer architecture, state and IPC usage |
| build-release-pipeline | `.github/workflows/`<br>`electron-builder.config.js`<br>`package.json`<br>`vite.config.ts`<br>`vitest.config.ts`<br>`tsconfig.json`<br>`tailwind.config.js`<br>`postcss.config.js` | `.agent/docs/architecture.md` | Build, CI/CD, and quality gates |
| developer-automation | `scripts/`<br>`.husky/` | `.agent/docs/structure.md` | Automation scripts and commit-time guardrails |
<!-- AUTO-GENERATED:MAP:END -->

## Last Sync

<!-- AUTO-GENERATED:LAST_SYNC:START -->
- Synced (UTC): 2026-03-15T19:50:45.372Z
<!-- AUTO-GENERATED:LAST_SYNC:END -->

## Manual Update Policy

1. If you modify any code file, identify its owner doc from the ownership map above.
2. Stage narrative doc updates in the same commit as code changes.
3. If architecture, data flow, module responsibilities, or release pipeline changed, update `.agent/docs/architecture.md`.
4. If workflow rules or guardrails changed, update `.agent/workflows/agents.md`.
