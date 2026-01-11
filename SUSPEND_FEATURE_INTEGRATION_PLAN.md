# Suspend/Resume Feature Integration Plan

## Overview
This document outlines the complete plan to integrate Nyrna-like suspend/resume functionality into Onyx, with optional installation and runtime enable/disable capabilities.

---

## Table of Contents
1. [Architecture & Design](#architecture--design)
2. [Dependencies & Prerequisites](#dependencies--prerequisites)
3. [Implementation Phases](#implementation-phases)
4. [Technical Implementation Details](#technical-implementation-details)
5. [Installation Integration](#installation-integration)
6. [Settings Integration](#settings-integration)
7. [Testing Strategy](#testing-strategy)
8. [Risk Mitigation](#risk-mitigation)

---

## Architecture & Design

### Core Components

1. **ProcessSuspendService** (`main/ProcessSuspendService.ts`)
   - Handles process suspension/resumption using Windows APIs
   - Tracks running game processes
   - Manages process discovery and matching

2. **ProcessTracker** (within ProcessSuspendService)
   - Tracks launched game processes (PIDs)
   - Monitors process lifecycle
   - Handles child process discovery

3. **Settings Integration**
   - UserPreferences: `enableSuspendFeature` boolean flag
   - Settings UI: New "Suspend" tab in OnyxSettingsModal
   - Runtime enable/disable capability

4. **Installer Integration**
   - NSIS custom page with checkbox
   - Registry/config file storage
   - First-launch preference initialization

### Data Flow

```
User Action → Settings UI → IPC Handler → ProcessSuspendService → Windows API
                ↓
         UserPreferences (persisted)
```

---

## Dependencies & Prerequisites

### Required NPM Packages

```json
{
  "dependencies": {
    "ffi-napi": "^4.0.3",           // Windows API calls
    "ref-napi": "^3.0.3",            // Memory references for ffi
    "ref-struct-napi": "^1.1.1",     // Struct definitions
    "node-process-list": "^2.1.2"   // Process enumeration (alternative)
  }
}
```

### Alternative Approach
If `ffi-napi` proves problematic, consider:
- **Native Node.js addon** using `node-gyp` and C++
- **Pre-built binary** that Onyx calls via `child_process`
- **Windows PowerShell scripts** (less performant but simpler)

---

## Implementation Phases

### Phase 1: Core Service Foundation (Week 1)
**Goal**: Create the basic suspend/resume service infrastructure

#### Tasks:
1. ✅ Create `ProcessSuspendService.ts` with basic structure
2. ✅ Implement Windows API bindings (NtSuspendProcess/NtResumeProcess)
3. ✅ Add basic suspend/resume functions for a single PID
4. ✅ Create unit tests for suspend/resume operations
5. ✅ Add error handling and logging

#### Deliverables:
- `main/ProcessSuspendService.ts` (basic implementation)
- Basic IPC handlers in `main.ts`
- Test script to verify suspend/resume works

---

### Phase 2: Process Tracking (Week 1-2)
**Goal**: Track and discover running game processes

#### Tasks:
1. ✅ Modify `LauncherService` to track launched process PIDs
2. ✅ Implement process discovery for Steam games (by executable name)
3. ✅ Create process matching logic (exePath → running process)
4. ✅ Add process monitoring (detect when games close)
5. ✅ Handle child processes (game launchers, etc.)

#### Deliverables:
- Enhanced `LauncherService` with PID tracking
- Process discovery methods in `ProcessSuspendService`
- Process state tracking (running/suspended/stopped)

---

### Phase 3: User Preferences Integration (Week 2)
**Goal**: Add settings storage and conditional loading

#### Tasks:
1. ✅ Add `enableSuspendFeature` to `UserPreferences` interface
2. ✅ Update `UserPreferencesService` defaults
3. ✅ Implement conditional service initialization in `main.ts`
4. ✅ Add preference migration logic for existing users
5. ✅ Create installer preference reading logic

#### Deliverables:
- Updated `UserPreferencesService.ts`
- Conditional service loading in `main.ts`
- First-launch preference initialization

---

### Phase 4: Settings UI (Week 2-3)
**Goal**: Create user interface for suspend feature

#### Tasks:
1. ✅ Add "Suspend" tab to `OnyxSettingsModal.tsx`
2. ✅ Create enable/disable toggle
3. ✅ Display list of running games
4. ✅ Add suspend/resume buttons per game
5. ✅ Show process status indicators
6. ✅ Add warning messages about admin privileges
7. ✅ Implement real-time process list updates

#### Deliverables:
- New "Suspend" tab in settings modal
- Running games list component
- Suspend/resume controls
- Status indicators and warnings

---

### Phase 5: IPC & Preload Integration (Week 3)
**Goal**: Connect renderer to main process

#### Tasks:
1. ✅ Add IPC handlers in `main.ts`:
   - `suspend:getRunningGames`
   - `suspend:suspendGame`
   - `suspend:resumeGame`
   - `suspend:getFeatureEnabled`
   - `suspend:setFeatureEnabled`
2. ✅ Update `preload.ts` with new API methods
3. ✅ Create TypeScript types for IPC communication
4. ✅ Add error handling and user feedback

#### Deliverables:
- Complete IPC handler set
- Updated `preload.ts`
- Type definitions for suspend operations

---

### Phase 6: Installer Integration (Week 3-4)
**Goal**: Add optional installation checkbox

#### Tasks:
1. ✅ Create custom NSIS script (`build/installer.nsh`)
2. ✅ Add installer page with checkbox
3. ✅ Store choice in Windows Registry
4. ✅ Update `electron-builder.config.js`
5. ✅ Test installer flow
6. ✅ Handle upgrade scenarios (existing installations)

#### Deliverables:
- Custom NSIS installer script
- Updated `package.json` build config
- Registry reading logic in `main.ts`
- Installer testing documentation

---

### Phase 7: Polish & Edge Cases (Week 4)
**Goal**: Handle edge cases and improve UX

#### Tasks:
1. ✅ Handle Steam games (process discovery)
2. ✅ Handle games with multiple processes
3. ✅ Add process name matching fallbacks
4. ✅ Improve error messages
5. ✅ Add admin privilege detection
6. ✅ Handle process crashes gracefully
7. ✅ Add process monitoring (auto-detect when games close)

#### Deliverables:
- Robust error handling
- Edge case documentation
- User-facing error messages

---

### Phase 8: Testing & Documentation (Week 4-5)
**Goal**: Comprehensive testing and documentation

#### Tasks:
1. ✅ Unit tests for ProcessSuspendService
2. ✅ Integration tests for IPC handlers
3. ✅ Manual testing with various games (Steam, non-Steam)
4. ✅ Test installer flow
5. ✅ Test settings enable/disable
6. ✅ Performance testing
7. ✅ Write user documentation
8. ✅ Update README

#### Deliverables:
- Test suite
- User documentation
- Developer documentation
- Known issues/limitations list

---

## Technical Implementation Details

### 1. ProcessSuspendService.ts Structure

```typescript
export class ProcessSuspendService {
  private runningGames: Map<string, ProcessInfo>;
  private suspendedGames: Set<string>;
  
  // Windows API bindings
  private ntdll: any;
  
  constructor() {
    this.initializeWindowsAPI();
  }
  
  // Core methods
  async suspendProcess(pid: number): Promise<boolean>
  async resumeProcess(pid: number): Promise<boolean>
  async suspendGame(gameId: string): Promise<{ success: boolean; error?: string }>
  async resumeGame(gameId: string): Promise<{ success: boolean; error?: string }>
  
  // Process tracking
  trackLaunchedGame(gameId: string, pid: number): void
  async discoverGameProcess(gameId: string, exePath: string): Promise<number | null>
  async getRunningGames(): Promise<RunningGame[]>
  
  // Process monitoring
  startProcessMonitoring(): void
  stopProcessMonitoring(): void
}
```

### 2. Windows API Implementation

**Using ffi-napi approach:**
```typescript
import ffi from 'ffi-napi';
import ref from 'ref-napi';

const ntdll = ffi.Library('ntdll', {
  'NtSuspendProcess': ['long', ['long']],
  'NtResumeProcess': ['long', ['long']],
  'NtOpenProcess': ['long', ['pointer', 'ulong', 'pointer', 'pointer']],
  'NtClose': ['long', ['long']]
});
```

**Alternative: PowerShell approach (fallback)**
```typescript
import { exec } from 'child_process';

async suspendProcessPS(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`powershell -Command "Suspend-Process -Id ${pid}"`, (error) => {
      resolve(!error);
    });
  });
}
```

### 3. Process Tracking Strategy

**For Direct Launches (non-Steam):**
```typescript
// In LauncherService.launchGame()
const child = spawn(game.exePath, [], { detached: true });
if (processSuspendService && processSuspendService.isEnabled()) {
  processSuspendService.trackLaunchedGame(gameId, child.pid);
}
```

**For Steam Games:**
```typescript
// Poll for process discovery
async discoverSteamGameProcess(gameId: string, exePath: string): Promise<number | null> {
  const processes = await this.getAllProcesses();
  const exeName = path.basename(exePath);
  
  // Match by executable name
  const matchingProcess = processes.find(p => 
    p.name.toLowerCase() === exeName.toLowerCase()
  );
  
  return matchingProcess?.pid || null;
}
```

### 4. UserPreferences Integration

```typescript
// UserPreferencesService.ts
export interface UserPreferences {
  // ... existing fields
  enableSuspendFeature?: boolean;
}

// Defaults
defaults: {
  preferences: {
    // ... existing defaults
    enableSuspendFeature: false, // Opt-in by default
  }
}
```

### 5. Conditional Service Loading

```typescript
// main.ts
let processSuspendService: ProcessSuspendService | null = null;

async function initializeSuspendService() {
  const prefs = await userPreferencesService.getPreferences();
  
  // Check installer preference on first launch
  if (prefs.enableSuspendFeature === undefined) {
    const installerPref = await readInstallerPreference();
    if (installerPref !== null) {
      prefs.enableSuspendFeature = installerPref;
      await userPreferencesService.savePreferences({ enableSuspendFeature: installerPref });
    }
  }
  
  if (prefs.enableSuspendFeature) {
    try {
      processSuspendService = new ProcessSuspendService();
      registerSuspendIPCHandlers();
      console.log('Suspend service initialized');
    } catch (error) {
      console.error('Failed to initialize suspend service:', error);
    }
  }
}
```

### 6. IPC Handlers

```typescript
// main.ts
function registerSuspendIPCHandlers() {
  if (!processSuspendService) return;
  
  ipcMain.handle('suspend:getRunningGames', async () => {
    return await processSuspendService!.getRunningGames();
  });
  
  ipcMain.handle('suspend:suspendGame', async (_event, gameId: string) => {
    return await processSuspendService!.suspendGame(gameId);
  });
  
  ipcMain.handle('suspend:resumeGame', async (_event, gameId: string) => {
    return await processSuspendService!.resumeGame(gameId);
  });
  
  ipcMain.handle('suspend:getFeatureEnabled', async () => {
    const prefs = await userPreferencesService.getPreferences();
    return prefs.enableSuspendFeature || false;
  });
  
  ipcMain.handle('suspend:setFeatureEnabled', async (_event, enabled: boolean) => {
    await userPreferencesService.savePreferences({ enableSuspendFeature: enabled });
    
    if (enabled && !processSuspendService) {
      // Initialize service
      processSuspendService = new ProcessSuspendService();
      registerSuspendIPCHandlers();
    } else if (!enabled && processSuspendService) {
      // Cleanup service (may require restart for full cleanup)
      processSuspendService = null;
    }
    
    return { success: true };
  });
}
```

### 7. Preload API

```typescript
// preload.ts
suspend: {
  getRunningGames: () => ipcRenderer.invoke('suspend:getRunningGames'),
  suspendGame: (gameId: string) => ipcRenderer.invoke('suspend:suspendGame', gameId),
  resumeGame: (gameId: string) => ipcRenderer.invoke('suspend:resumeGame', gameId),
  getFeatureEnabled: () => ipcRenderer.invoke('suspend:getFeatureEnabled'),
  setFeatureEnabled: (enabled: boolean) => ipcRenderer.invoke('suspend:setFeatureEnabled', enabled),
}
```

---

## Installation Integration

### NSIS Custom Script

**File: `build/installer.nsh`**
```nsis
!macro customInstall
  ; Custom page for suspend feature
  !insertmacro MUI_PAGE_WELCOME
  !insertmacro MUI_PAGE_LICENSE "LICENSE"
  !insertmacro MUI_PAGE_COMPONENTS
  !insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  !insertmacro MUI_PAGE_FINISH
  
  ; Custom component page
  !define MUI_COMPONENTSPAGE_TEXT_TOP "Select additional features to install:"
  
  ; Component selection
  Section "Suspend/Resume Feature" SecSuspend
    SectionIn RO  ; Optional (remove RO to make it optional)
    ; Write to registry
    WriteRegStr HKCU "Software\Onyx\Features" "SuspendEnabled" "1"
  SectionEnd
  
  Section "-" SecSuspendDisabled
    ; Unchecked by default
    WriteRegStr HKCU "Software\Onyx\Features" "SuspendEnabled" "0"
  SectionEnd
!macroend
```

### Registry Reading

**File: `main/InstallerPreferenceService.ts`** (new)
```typescript
import { app } from 'electron';
import { platform } from 'node:os';

export class InstallerPreferenceService {
  static async readSuspendFeaturePreference(): Promise<boolean | null> {
    if (platform() !== 'win32') return null;
    
    try {
      const Registry = require('winreg');
      const regKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Onyx\\Features'
      });
      
      return new Promise((resolve) => {
        regKey.get('SuspendEnabled', (err: Error, item: any) => {
          if (err || !item) {
            resolve(null);
          } else {
            resolve(item.value === '1');
          }
        });
      });
    } catch (error) {
      console.error('Failed to read installer preference:', error);
      return null;
    }
  }
}
```

**Alternative: Config File Approach**
If registry access is problematic, use a config file:
```typescript
// Write during install to: %APPDATA%\Onyx\installer-config.json
// Read on first launch
```

### Package.json Update

```json
{
  "build": {
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "include": "build/installer.nsh"
    }
  }
}
```

---

## Settings Integration

### Settings Tab Structure

**File: `renderer/src/components/OnyxSettingsModal.tsx`**

```typescript
// Add to TabType
type TabType = 'general' | 'apis' | 'apps' | 'reset' | 'about' | 'appearance' | 'folders' | 'suspend';

// Add to tabs array
const tabs = [
  // ... existing tabs
  {
    id: 'suspend',
    label: 'Suspend',
    icon: <PauseIcon className="w-4 h-4" />
  }
];

// Add state
const [suspendFeatureEnabled, setSuspendFeatureEnabled] = useState(false);
const [runningGames, setRunningGames] = useState<RunningGame[]>([]);
const [isLoadingGames, setIsLoadingGames] = useState(false);

// Add tab content
{activeTab === 'suspend' && (
  <div className="space-y-6">
    {/* Feature Toggle */}
    <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30">
      <div className="flex-1 pr-4">
        <label className="text-gray-200 font-medium block mb-1">
          Enable Suspend/Resume Feature
        </label>
        <p className="text-gray-400 text-sm mb-2">
          Allow suspending and resuming running games to free up system resources.
          Similar to console suspend functionality.
        </p>
        <p className="text-yellow-400 text-xs">
          ⚠️ May require administrator privileges. Some games may crash when suspended.
        </p>
      </div>
      <button
        onClick={handleToggleSuspendFeature}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
          suspendFeatureEnabled ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            suspendFeatureEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>

    {/* Running Games List */}
    {suspendFeatureEnabled && (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Running Games</h3>
        {isLoadingGames ? (
          <div className="text-gray-400">Loading...</div>
        ) : runningGames.length === 0 ? (
          <div className="text-gray-400 p-4 rounded-lg bg-gray-700/30">
            No games currently running
          </div>
        ) : (
          <div className="space-y-2">
            {runningGames.map((game) => (
              <div
                key={game.gameId}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50"
              >
                <div className="flex-1">
                  <div className="text-white font-medium">{game.title}</div>
                  <div className="text-gray-400 text-sm">
                    PID: {game.pid} • {game.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  {game.status === 'running' ? (
                    <button
                      onClick={() => handleSuspendGame(game.gameId)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white text-sm"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResumeGame(game.gameId)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)}
```

---

## Testing Strategy

### Unit Tests

**File: `test/ProcessSuspendService.test.ts`**
```typescript
describe('ProcessSuspendService', () => {
  let service: ProcessSuspendService;
  
  beforeEach(() => {
    service = new ProcessSuspendService();
  });
  
  test('should suspend a process', async () => {
    // Test suspend functionality
  });
  
  test('should resume a suspended process', async () => {
    // Test resume functionality
  });
  
  test('should track launched games', () => {
    // Test process tracking
  });
  
  test('should discover game processes', async () => {
    // Test process discovery
  });
});
```

### Integration Tests

1. **IPC Handler Tests**
   - Test all IPC handlers with mock service
   - Test error handling
   - Test feature enable/disable flow

2. **End-to-End Tests**
   - Launch game → Track process → Suspend → Resume
   - Test Steam game discovery
   - Test settings toggle

### Manual Testing Checklist

- [ ] Install with suspend feature enabled
- [ ] Install with suspend feature disabled
- [ ] Enable feature in settings
- [ ] Disable feature in settings
- [ ] Suspend non-Steam game
- [ ] Suspend Steam game
- [ ] Resume suspended game
- [ ] Handle game crash during suspend
- [ ] Test with admin privileges
- [ ] Test without admin privileges
- [ ] Test process discovery for various games
- [ ] Test multiple games running simultaneously

---

## Risk Mitigation

### Technical Risks

1. **Windows API Compatibility**
   - **Risk**: ffi-napi may not work on all Windows versions
   - **Mitigation**: Provide PowerShell fallback, test on multiple Windows versions

2. **Process Discovery**
   - **Risk**: Cannot reliably find Steam game processes
   - **Mitigation**: Multiple discovery strategies (exe name, window title, process tree)

3. **Game Crashes**
   - **Risk**: Some games may crash when suspended
   - **Mitigation**: Clear warnings in UI, disclaimer in settings

4. **Admin Privileges**
   - **Risk**: Suspend may require admin rights
   - **Mitigation**: Detect and warn user, provide clear instructions

### User Experience Risks

1. **Feature Complexity**
   - **Risk**: Users may not understand the feature
   - **Mitigation**: Clear UI labels, tooltips, help text

2. **Performance Impact**
   - **Risk**: Process monitoring may impact performance
   - **Mitigation**: Lazy loading, efficient polling, optional monitoring

### Legal/Compliance Risks

1. **Process Manipulation**
   - **Risk**: Some anti-cheat software may flag process suspension
   - **Mitigation**: Clear warnings, user responsibility disclaimer

---

## Success Criteria

### Phase 1 Success
- ✅ Service can suspend/resume a test process
- ✅ Basic error handling works

### Phase 2 Success
- ✅ Can track launched games
- ✅ Can discover Steam game processes

### Phase 3 Success
- ✅ Settings properly stored and loaded
- ✅ Service initializes conditionally

### Phase 4 Success
- ✅ Settings UI displays correctly
- ✅ Running games list updates

### Phase 5 Success
- ✅ IPC communication works
- ✅ Renderer can control suspend service

### Phase 6 Success
- ✅ Installer checkbox works
- ✅ Preference persists to first launch

### Final Success
- ✅ Feature works end-to-end
- ✅ All edge cases handled
- ✅ Documentation complete
- ✅ No critical bugs

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Core Service | Week 1 | ProcessSuspendService.ts |
| Phase 2: Process Tracking | Week 1-2 | Enhanced LauncherService |
| Phase 3: Preferences | Week 2 | UserPreferences integration |
| Phase 4: Settings UI | Week 2-3 | Suspend tab in settings |
| Phase 5: IPC Integration | Week 3 | IPC handlers & preload |
| Phase 6: Installer | Week 3-4 | NSIS script & registry |
| Phase 7: Polish | Week 4 | Edge cases & UX |
| Phase 8: Testing | Week 4-5 | Tests & documentation |

**Total Estimated Time: 4-5 weeks**

---

## Next Steps

1. Review and approve this plan
2. Set up development environment with required dependencies
3. Begin Phase 1 implementation
4. Create feature branch: `feature/suspend-resume`
5. Set up CI/CD for testing

---

## Notes

- This feature is **opt-in** by default for safety
- Admin privileges may be required on some systems
- Some games may not work correctly with suspend/resume
- Process discovery for Steam games may be imperfect
- Consider adding telemetry to track feature usage (with user consent)

---

## References

- [Nyrna GitHub](https://github.com/Merrit/nyrna)
- [Windows Process APIs](https://docs.microsoft.com/en-us/windows/win32/procthread/process-and-thread-functions)
- [electron-builder NSIS](https://www.electron.build/configuration/nsis)
- [ffi-napi documentation](https://github.com/node-ffi-napi/node-ffi-napi)
