push to ---
description: Onyx AI Agent Guide - Critical Rules & Project Context
---

# 🚨 CRITICAL: READ BEFORE ANY CHANGES

## ⚠️ MANDATORY GIT RULES - NON-NEGOTIABLE

**Agent CAN push to git when following established workflows below. CRITICAL requirements:**
- ✅ **Run `npm run scan:secrets` before any git push** - If it fails, fix (remove/rotate secrets) and re-run until it passes. Never push with hardcoded secrets.
- ✅ **Update the `Pending` section in `CHANGELOG.md` for every functional / user-visible change before committing** – ensure a top-level `## [Pending]` section exists and add 1–3 concise bullets under it that describe what changed.
- ✅ **ALWAYS use terminal commands** (`git commit -m "..."`, `git push`, etc.) - NEVER use Cursor's Source Control / commit UI
- ✅ **NEVER add Co-authored-by or Cursor branding** - The `commit-msg` hook strips these automatically, but don't add them in the first place
- ✅ **Terminal commits use your git config** (your name/email) as author - this is why we use terminal, not Cursor UI
- ✅ **Follow the workflows below** - These are the approved ways to push to git:
  - "Push to git master" / "push to git" = push to master branch
  - "Force to Alpha" = version bump + force master → develop
  - "Force to Main" = force develop → main (same build number as alpha)
  - "Push app live" = run Push to git, then Force to Alpha, then Force to Main (full app release flow)
  - "Push website live" = website deployment workflow
- ✅ **No "alpha" in commit messages that land on main** - Commits that are merged or force-pushed to **main** become production history and can appear in release notes. Avoid the word "alpha" in those commit messages; use neutral wording instead (e.g. "develop build profile", "prerelease profile", "build profile for develop/main").

## 🔄 RELEASE WORKFLOW (Strict Protocol)

**SIMPLE SUMMARY — do not confuse branches:**
- **Push to git** = run `npm run build` and `npm run scan:secrets`, fix any issues, then push local master to remote master.
- **Force to Alpha** = force **remote master** → **remote develop**. This updates the build number (increment version, changelog, run scan:secrets, commit, push master, then force master to develop). Triggers Onyx Alpha build. There is no branch named "alpha".
- **Force to Main** = force **remote develop** → **remote main**. Same build number as the alpha. Triggers Onyx (Production) build. Source is always **origin/develop**, never master.
- **Push app live** = full app release flow: run **Push to git** → **Force to Alpha** → **Force to Main** in that exact order.
- **Push website live** = build website, run `npm run scan:secrets`, push `master`, then deploy to Cloudflare Pages **production branch** (not preview).

**Release notes source of truth:**
- `CHANGELOG.md` is the source of truth for both in-app changelog display and GitHub release notes.
- CI auto-publishes GitHub release bodies from the matching version section in `CHANGELOG.md` during `.github/workflows/build.yml`.
- Local clean-draft generation is optional fallback (for manual release editing only):
  - Alpha: `npm run release-notes:alpha -- --to <version> --out .release-notes-alpha.md`
  - Main: `npm run release-notes:main -- --from <last-main-version> --to <version> --out .release-notes-main.md`


### 1. "Push to git" / "Push to git master"
**Always update the changelog `Pending` section, run the build and secrets scan first; fix any issues, then push local master to remote master.** Does NOT trigger CI app build.

1. Ensure `CHANGELOG.md` has a top-level `## [Pending]` section and add at least one bullet under it describing the functional/user-visible change(s) in this push.
2. Run `npm run build`. If it fails, fix build or type errors (and fix any lint issues if reported), then run `npm run build` again until it succeeds.
3. Run `npm run scan:secrets`. If it fails, remove or fix hardcoded secrets (or use env vars), then re-run until it passes.
4. Commit and push.
```bash
npm run build
# If build fails: fix errors (TypeScript, lint, etc.), then re-run npm run build. Repeat until success.
npm run scan:secrets
# If scan fails: remove/fix hardcoded secrets, then re-run. Repeat until success.
git add -A
git commit -m "[Summary]"
git push origin master
```

### 2. "Force to Alpha"
**Update build number, then force remote master → remote develop.** Triggers Onyx Alpha build from `develop`. (There is no "alpha" branch — the alpha build runs on push to `develop`.)

1. Run `npm run increment-build`, then read `version` from `package.json`.
2. Promote the pending changes: in [CHANGELOG.md](CHANGELOG.md), change the `## [Pending]` heading to `## [X.Y.Z] - YYYY-MM-DD` (using the new version and today’s date), keeping or refining the bullet list to describe what’s in this alpha. Do not leave any `Pending` section that would be shown to users.
3. Run `npm run scan:secrets`. If it fails, fix and re-run until it passes.
4. Commit message **must** be: `<version> <changes>` (e.g. `0.3.15 Flip view and menu layout`).
5. Ensure `CHANGELOG.md` contains the final `## [X.Y.Z] - YYYY-MM-DD` section text you want published (CI uses it as the release body).
```bash
npm run increment-build
# Edit CHANGELOG.md, then:
npm run scan:secrets
# If scan fails: fix and re-run until success.
git add package.json CHANGELOG.md
git commit -m "<version> <changes>"
git push origin master
git push origin master:develop --force
# Optional manual fallback (if you need to edit release text outside CI defaults):
npm run release-notes:alpha -- --to <version> --out .release-notes-alpha.md
```
Result: remote **develop** = remote **master**. CI builds Alpha from develop.

### 3. "Force to Main"
**Force remote develop → remote main. Same build number as alpha.** Triggers Onyx (Production) build. Source must be **origin/develop**, not master. Before forcing, ensure commits on develop do not contain the word "alpha" in their messages (use "develop build profile" or "prerelease" etc. so production history stays neutral).
```bash
git fetch origin develop
git push origin origin/develop:main --force
# Optional manual fallback (if you need a hand-edited release body):
npm run release-notes:main -- --from <last-main-version> --to <version> --out .release-notes-main.md
```
Result: remote **main** = remote **develop**. CI builds Production from main.

### 4. "Push app live"
**Run the full app release flow end-to-end.** This is a shortcut alias for: **Push to git** → **Force to Alpha** → **Force to Main**.

1. Complete **Push to git** (build + secrets scan + push `master`).
2. Complete **Force to Alpha** (increment version, promote changelog section, secrets scan, commit/push, force `master` → `develop`).
3. Complete **Force to Main** (force `origin/develop` → `main`).
4. Verify CI release/publish jobs complete successfully for both `develop` and `main`.

```bash
# Push to git
npm run build
npm run scan:secrets
git add -A
git commit -m "[Summary]"
git push origin master

# Force to Alpha
npm run increment-build
# Edit CHANGELOG.md: promote Pending -> [X.Y.Z] - YYYY-MM-DD
npm run scan:secrets
git add package.json CHANGELOG.md
git commit -m "<version> <changes>"
git push origin master
git push origin master:develop --force

# Force to Main
git fetch origin develop
git push origin origin/develop:main --force
```

Result: remote **develop** and remote **main** are updated from the same release version and CI publishes corresponding prerelease/release artifacts (when publish steps succeed).

### 5. "Push website live"
**Only push the website to production. Do NOT merge to main (that would trigger the Electron app build).**
1. Build the website:
   ```bash
   cd website && npm run build
   ```
2. Run `npm run scan:secrets`. If it fails, fix and re-run until it passes.
3. Commit and push to master (if there are uncommitted changes):
   ```bash
   npm run scan:secrets
   # If scan fails: fix and re-run until success.
   git add -A
   git commit -m "[Summary — e.g. website: ...]"
   git push origin master
   ```
3. Deploy the built site to Cloudflare **production branch** (never preview):
   ```bash
  cd website && npx wrangler pages deploy dist --project-name=onyx --branch=main
   ```
  Notes:
  - `--branch=main` targets the Pages production branch for this project.
  - If production branch changes in Cloudflare, update this command to match exactly.
  - Do **not** treat `*.pages.dev` preview URLs as "live" when this workflow is requested.

### 6. Auto-update (In-app updates)

**How it works:** The app uses **electron-updater** and checks **GitHub Releases** for updates. Users are only notified when a **new release is published** to the repo (same version rules: alpha sees prereleases, production sees stable releases).

- **Force to Alpha** → Triggers the **Onyx Alpha** CI build from `develop`. For alpha users to see an update:
  - The alpha build artifacts must be **published to GitHub Releases** (e.g. by CI or manually).
  - The release must be marked as **Pre-release** so the alpha app (which checks for prereleases) sees it.
  - Then users running Onyx Alpha get an update notification: on startup (if "Check for updates on startup" is on), via **Help > Check for Updates**, or via a toast when an update is found.
- **Force to Main** → Triggers the **Onyx (Production)** build from `main`. For production users to see an update:
  - The production build artifacts must be **published to GitHub Releases** as a **stable** (non–pre-release) release.
  - Then users running Onyx get the same update notification (startup check, Help menu, or toast).

**Summary:** The workflows above trigger the builds; **publishing** those builds to GitHub Releases (with installer + `latest.yml`) is what makes the update appear in the app. If the CI release/publish step succeeds on push to `develop`/`main` (or on tag), then Force to Alpha / Force to Main will lead to users being alerted once the release is published.

## 🚫 ELECTRON-ONLY APPLICATION

**CRITICAL**: This app WILL NOT work in standard browsers (Chrome, Firefox, etc.)
- Requires native Electron APIs (`window.electron`, `window.electronAPI`)
- **ALWAYS use**: `npm run electron:dev` for development
- **NEVER** try to verify UI in browser - it will crash

## 📁 PROJECT STRUCTURE

```
├── main/                    # Electron backend (Node.js)
│   ├── main.ts              # IPC handlers, app initialization
│   ├── preload.ts           # ContextBridge API
│   ├── AppUpdateService.ts  # Auto-update (electron-updater, GitHub Releases)
│   ├── GameStore.ts         # Game library storage
│   ├── SteamService.ts      # Steam integration
│   └── [services]           # Various backend services
├── renderer/src/            # React frontend
│   ├── App.tsx              # Main component
│   ├── components/          # UI components
│   │   ├── GameDetailsPanel.tsx
│   │   ├── GameManager.tsx
│   │   └── OnyxSettingsModal.tsx
│   └── types/               # TypeScript definitions
```

## 🔑 KEY TECHNOLOGIES

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Electron, Node.js, TypeScript
- **Storage**: electron-store (JSON-based)
- **IPC**: ContextBridge for secure main ↔ renderer communication

## 🚫 DISABLED FEATURES (Future Implementation)

### 1. Steam Playtime Display
- **Status**: Complete but disabled
- **Location**: `GameDetailsPanel.tsx` line ~885 (commented out)
- **To Enable**: Uncomment code, change `justify-end` to `justify-between`
- **Requires**: Steam auth + `syncPlaytime` enabled in settings

### 2. Suspend/Resume Feature (Nyrna-like)
- **Status**: Complete but disabled
- **Files**: 
  - `main/ProcessSuspendService.ts` (fully implemented)
  - `main/main.ts` lines ~874-1009 (commented out)
  - `OnyxSettingsModal.tsx` lines ~881-890, ~1926-2200 (commented out)
- **To Enable**: Uncomment IPC handlers, settings tab, and service initialization
- **Limitations**: Windows-only, may require admin privileges

## 📝 IMPORTANT NOTES

### Removed Components
- **GameEditor** removed - use **GameManager** instead

### Game ID Formats
- Steam: `steam-{appId}` (e.g., `steam-123456`)
- Custom: `custom-{timestamp}-{random}`

### Data Storage (electron-store)
- Games: `game-library`
- Preferences: `user-preferences`
- App Configs: `app-configs`
- Steam Auth: `steam-auth`

### Key IPC Handlers
- `steam:authenticate` - Link Steam account
- `steam:syncPlaytime` - Sync playtime data
- `appConfig:get/save` - App configuration
- `gameStore:getLibrary/saveGame` - Game operations
- `app:checkForUpdates` / `app:downloadUpdate` / `app:quitAndInstall` - Auto-update (packaged app only)

## 🔧 DEVELOPMENT WORKFLOW

### Running the App
```bash
npm run electron:dev  # ALWAYS use this for development (HMR enabled)
```

### Build Commands
- `npm run build` - Development build
- `npm run dist` - Local production executable
- `npm run increment-build` - Manual version increment

### Version System
- Format: `MAJOR.MINOR.PATCH` (e.g., `0.0.102`)
- PATCH = build number
- Auto-increments via git hook or `npm run increment-build`

## 🎨 COMMON PATTERNS

- **State**: React hooks (useState, useEffect)
- **Persistence**: electron-store services in main process
- **IPC**: All async ops through `window.electronAPI`
- **Styling**: Tailwind CSS classes
- **Error Handling**: Try-catch with user-friendly messages

## ✅ PRE-WORK CHECKLIST

Before ANY changes:
1. ✅ Read this workflow file
2. ✅ Check disabled features section
3. ✅ Understand project structure
4. ✅ Review TypeScript types in `renderer/src/types/game.ts`

Before ANY git operations:
1. ✅ STOP - Ask for permission
2. ✅ Show what will change
3. ✅ WAIT for user approval
4. ✅ Report results after execution

## 🐛 KNOWN ISSUES & FIXES

### Image optimization crash (repro steps)
To reproduce the optimization crash (app may hang or exit around ~80%):
1. **Remove all games** (clear the library).
2. **Run the importer** (scan / add sources as needed).
3. **Click Import** so many games are added and background image optimization runs.

Logs (when running unpacked, e.g. `electron .`): `debug-logs/optimization.log`, `debug-logs/crash-context.txt`, `debug-logs/crash-dumps/`. Force optimization on launch: `ONYX_FORCE_OPTIMIZE=1` (then optimization auto-starts after a few seconds).

### Logo Flickering Fix
- **Root Cause**: Cache buster timestamps stacking on every state update
- **Solution**: Only add cache busters on initial `loadLibrary()`, not on `updateGameInState()`
- **Files**: `renderer/src/hooks/useGameLibrary.ts`

### Per-Game Logo Sizing
- Sizes saved per game, per view mode (carousel/grid/list/logo)
- Storage: `logoSizePerViewMode` object in game data
- Uses local state (`localLogoSize`) for instant UI feedback

### Default Logo Sizes (New Games)
- **Status**: Defaults are currently 100px for Grid/List/Logo/Carousel when no per-game override exists
- **Files**: `renderer/src/components/RightClickMenu.tsx` (hardcoded fallbacks when no per-game override exists)

## 📚 QUICK REFERENCE

### Critical Files
- `main/main.ts` - IPC handlers
- `main/preload.ts` - API exposure
- `renderer/src/App.tsx` - Main app
- `renderer/src/components/GameDetailsPanel.tsx` - Game details
- `renderer/src/components/GameManager.tsx` - Game editing
- `renderer/src/components/OnyxSettingsModal.tsx` - Settings

### Key Interfaces
- `Game` - Game object structure
- `AppConfig` - Launcher configuration
- `SteamAuthState` - Steam auth state
- `GameMetadata` - Metadata structure

---

**This is the single agent guide.** All workflow and project context lives here; do not use `docs/agents.md` for agent instructions.
