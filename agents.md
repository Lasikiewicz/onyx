---
trigger: always_on
description: Onyx AI Agent Guide - Rules and Entry Points
---

# 🚨 CRITICAL: READ BEFORE ANY CHANGES

## 0. MANDATORY FIRST STEP (CRITICAL)

ALWAYS check `.agent/docs/structure.md` BEFORE modifying code.

- `.agent/docs/structure.md` defines which doc owns each file area.
- If you modify mapped files, update required docs in the same commit.
- If architecture, IPC/data flow, module boundaries, or release/build flow changes, update `.agent/docs/architecture.md`.
- Run `npm run docs:sync` to keep generated documentation blocks current.

## 5. STRICT DOCUMENTATION & MODULARITY MANDATE (CRITICAL)

- Documentation changes ship with code changes.
- Feature docs in `docs/features/` must link to actual source files and related feature docs so a single runbook explains how the feature works (see `docs/features/FEATURE_DOC_STANDARD.md`).
- Keep files modular and single-responsibility.
- Enforcement:
  - `npm run docs:sync`
  - `npm run docs:check`
  - `.husky/pre-commit`
  - `.github/workflows/docs-guard.yml`
- Mapping source of truth: `.agent/docs/doc-map.json`

## ⚠️ MANDATORY GIT SAFETY RULES

- Run `npm run scan:secrets` before any push.
- Keep `CHANGELOG.md` `Pending` section updated for all committed changes, including maintainability and refactor work.
- `CHANGELOG.md` must list each fix or adjustment explicitly. For refactors, prefer one main bullet per parent source file, then list the extracted subfiles/components/hooks as child bullets under that parent entry instead of scattering multiple top-level bullets for the same file.
- If multiple changelog bullets in the same release would start with the same prefix or surface label, group them under one parent bullet and use child bullets for the individual changes. Examples: `Add Games:`, `Tests:`, `Game details panel:`, or a parent file such as `OnyxSettingsModal.tsx`.
- Any changelog entry written as `- Prefix: detail` should be rewritten as a parent bullet `- Prefix:` followed by child bullets for the detail lines. Do not keep colon-prefixed entries as flat single-line bullets.
- Use terminal git commands; avoid editor SCM commit/push UI.
- Do not include Cursor branding or Co-authored-by lines in commit messages.
- Avoid using the word `alpha` in commit messages that land on `main`.

## RELEASE OPERATIONS (SOURCE OF TRUTH)

For full procedures, use `.agent/docs/release-workflows.md`:

- Push to git / Push to git master
- Force to Alpha
- Force to Main
- Push app live
- Push website live
- Auto-update release behavior

## PROJECT CONTEXT (SOURCE OF TRUTH)

- Architecture and ownership: `.agent/docs/architecture.md`
- Project runtime, conventions, and critical files: `.agent/docs/project-reference.md`
- Disabled features and known issues: `.agent/docs/known-issues-disabled-features.md`
- Contributor-facing summary: `README.md` and `.github/CONTRIBUTING.md`

## PRE-WORK CHECKLIST

Before code changes:

1. Read this file.
2. Read `.agent/docs/structure.md`.
3. Confirm target docs to update.

Before git operations:

1. Show what changed.
2. Wait for explicit user instruction for push operations.
3. Report command results.
