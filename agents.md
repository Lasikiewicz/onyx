---
trigger: always_on
description: Onyx AI Agent Guide - Rules and Entry Points
---

# 🚨 CRITICAL: READ BEFORE ANY CHANGES

## 0. MANDATORY FIRST STEP (CRITICAL)

ALWAYS check `.agent/docs/structure.md` BEFORE modifying code.

- `.agent/docs/structure.md` defines which doc owns each file area.
- During implementation, only make the exact changes the user requested.
- Do not update `.md` files, generated documentation blocks, changelog entries, or adjacent documentation unless the user explicitly requested those documentation edits or says they are happy with the implementation and wants the required follow-up docs prepared.
- Do not run validation, build, test, docs sync/check, lint, or formatting commands until the user explicitly asks for validation or says they are happy with the work and wants it prepared for commit/release.
- After completing the requested implementation, summarize the exact changed files and ask whether the user is happy with the changes.
- If the user says they are happy, run the required validation/build/docs/check workflow before any commit or push preparation.
- If mapped files were changed and the user later approves the work for commit/release prep, update the required docs in that same commit.
- If architecture, IPC/data flow, module boundaries, or release/build flow changes and the user later approves documentation updates, update `.agent/docs/architecture.md`.
- Run `npm run docs:sync` only after user approval for documentation/commit preparation.

## 5. STRICT DOCUMENTATION & MODULARITY MANDATE (CRITICAL)

- Documentation changes ship with code changes only after the user approves the implementation or explicitly asks for documentation/commit preparation.
- During the initial implementation pass, do not edit documentation or changelog files unless those files are the direct requested target.
- Feature docs in `docs/features/` must link to actual source files and related feature docs so a single runbook explains how the feature works (see `docs/features/FEATURE_DOC_STANDARD.md`).
- Keep files modular and single-responsibility.
- Enforcement, after user approval for validation or commit preparation:
  - `npm run docs:sync`
  - `npm run docs:check`
  - `.husky/pre-commit`
  - `.github/workflows/docs-guard.yml`
- Mapping source of truth: `.agent/docs/doc-map.json`

## ⚠️ MANDATORY GIT SAFETY RULES

- Run `npm run scan:secrets` before any push.
- If the user says "push to git" or otherwise asks for a push, first validate all local changes with the required build/docs/test/secret-scan workflow unless those exact local changes have already passed validation in the current session.
- Keep `CHANGELOG.md` `Pending` section updated for all committed changes, including maintainability and refactor work, but do not edit it during implementation unless the user explicitly asks or approves commit preparation.
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
3. Confirm the exact requested files or behavior to change.
4. Defer documentation, changelog, and validation work until the user approves the implementation or explicitly asks for that follow-up.

Before git operations:

1. Show what changed.
2. If pushing or preparing to push, run validation/build/docs/secret-scan first unless already completed for the current local changes.
3. Wait for explicit user instruction for push operations.
4. Report command results.
