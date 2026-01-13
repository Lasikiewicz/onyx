# Onyx - AI Agent Guide

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  🚨 CRITICAL: YOU MUST READ THIS FILE BEFORE EXECUTING ANY COMMANDS 🚨      ║
║                                                                              ║
║  This file contains essential project context, architecture details,         ║
║  and information about disabled/future features.                              ║
║                                                                              ║
║  ALWAYS CHECK THIS FILE FIRST before making any changes to the codebase.     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## ⚠️ MANDATORY PRE-WORK CHECKLIST

**Before executing ANY command or making ANY code changes:**

1. ✅ **READ THIS ENTIRE FILE** - This is not optional
2. ✅ **Check "Future Features" section** - See what's disabled/planned
3. ✅ **Review "Important Notes" section** - Know what's been removed
4. ✅ **Understand project structure** - Know where files are located
5. ✅ **Check existing documentation** - Review related .md files if applicable

**Before ANY git operations (commit, push, pull):**
6. ✅ **STOP - ASK FOR PERMISSION FIRST** - Do not proceed without explicit user approval
7. ✅ **Show what will change** - List all files, commit message, branches affected
8. ✅ **WAIT for user response** - Only proceed after user says "yes" or approves
9. ✅ **Report results** - Tell user what was pushed/pulled after the fact

**If you skip this step, you may:**
- Re-enable disabled features
- Break existing functionality
- Duplicate work that's already done
- Miss important architectural constraints
- **Push unauthorized changes to git (CRITICAL BREACH)**

---

## 🚫 CRITICAL GIT RULES - MANDATORY

### **NEVER PUSH TO GIT WITHOUT EXPLICIT PERMISSION**

**This is ABSOLUTE and NON-NEGOTIABLE - DO NOT EVER SKIP THIS:**
- ❌ **DO NOT** `git commit` without asking first
- ❌ **DO NOT** `git push` to any branch (master, develop, main, or any other) EVER without explicit permission
- ❌ **DO NOT** `git pull` without asking first
- ❌ **DO NOT** force push (`--force`) without explicit instruction
- ❌ **DO NOT** proceed if permission is not explicitly given

**MANDATORY WORKFLOW - ALWAYS FOLLOW THIS EXACTLY:**
1. Make code changes and build successfully
2. **STOP - DO NOT COMMIT**
3. Ask the user: "I've made changes to files X, Y, Z. Here's the summary: [list changes]. Would you like me to commit and push?"
4. Show full summary of what will be committed
5. **WAIT for explicit user approval** (user must say "yes" or similar)
6. Only after explicit approval, run `git add`, `git commit`, `git push`
7. Report the results

**If you ever push without asking, that is a critical failure and breach of protocol.**

---

---

## Project Overview

**Onyx** is a premium unified game library application built with Electron, React, TypeScript, and Tailwind CSS. It provides a single interface for managing games from multiple launchers including Steam, Epic Games, GOG, Xbox Game Pass, EA Play, Ubisoft Connect, Battle.net, and more.

### Key Technologies
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Electron (Node.js), TypeScript
- **Storage**: electron-store (JSON-based local storage)
- **IPC**: ContextBridge for secure communication between main and renderer processes

### Build Channels
- **Development**: Local development builds on `master` branch
- **Alpha**: Testing builds from `develop` branch (installs as "Onyx Alpha")
- **Production**: Stable builds from `main` branch (installs as "Onyx")

### Git Workflow
**All local work and testing is done on the `master` branch.**

- **Alpha Deployment**: Force push `master` → `develop` to trigger Alpha build
  ```bash
  git push origin master:develop --force
  ```

- **Production Deployment**: Force push `develop` → `main` to trigger Production build
  ```bash
  git push origin develop:main --force
  ```

---

## Project Structure

```
├── main/                    # Electron main process (backend)
│   ├── main.ts              # Main process entry point, IPC handlers
│   ├── preload.ts           # Preload script with ContextBridge API
│   ├── GameStore.ts         # Game library storage and management
│   ├── SteamService.ts      # Steam game scanning and playtime fetching
│   ├── SteamAuthService.ts  # Steam account authentication
│   ├── AppConfigService.ts  # App/launcher configuration storage
│   ├── UserPreferencesService.ts  # User preferences storage
│   ├── MetadataFetcherService.ts  # Game metadata fetching (IGDB, RAWG, etc.)
│   └── [other services]     # Various service classes
├── renderer/                # React frontend
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   ├── components/      # React components
│   │   │   ├── GameDetailsPanel.tsx  # Right panel showing game details
│   │   │   ├── GameManager.tsx       # Game editing/management modal
│   │   │   ├── OnyxSettingsModal.tsx # Settings modal
│   │   │   └── [other components]
│   │   └── types/           # TypeScript type definitions
│   └── index.html
├── dist-electron/           # Compiled main process files
└── dist/                    # Built renderer files
```

---

## Key Components

### Main Process Services

1. **GameStore** (`main/GameStore.ts`)
   - Manages game library storage using electron-store
   - Handles game CRUD operations
   - Merges Steam games into library
   - Game interface includes: `id`, `title`, `platform`, `playtime`, `boxArtUrl`, `bannerUrl`, etc.

2. **SteamService** (`main/SteamService.ts`)
   - Scans Steam libraries for installed games
   - Parses VDF/ACF files to discover games
   - **Has `fetchPlaytimeData()` method** for fetching playtime from Steam API

3. **SteamAuthService** (`main/SteamAuthService.ts`)
   - Handles Steam account linking via OpenID
   - Stores authentication state (steamId, username)
   - Uses electron-store for persistence

4. **AppConfigService** (`main/AppConfigService.ts`)
   - Manages launcher/app configurations
   - Stores enabled/disabled state, paths, autoAdd, **syncPlaytime** settings
   - AppConfig interface: `{ id, name, enabled, path, autoAdd?, syncPlaytime? }`

### Renderer Components

1. **GameDetailsPanel** (`renderer/src/components/GameDetailsPanel.tsx`)
   - Right-side panel showing selected game details
   - Displays game metadata, images, description
   - **Future: Will display playtime in bottom left corner**

2. **GameManager** (`renderer/src/components/GameManager.tsx`)
   - Modal for editing game metadata
   - Handles image search, metadata updates
   - **Note: GameEditor component has been removed - use GameManager instead**

3. **OnyxSettingsModal** (`renderer/src/components/OnyxSettingsModal.tsx`)
   - Settings interface with tabs: General, APIs, Apps, Appearance, Reset, About
   - Apps tab: Configure launchers (Steam, Epic, etc.)
   - **Steam section includes: Auto add toggle, Sync Playtime toggle**

---

## IPC Communication

All IPC communication goes through `main/preload.ts` which exposes `window.electronAPI` to the renderer.

Key IPC handlers:
- `steam:authenticate` - Link Steam account
- `steam:getAuthState` - Get Steam auth status
- `steam:syncPlaytime` - Sync playtime for all Steam games
- `appConfig:get` - Get app configuration
- `appConfig:save` - Save app configuration
- `gameStore:getLibrary` - Get all games
- `gameStore:saveGame` - Save/update a game

---

## Important Notes

### Removed Components
- **GameEditor** has been removed. All game editing is now done through **GameManager**.

### Game ID Format
- Steam games: `steam-{appId}` (e.g., `steam-123456`)
- Custom games: `custom-{timestamp}-{random}`
- Xbox games: Use their unique ID format

### Data Storage
- Games: Stored in `game-library` electron-store
- Preferences: Stored in `user-preferences` electron-store
- App Configs: Stored in `app-configs` electron-store
- Steam Auth: Stored in `steam-auth` electron-store

---

## Future Features

### Steam Playtime Display (DISABLED - Future Feature)

**Status**: Implementation complete but disabled. Ready to enable when needed.

**Overview**: Display playtime for Steam games in the GameDetailsPanel when sync playtime is enabled.

#### Implementation Details

**Backend Implementation** (`main/SteamService.ts`):
- `fetchPlaytimeData(steamId: string, apiKey?: string)` method
  - Tries Steam Web API first if API key provided
  - Falls back to Steam Community API (parses XML)
  - Returns `Map<string, number>` (appId → playtime in minutes)

**IPC Handler** (`main/main.ts`):
- `steam:syncPlaytime` handler
  - Checks if Steam account is linked
  - Fetches playtime data from Steam
  - Updates all matching Steam games in library
  - Only updates if playtime field is not locked
  - Returns: `{ success, updatedCount, totalGames, error? }`

**Settings Integration** (`renderer/src/components/OnyxSettingsModal.tsx`):
- Added `syncPlaytime?: boolean` to AppConfig interface
- Toggle in Steam settings section (Apps tab)
- Appears after "Auto add" toggle when authenticated
- Saved with other app configurations

**Frontend Display** (`renderer/src/components/GameDetailsPanel.tsx`):
- **Currently disabled** (commented out)
- Location: Bottom left corner of action buttons section
- Display conditions:
  1. `syncPlaytime` enabled in Steam app config
  2. Game is a Steam game (`id.startsWith('steam-')`)
  3. Playtime data exists (`playtime > 0`)
- Format: `{hours}h {minutes}m` (e.g., "5h 30m")
- Styling: Small gray text, positioned absolutely

**Code Location**:
```typescript
// In GameDetailsPanel.tsx, line ~885 (currently commented out):
{/* Playtime display - DISABLED (Future Feature) */}
{steamSyncPlaytimeEnabled && game.id.startsWith('steam-') && 
 game.playtime !== undefined && game.playtime > 0 && (
  <div className="absolute left-4 bottom-4 text-sm text-gray-400">
    <span className="font-medium text-gray-300">
      {Math.floor(game.playtime / 60)}h {game.playtime % 60}m
    </span>
  </div>
)}
```

**To Enable**:
1. Uncomment the playtime display code in `GameDetailsPanel.tsx`
2. Change `justify-end` to `justify-between` in action buttons container
3. Wrap buttons in a `div` with `ml-auto` class
4. Test with a Steam game that has playtime data

**Dependencies**:
- Requires Steam account to be linked (`steam:authenticate`)
- Requires `syncPlaytime` to be enabled in Settings > Apps > Steam
- Requires playtime data to be synced (`steam:syncPlaytime`)

**Data Flow**:
1. User enables "Sync Playtime" in Settings > Apps > Steam
2. User links Steam account (if not already linked)
3. User can manually sync playtime via `steam:syncPlaytime` IPC call
4. Playtime is stored in `Game.playtime` field (in minutes)
5. GameDetailsPanel checks config and displays if conditions met

**TypeScript Types**:
- `AppConfig` interface includes `syncPlaytime?: boolean`
- `Game` interface includes `playtime?: number` (in minutes)
- `getAppConfig` return type includes `syncPlaytime?: boolean`

---

### Suspend/Resume Feature (DISABLED - Future Feature)

**Status**: Implementation complete but disabled. Ready to enable when needed.

**Overview**: Nyrna-like suspend/resume functionality that allows users to suspend and resume running games to free up system resources, similar to console suspend functionality (Nintendo Switch, PlayStation).

#### Implementation Details

**Backend Service** (`main/ProcessSuspendService.ts`):
- `ProcessSuspendService` class handles process suspension/resumption
- Uses Windows APIs via PowerShell/WMIC commands
- Tracks running game processes (PIDs)
- Monitors process lifecycle and detects when games close
- Handles child process discovery for games with multiple processes
- Methods:
  - `suspendProcess(pid: number)` - Suspend a process by PID
  - `resumeProcess(pid: number)` - Resume a suspended process
  - `getRunningGames()` - Get list of currently running games
  - `suspendGame(gameId: string)` - Suspend a game by ID
  - `resumeGame(gameId: string)` - Resume a game by ID
  - `startProcessMonitoring(interval: number)` - Monitor processes periodically

**IPC Handlers** (`main/main.ts`):
- `suspend:getRunningGames` - Get list of running games with status
- `suspend:suspendGame` - Suspend a specific game
- `suspend:resumeGame` - Resume a suspended game
- `suspend:getFeatureEnabled` - Check if feature is enabled
- `suspend:setFeatureEnabled` - Enable/disable the feature
- `suspend:getShortcut` - Get keyboard shortcut
- `suspend:setShortcut` - Set keyboard shortcut
- **Currently commented out** - `registerSuspendIPCHandlers()` and `initializeSuspendService()`

**Settings Integration** (`renderer/src/components/OnyxSettingsModal.tsx`):
- **Suspend tab is commented out** in tabs array (line ~881)
- **Suspend tab content is disabled** with `{false && activeTab === 'suspend' &&` (line ~1926)
- **Auto-refresh useEffect is commented out** (line ~287)
- Tab would show:
  - Feature enable/disable toggle
  - Keyboard shortcut configuration
  - Running games list with suspend/resume buttons
  - Process status indicators (running/suspended)
  - Warning about admin privileges

**User Preferences** (`main/UserPreferencesService.ts`):
- `enableSuspendFeature?: boolean` - Feature enable flag
- `suspendShortcut?: string` - Keyboard shortcut (default: 'Ctrl+Shift+S')

**Installer Integration** (`build/installer.nsh`):
- NSIS custom page with checkbox to enable during installation
- Stores preference in Windows Registry: `HKCU\Software\Onyx\Features\SuspendEnabled`
- `InstallerPreferenceService` reads this on first launch

**Global Keyboard Shortcut**:
- Registers global shortcut (works even when Onyx is in background)
- Toggles suspend/resume for the active game
- **Currently commented out** - `registerSuspendShortcut()` call

**Code Locations**:
- Service: `main/ProcessSuspendService.ts` (fully implemented)
- IPC Handlers: `main/main.ts` lines ~874-1009 (commented out)
- Settings UI: `renderer/src/components/OnyxSettingsModal.tsx` lines ~881-890, ~1926-2200 (commented out)
- Preload API: `main/preload.ts` lines ~133-141 (still exposed but handlers disabled)
- TypeScript Types: `renderer/src/types/game.ts` lines ~160-167

**To Enable**:
1. Uncomment suspend tab in `OnyxSettingsModal.tsx` tabs array (line ~881)
2. Change `{false && activeTab === 'suspend' &&` to `{activeTab === 'suspend' &&` (line ~1926)
3. Uncomment auto-refresh useEffect (line ~287)
4. Uncomment `registerSuspendIPCHandlers()` in `main/main.ts` (line ~5018)
5. Uncomment `await initializeSuspendService()` in `main/main.ts` (line ~5021)
6. Uncomment shortcut registration in `main/main.ts` (line ~5025-5027)
7. Test with a running game

**Dependencies**:
- Windows-only feature (uses Windows APIs)
- May require administrator privileges for some games
- Uses PowerShell/WMIC commands (no external dependencies needed)

**Known Limitations**:
- Some games may crash when suspended
- Requires admin privileges for certain processes
- Only works on Windows
- Process discovery may not work for all game types

**Documentation**:
- Full implementation plan: `SUSPEND_FEATURE_INTEGRATION_PLAN.md`
- Quick reference: `SUSPEND_FEATURE_QUICK_REFERENCE.md`

---

## Development Guidelines

### Before Making Changes

1. **Read this file** to understand the project structure
2. **Check existing documentation**:
   - `GAME_SCANNING_PROCESS.md` - How game scanning works
   - `GAME_SEARCH_LOGIC_FLOW.md` - Metadata search flow
   - `SUSPEND_FEATURE_INTEGRATION_PLAN.md` - Suspend feature docs
3. **Understand the data flow**: Main process ↔ IPC ↔ Renderer process
4. **Check TypeScript types** in `renderer/src/types/game.ts` and service files

### Common Patterns

- **State Management**: React hooks (useState, useEffect) in components
- **Persistence**: electron-store services in main process
- **IPC**: All async operations go through `window.electronAPI`
- **Styling**: Tailwind CSS classes
- **Error Handling**: Try-catch blocks with user-friendly error messages

### Testing Considerations

- Test with actual Steam games when working on Steam features
- Verify electron-store persistence after changes
- Check IPC communication in DevTools console
- Test with both authenticated and unauthenticated Steam accounts

---

## Quick Reference

### Key Files to Know

- `main/main.ts` - IPC handlers, app initialization
- `main/preload.ts` - IPC API exposure
- `renderer/src/App.tsx` - Main React app
- `renderer/src/components/GameDetailsPanel.tsx` - Game details display
- `renderer/src/components/GameManager.tsx` - Game editing
- `renderer/src/components/OnyxSettingsModal.tsx` - Settings UI

### Important Interfaces

- `Game` - Game object structure
- `AppConfig` - Launcher/app configuration
- `SteamAuthState` - Steam authentication state
- `GameMetadata` - Game metadata structure

---

**Last Updated**: 2025-01-09
**Version**: 0.0.75
