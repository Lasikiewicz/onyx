# Feature Documentation Standard

Every feature document in this folder is a source-of-truth runbook.

## Required Sections (No Exceptions)

Each feature file must include all of the following headings:

1. `## What This Feature Does`
2. `## User-Facing Surfaces`
3. `## Settings and Toggles`
4. `## Confirmed End-to-End Flows`
5. `## Discovery and Data Sources`
6. `## Data Model and Persistence`
7. `## Failure Modes and Triage`
8. `## File Ownership Map`

## Linking Requirement (Mandatory)

A reader must be able to understand how the feature works from the single `.md` file by following links. Every feature doc must:

- **Link to implementation:** Whenever a file, service, or component is mentioned (e.g. `App.tsx`, `UserPreferencesService`), add a Markdown link to the actual source path. Use paths relative to the doc (e.g. from `docs/features/main-view/components/` use `../../../../renderer/src/App.tsx` to reach repo root then into `renderer/`).
- **Link to related docs:** If the feature depends on or overlaps another feature (e.g. settings, launch, links), add a **Related documentation** section (or inline links) linking to the other feature runbooks.
- **File Ownership Map as links:** Each entry in the File Ownership Map must be a link to the file (e.g. `[GameDetailsPanel.tsx](../../../../renderer/src/components/GameDetailsPanel.tsx)`), with a short note on what that file does.

Path depth from doc to repo root: `docs/features/*.md` → `../../`; `docs/features/main-view/*.md` → `../../../`; `docs/features/main-view/components/*.md` or `views/*.md` → `../../../../`; `docs/features/settings/*.md` → `../../../`.

## Depth Requirement

- If functionality exists in code, it must be documented.
- If behavior is user-visible, document where it appears in UI and how it is triggered.
- If settings affect behavior, document toggle location, persisted keys, defaults, and runtime effects.
- If data is fetched/transformed/persisted, document source path and storage shape.
- If known caveats or partial implementations exist, document them explicitly.

## Update Rule

- Any change to feature behavior must update that feature document in the same commit.
- If a change touches multiple features, update each feature file affected.
