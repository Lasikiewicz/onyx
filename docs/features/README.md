# Feature Documentation Index

This folder contains source-of-truth feature runbooks so future incidents can be resolved quickly.

Each feature document follows the same structure:

- What the feature does
- User-facing surfaces
- Settings and toggles
- Confirmed end-to-end flows
- Discovery and data sources
- Data model and persistence
- Failure modes and triage
- File ownership map

## Feature Files

- [Updater and Release Install](./updater.md)
- [Main View (Library Window)](./main-view.md)
  - Components: [Menu Bar](./main-view/components/menu-bar.md), [Game Details Panel](./main-view/components/game-details-panel.md), [Games List](./main-view/components/games-list.md)
  - View types: [Grid](./main-view/views/grid-view.md), [List](./main-view/views/list-view.md), [Logo](./main-view/views/logo-view.md), [Carousel](./main-view/views/carousel-view.md), [Coverflow](./main-view/views/coverflow-view.md)
- [Library Import and Startup Scan](./library-import-and-startup-scan.md)
- [Metadata Matching and Enrichment](./metadata-matching-and-enrichment.md)
- [Image Search and Selection](./image-search-and-selection.md)
- [Image Cache and Optimization Pipeline](./image-cache-and-optimization.md)
- [Links and Link Management](./links-and-link-management.md)
- [Game Launch and Process Tracking](./game-launch-and-process-tracking.md)
- [Settings and Preferences Overview](./settings-and-preferences.md)
	- Per-tab settings runbooks: [settings/README.md](./settings/README.md)
- [Suspend and Resume](./suspend-and-resume.md)
- [Crash Detection and Bug Reporting](./crash-detection-and-bug-reporting.md)

## Documentation Standard

- Required structure, depth, and **linking** rules: [FEATURE_DOC_STANDARD.md](./FEATURE_DOC_STANDARD.md)
- All feature documents must follow the required sections and must link to actual source files and related feature docs so a single `.md` is enough to understand how the feature works.

## Maintenance Rule

When changing a feature, update its matching file in this folder in the same commit.
