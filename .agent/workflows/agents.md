---
description: Onyx AI Agent Guide - Critical Rules & Project Context
---

# 🚨 CRITICAL: READ BEFORE ANY CHANGES

## ⚠️ MANDATORY GIT RULES - NON-NEGOTIABLE

**Agent CAN push to git when following established workflows below. CRITICAL requirements:**
- ✅ **ALWAYS use terminal commands** (`git commit -m "..."`, `git push`, etc.) - NEVER use Cursor's Source Control / commit UI
- ✅ **NEVER add Co-authored-by or Cursor branding** - The `commit-msg` hook strips these automatically, but don't add them in the first place
- ✅ **Terminal commits use your git config** (your name/email) as author - this is why we use terminal, not Cursor UI
- ✅ **Follow the workflows below** - These are the approved ways to push to git:
  - "Push to git master" / "push to git" = push to master branch
  - "Force to Alpha" = version bump + push workflow
  - "Force to Main" = production release workflow
  - "Push website live" = website deployment workflow

## 🔄 RELEASE WORKFLOW (Strict Protocol)

### 1. "Push to git master"
**Push to remote git only. Does NOT build the app or trigger any CI.** Cursor must not appear on GitHub (no co-author, no Cursor in message; commit from terminal so author is your git config).
```bash
git add -A
git commit -m "[Summary]"
git push origin master
```

### 2. "Force to Alpha"
**Bump version, add a brief changelog, push to master, then force master → develop. Triggers 'Onyx Alpha' build.** (Do not build locally.)

1. Run `npm run increment-build`, then read `version` from `package.json`.
2. **Add a brief changelog** for this alpha: edit [CHANGELOG.md](CHANGELOG.md)—add a new `## [X.Y.Z] - YYYY-MM-DD` section (or update `[Unreleased]`) with a short list of changes (e.g. "Auto-update support", "Fix settings save").
3. Commit message **must** be: `<version> <changes>` (version first, then brief description). Example: `0.3.2 Auto-update and changelog in agents`.
```bash
npm run increment-build
# Edit CHANGELOG.md with a brief changelog for this alpha, then:
git add package.json CHANGELOG.md
git commit -m "<version> <changes>"
git push origin master
git push origin master:develop --force
```
- Replace `<version>` with the value from `package.json` (e.g. `0.3.2`).
- Replace `<changes>` with a very short summary of what this alpha contains (can match the changelog heading).

### 3. "Force to Main"
**Force remote develop → remote main. Triggers 'Onyx' (Production) app build.** (Do not build locally.)

**CRITICAL:** You must push the **remote** develop branch to main, not your local `develop`. Always use `origin/develop` as the source ref so main gets the latest from the server after "Force to Alpha".
```bash
git fetch origin develop
git push origin origin/develop:main --force
```

### 4. "Push website live"
**Only push the website to production. Do NOT merge to main (that would trigger the Electron app build).**
1. Build the website:
   ```bash
   cd website && npm run build
   ```
2. Commit and push to master (if there are uncommitted changes):
   ```bash
   git add -A
   git commit -m "[Summary — e.g. website: ...]"
   git push origin master
   ```
3. Deploy the built site to Cloudflare:
   ```bash
   cd website && npx wrangler pages deploy dist --project-name=onyx
   ```
   If the deploy is a preview, promote it to production in the Cloudflare Pages dashboard.

### 5. Auto-update (In-app updates)

**How it works:** The app uses **electron-updater** and checks **GitHub Releases** for updates. Users are only notified when a **new release is published** to the repo (same version rules: alpha sees prereleases, production sees stable releases).

- **Force to Alpha** → Triggers the **Onyx Alpha** CI build from `develop`. For alpha users to see an update:
  - The alpha build artifacts must be **published to GitHub Releases** (e.g. by CI or manually).
  - The release must be marked as **Pre-release** so the alpha app (which checks for prereleases) sees it.
  - Then users running Onyx Alpha get an update notification: on startup (if "Check for updates on startup" is on), via **Help > Check for Updates**, or via a toast when an update is found.
- **Force to Main** → Triggers the **Onyx (Production)** build from `main`. For production users to see an update:
  - The production build artifacts must be **published to GitHub Releases** as a **stable** (non–pre-release) release.
  - Then users running Onyx get the same update notification (startup check, Help menu, or toast).

**Summary:** The workflows above trigger the builds; **publishing** those builds to GitHub Releases (with installer + `latest.yml`) is what makes the update appear in the app. If CI publishes on push to `develop`/`main` (or on tag), then Force to Alpha / Force to Main will lead to users being alerted once the release is published.

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

### Logo Flickering Fix
- **Root Cause**: Cache buster timestamps stacking on every state update
- **Solution**: Only add cache busters on initial `loadLibrary()`, not on `updateGameInState()`
- **Files**: `renderer/src/hooks/useGameLibrary.ts`

### Per-Game Logo Sizing
- Sizes saved per game, per view mode (carousel/grid/list/logo)
- Storage: `logoSizePerViewMode` object in game data
- Uses local state (`localLogoSize`) for instant UI feedback

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
