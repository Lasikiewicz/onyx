---
description: Onyx AI Agent Guide - Critical Rules & Project Context
---

# 🚨 CRITICAL: READ BEFORE ANY CHANGES

## ⚠️ MANDATORY GIT RULES - NON-NEGOTIABLE

**NEVER push to git without explicit permission:**
- ❌ NO `git commit/push/pull` without asking first
- ✅ "Push to git" or "push to git master" = permission for **master** branch only
- **WORKFLOW**: Make changes → STOP → Ask user → Show summary → WAIT for approval → Execute
- **NEVER** add `Co-authored-by: Cursor <cursoragent@cursor.com>` (or any co-author line) to commit messages. Use `git commit -m "..."` only so the message is exactly the given summary.

## 🔄 RELEASE WORKFLOW (Strict Protocol)

### 1. "Push to git master"
**Push to remote git only. Does NOT build the app or trigger any CI.** Never add Co-authored-by to commits.
```bash
git add -A
git commit -m "[Summary]"
git push origin master
```

### 2. "Force to Alpha"
**Bump version, push to master, then force master → develop. Triggers 'Onyx Alpha' build.** (Do not build locally.)
```bash
npm run increment-build
git add package.json
git commit -m "Bump version for alpha"
git push origin master
git push origin master:develop --force
```

### 3. "Force to Main"
**Force remote develop → remote main. Triggers 'Onyx' (Production) app build.** (Do not build locally.)
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

**For full details, see**: `docs/agents.md`
