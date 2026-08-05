# Onyx — Outstanding Work

Remaining items from the optimization and bug-bash audit
([`docs/audit/2026-08-05-optimization-and-bug-bash.md`](docs/audit/2026-08-05-optimization-and-bug-bash.md)).
36 of ~50 findings were fixed across 0.13.0–0.14.0, and a further 16 in 0.15.0 (H5, H14,
M1–M10, L1–L4, L6, T1); what follows is everything still open, ordered by value per unit of
regression risk.

Each entry keeps its original audit ID (H = high, M = medium, L = low) so it can be traced
back to the report's detail and reproduction notes.

---

## High severity

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

## Tooling and coverage

### T2 — Make ESLint useful
Only 5 rules are enabled and `parserOptions.project` is unset, so the installed `typescript-eslint`
recommended set is entirely unused and `no-floating-promises` is unavailable. Also
`reportUnusedDisableDirectives: 'off'` (`:9`) — which is why most of the `eslint-disable`
comments in the repo are no-ops for rules that were never enabled. `:77-81` disables
`no-unused-vars` for all of `main/**`; `scripts/**` is entirely unlinted.

### T3 — Test coverage for the risky modules
Zero tests on `ImportService.ts` (1998 lines), `ImageCacheService.ts` (1643), `ImageOptimizationQueue.ts`,
`onyxLocalProtocol.ts`, `SteamScanner`/`EpicScanner`, and the Steam auth/credentials path.
`electronStoreShim.test.ts` (0.14.0) and `XboxService.test.ts` (0.15.0, 23 tests driving real
temp directories rather than mocking `fs`) are the patterns to follow.

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

---

## Completed in 0.15.0

H5 (Xbox scan converted to async fs and batched PowerShell, with 23 characterisation tests
written first; junction-cycle guard added to both `XboxService` and `ImportService`),
H14 (memoization across the app shell), M1–M3 (GameDetailsPanel preference bootstrap, debounced
save, resize stale closures), M4–M5 (preference re-apply and selection force-reset), M6 (global
keydown re-subscription), M7 (`runningGames` never draining), M8 (sync registry reads), M9
(redundant consecutive store writes), M10 (image loading hints), L1–L4, L6, and T1
(`react-hooks/exhaustive-deps` re-enabled on all four previously excluded files).
