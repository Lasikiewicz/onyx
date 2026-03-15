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

## Depth Requirement

- If functionality exists in code, it must be documented.
- If behavior is user-visible, document where it appears in UI and how it is triggered.
- If settings affect behavior, document toggle location, persisted keys, defaults, and runtime effects.
- If data is fetched/transformed/persisted, document source path and storage shape.
- If known caveats or partial implementations exist, document them explicitly.

## Update Rule

- Any change to feature behavior must update that feature document in the same commit.
- If a change touches multiple features, update each feature file affected.
