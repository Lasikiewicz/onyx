# Onyx — Outstanding Work

Remaining items from the optimization and bug-bash audit
([`docs/audit/2026-08-05-optimization-and-bug-bash.md`](docs/audit/2026-08-05-optimization-and-bug-bash.md)).
36 of ~50 findings were fixed across 0.13.0–0.14.0; what follows is everything still open,
ordered by value per unit of regression risk.

Each entry keeps its original audit ID (H = high, M = medium, L = low) so it can be traced
back to the report's detail and reproduction notes.

---

## High severity

### H5 — Xbox scan is fully synchronous
`main/XboxService.ts:879` (+ `main/scanners/XboxScanner.ts:19`)

`scanGames()` is a sync method: `readdirSync`/`statSync` recursion to depth 20 (`:466`), a
manifest search to depth 10 (`:381`), `readFileSync` (`:411`), and **three** `spawnSync('powershell', …)`
calls (`:425`, `:741`, `:803`). `extractPackageInfo` runs once per game folder (`:311`), so a
30-game Game Pass install serialises 30 PowerShell startups with the UI frozen. `XboxScanner.scan`
wraps it in an `async` that never yields.

Also: `findExecutables` follows directory junctions (`:497`; same in `ImportService.ts:890`) with
no visited-inode set, so junction cycles are bounded only by `maxDepth`.

*Approach:* convert to `fs.promises` throughout; replace the three `spawnSync` calls with the
async `runFfmpegCaptured`-style helper already added to `ImageCacheService.ts`; batch the
per-game `Get-AppxPackage` query into one call for the whole scan; add a visited real-path set.

*Risk:* high — 920 lines, zero test coverage. Write characterisation tests first.

### H14 — `React.memo` on game tiles never hits
`renderer/src/App.tsx:482, 496-510, 535, 815-826`

`handleReorder`, `handleEditGame`, `handleEditCategories`, `handleEditImages`, `handleFixMatch`,
`handleSaveGame`, `handleToggleFavorite` and `handleTogglePin` are recreated every render and
flow into `React.memo`'d `SortableGameCard` (`:141`) and `GameCard` (`:292`). The memo can never
hit; it is currently pure overhead.

Compounding it: `useGameDetailsPanelControls`, `useRightClickMenuControls`, `useMainViewShellControls`,
`useAppShellSurfaceActions`, `useAppShellModalControls` and `useAppShellCarouselControls` each
return a fresh object literal of inline arrows with no `useMemo`, so `GameDetailsPanel` (1484 lines)
and `MenuBar` (1560 lines) re-render fully on every search keystroke.

*Approach:* `useCallback` the eight handlers, then `useMemo` each hook's returned object. Do the
handlers first and measure — that alone makes the existing `memo` calls start working.

*Risk:* medium-high — touches the whole shell, and `exhaustive-deps` is disabled on these files
(see T1), so the linter will not catch stale closures introduced along the way.

### H16 — No virtualization in any library view
`LibraryGrid.tsx:337`, `LibraryCardView.tsx:221`, `LibraryListView.tsx:190`, `GameManager.tsx:815`

Every view renders one DOM subtree per game. Grid and Card now mitigate with
`contentVisibility` + `containIntrinsicSize`; `LibraryListView` and GameManager's list have
neither, and GameManager autoplays a `<video>` per row. A 2000-game library builds thousands of
nodes and starts thousands of media loads at once.

*Approach:* windowing (e.g. `@tanstack/virtual`) for List and GameManager first — they are the
worst and the simplest. Grid/Card may not need it now that containment is correct.

*Risk:* medium — new dependency, and drag-and-drop reordering interacts with windowing.

---

## Medium severity

### M1 — `GameDetailsPanel` runs a second preference bootstrap
`renderer/src/components/GameDetailsPanel.tsx:367-399`

Re-reads `getPreferences()` on mount and overwrites `panelWidths`, `fanartHeight`,
`descriptionWidth`, `bottomBarHeight`, `visibleLinkTypes` and `linkDisplayOrder` with disk values
while those same values arrive as props from App. CLAUDE.md states app-shell preferences are
bootstrapped **once** at startup; this is exactly the "snaps back to saved values" bug it warns
about. Highest-value remaining Medium item.

### M2 — Debounced save starved by unstable deps
`renderer/src/components/GameDetailsPanel.tsx:460-489`

`onDetailsPanelBottomBarHeightChange` is in the dep array and is a new function every App render,
so the 500ms timer restarts on every render. Under sustained re-render (typing in search) the save
can be starved indefinitely, then fires a full multi-key `savePreferences` write when renders stop.
Largely resolved by fixing H14.

### M3 — Stale closures in the panel resize handler
`renderer/src/components/GameDetailsPanel.tsx:491-554`

The mousemove handler closes over four `on*Change` callbacks absent from its dep array, so a drag
keeps calling the versions captured when it started.

### M4 — Full preference re-apply long after bootstrap
`renderer/src/hooks/useAppPreferences.ts:489-492`

`refreshPreferences` re-applies the entire preference set including `viewMode` (`:347`) and
`activeGameId` (`:370`), wired to `onSettingsImported` (`useRightClickMenuControls.ts:448`). Snaps
view mode and active selection back to persisted values.

### M5 — Selection force-reset and persisted
`renderer/src/hooks/useAppShellSelection.ts:34-46`

Any search/filter change that hides the selected game silently reassigns selection to
`filteredGames[0]`, and `handleGameClick` (`:50`) persists it.

### M6 — Global keydown listeners re-subscribed constantly
`LibraryGrid.tsx:225-279`, `LibraryCardView.tsx:126-170`

Dep arrays are `[items, focusedIndex, gameTilePadding, onGameClick]`. `focusedIndex` changes on
every arrow press and `items`/`onGameClick` change on every App render, so the document listener is
torn down and re-added continuously. Use refs for the mutable parts.

### M7 — `runningGames` never drains
`main/ipc/scanningHandlers.ts:12` (cleared only at `:400`)

Only an explicit `scanning:gameStopped` IPC clears it. If the renderer reloads or a game crashes,
the set stays populated and background scanning is disabled for the rest of the session. Needs a
liveness check or a TTL.

### M8 — `execFileSync('reg', …)` per registry value
`main/LauncherDetectionService.ts:33`

Called repeatedly from `detectLauncher`. Args are an array so there is no injection surface, but it
is synchronous process spawning on the main thread.

### M9 — Redundant consecutive store writes
`main/UserPreferencesService.ts:1515-1516, 1528-1530`; `main/GameStore.ts:206`

Each `store.set` is a full serialize + write. The reset path issues three in a row, writing the
whole file three times. Batch into one write.

### M10 — Missing image loading hints in remaining surfaces
`LibraryCarousel.tsx`, `gameManager/ImageSearchResultsSections.tsx:41, 70`

`loading="lazy"` / `decoding="async"` were added to List, CoverFlow and GameManager tiles; the
carousel and the image-search result grids still lack them.

---

## Low severity

- **L1** `renderer/src/utils/imagePrefetch.ts:3` — `warmedAssets` Set grows unbounded for the
  process lifetime; `prefetchVideo` (`:24`) creates detached `<video>` elements dropped without
  `src = ''`.
- **L2** `renderer/src/components/LibraryCarousel.tsx:120` — `window.innerWidth` read during render
  with no resize subscription, so tile size goes stale; `:184-235` attaches window listeners with a
  nine-entry dep array.
- **L3** `LibraryGrid.tsx:281` / `LibraryCardView.tsx:172` — `handleDragEnd` not memoized, so
  `DndContext` gets a new handler prop every render.
- **L4** `renderer/src/components/LibraryListView.tsx:58-68` — default `listViewOptions` is an
  inline object default parameter; blocks any useful `React.memo` on the component.
- **L5** `renderer/src/contexts/FocusContext.tsx:83-99, 113-131` — DOM-poking fallbacks via
  `document.querySelector('[data-context-menu]').__focusConfirm`; a correctness hazard if two menus
  are ever mounted at once.
- **L6** `main/main.ts:700-760, 884-917` — dozens of `existsSync` calls for icon resolution on every
  window creation, plus a `statSync` in an error path.

---

## Tooling and coverage

### T1 — Re-enable `react-hooks/exhaustive-deps` on the four excluded files
`eslint.config.mjs:93-103` disables it for `App.tsx`, `GameManager.tsx`, `GameDetailsPanel.tsx` and
`importer/ImportWorkbench.tsx` — **precisely** the files where M1–M4 live. This is what stops those
bugs recurring, and it should land with or before H14.

### T2 — Make ESLint useful
Only 5 rules are enabled and `parserOptions.project` is unset, so the installed `typescript-eslint`
recommended set is entirely unused and `no-floating-promises` is unavailable. Also
`reportUnusedDisableDirectives: 'off'` (`:9`) — which is why **11 of the 14** `eslint-disable`
comments in the repo are no-ops for rules that were never enabled. `:77-81` disables
`no-unused-vars` for all of `main/**`; `scripts/**` is entirely unlinted.

### T3 — Test coverage for the risky modules
Zero tests on `ImportService.ts` (1998 lines), `ImageCacheService.ts` (1643), `ImageOptimizationQueue.ts`,
`onyxLocalProtocol.ts`, `XboxService.ts`, all three scanners, and the Steam auth/credentials path.
`electronStoreShim.test.ts` was added in 0.14.0 and is the pattern to follow.

Config gaps: `vitest.config.mts:8` matches `renderer/**/*.test.tsx` only, so a `.test.ts` under
`renderer/` is **silently skipped**; root `tsconfig.json:23` includes only `renderer/src`, so
`renderer/tests/**` is never type-checked by `npm run build`.

### T4 — TypeScript strictness
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and
`noPropertyAccessFromIndexSignature` are unset. `main/tsconfig.json` lacks the `noUnused*` flags the
renderer config has. 81 `as any` in non-test source, concentrated in
`renderer/src/types/EditableGame.ts` (7 — casts in a *types* module usually mean the model does not
match the runtime shape), `useGamePropertiesImages.ts` (7) and `useGameManagerImageSearch.ts` (7).

---

## Decisions to make (not defects)

- **Update signing.** `electron-builder.config.js:28` sets `verifyUpdateCodeSignature: false`,
  `:34` `forceCodeSigning: false`, and `package.json` clears `WIN_CSC_LINK` for production builds.
  The app ships unsigned *and* the updater does not verify signatures on downloaded updates.
  Updates come over HTTPS from GitHub so this is not trivially exploitable, but it is the largest
  remaining supply-chain gap. Needs a deliberate call, not a code fix.
- **`dompurify` 3.4.11 → 3.4.13.** The only remaining `npm audit` finding (low). The existing
  `^3.3.2` range already permits it — one `npm update dompurify`.
- **`dotenv` as a runtime dependency** (`package.json`). Referenced only at `main/main.ts:188-189`
  inside a dev-looking `require`, but it ships inside the asar. Same question already answered for
  `electron-store` in 0.13.1.
- **Unimplemented metadata providers.** `main/MetadataFetcherService.ts:1173` — Epic/GOG/Xbox
  metadata providers are unimplemented, though `package.json` keywords advertise them.
