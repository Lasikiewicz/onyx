# Suspend Feature - Quick Reference

## Implementation Checklist

### Phase 1: Core Service ✅
- [ ] Create `main/ProcessSuspendService.ts`
- [ ] Install dependencies: `ffi-napi`, `ref-napi`, `ref-struct-napi`
- [ ] Implement Windows API bindings (NtSuspendProcess/NtResumeProcess)
- [ ] Add basic suspend/resume functions
- [ ] Test with a simple process

### Phase 2: Process Tracking ✅
- [ ] Modify `LauncherService.launchGame()` to return/store PID
- [ ] Add process tracking map in ProcessSuspendService
- [ ] Implement process discovery for Steam games
- [ ] Add process monitoring (detect when games close)

### Phase 3: Preferences ✅
- [ ] Add `enableSuspendFeature?: boolean` to `UserPreferences` interface
- [ ] Update `UserPreferencesService` defaults (default: false)
- [ ] Add conditional service loading in `main.ts`
- [ ] Create `InstallerPreferenceService.ts` for reading installer choice

### Phase 4: Settings UI ✅
- [ ] Add `'suspend'` to `TabType` in `OnyxSettingsModal.tsx`
- [ ] Create Suspend tab UI with:
  - Feature enable/disable toggle
  - Running games list
  - Suspend/Resume buttons
  - Status indicators
- [ ] Add real-time updates (polling or IPC events)

### Phase 5: IPC Integration ✅
- [ ] Add IPC handlers in `main.ts`:
  - `suspend:getRunningGames`
  - `suspend:suspendGame`
  - `suspend:resumeGame`
  - `suspend:getFeatureEnabled`
  - `suspend:setFeatureEnabled`
- [ ] Update `preload.ts` with suspend API
- [ ] Add TypeScript types

### Phase 6: Installer ✅
- [ ] Create `build/installer.nsh` NSIS script
- [ ] Add checkbox component page
- [ ] Write preference to registry: `HKCU\Software\Onyx\Features\SuspendEnabled`
- [ ] Update `package.json` build config
- [ ] Test installer flow

### Phase 7: Polish ✅
- [ ] Handle Steam game process discovery
- [ ] Handle multiple processes per game
- [ ] Add admin privilege detection/warning
- [ ] Improve error messages
- [ ] Add process monitoring

### Phase 8: Testing ✅
- [ ] Unit tests for ProcessSuspendService
- [ ] Integration tests for IPC
- [ ] Manual testing checklist
- [ ] Documentation

---

## Key Files to Create/Modify

### New Files
- `main/ProcessSuspendService.ts` - Core suspend service
- `main/InstallerPreferenceService.ts` - Read installer preferences
- `build/installer.nsh` - NSIS custom installer script
- `test/ProcessSuspendService.test.ts` - Unit tests

### Files to Modify
- `main/main.ts` - Add IPC handlers, conditional service loading
- `main/LauncherService.ts` - Track launched process PIDs
- `main/UserPreferencesService.ts` - Add `enableSuspendFeature` field
- `main/preload.ts` - Add suspend API methods
- `renderer/src/components/OnyxSettingsModal.tsx` - Add Suspend tab
- `package.json` - Add dependencies, update build config

---

## Dependencies to Install

```bash
npm install --save ffi-napi ref-napi ref-struct-napi
npm install --save-dev @types/node
```

**Alternative if ffi-napi doesn't work:**
- Use PowerShell commands via `child_process.exec()`
- Or create native Node.js addon with `node-gyp`

---

## IPC API Structure

### Main Process Handlers
```typescript
ipcMain.handle('suspend:getRunningGames', ...)
ipcMain.handle('suspend:suspendGame', ...)
ipcMain.handle('suspend:resumeGame', ...)
ipcMain.handle('suspend:getFeatureEnabled', ...)
ipcMain.handle('suspend:setFeatureEnabled', ...)
```

### Preload API
```typescript
window.electronAPI.suspend.getRunningGames()
window.electronAPI.suspend.suspendGame(gameId)
window.electronAPI.suspend.resumeGame(gameId)
window.electronAPI.suspend.getFeatureEnabled()
window.electronAPI.suspend.setFeatureEnabled(enabled)
```

---

## Windows API Functions Needed

```typescript
// From ntdll.dll
NtSuspendProcess(handle: number): number
NtResumeProcess(handle: number): number
NtOpenProcess(handlePtr: Buffer, access: number, objAttrs: Buffer, clientId: Buffer): number
NtClose(handle: number): number
```

---

## Process Tracking Strategy

### Direct Launches (Non-Steam)
```typescript
// In LauncherService
const child = spawn(exePath, []);
processSuspendService?.trackLaunchedGame(gameId, child.pid);
```

### Steam Games
```typescript
// Poll for process by executable name
const processes = await getAllProcesses();
const gameProcess = processes.find(p => p.name === exeName);
```

---

## Settings UI Structure

```
Suspend Tab
├── Feature Toggle (Enable/Disable)
├── Warning Message (Admin privileges, crashes)
└── Running Games List
    ├── Game Title
    ├── Process Info (PID, Status)
    └── Action Buttons (Suspend/Resume)
```

---

## Registry Structure

```
HKCU\Software\Onyx\Features
  └── SuspendEnabled: "0" or "1"
```

---

## Testing Priorities

1. **Critical Path**
   - Suspend/resume a simple process
   - Track launched game
   - Enable/disable feature in settings

2. **Edge Cases**
   - Steam game discovery
   - Multiple processes per game
   - Game crashes during suspend
   - Admin privilege handling

3. **User Experience**
   - Installer flow
   - Settings UI responsiveness
   - Error messages clarity

---

## Known Limitations

1. **Steam Games**: Process discovery may be imperfect (relies on exe name matching)
2. **Admin Rights**: May require administrator privileges on some systems
3. **Game Compatibility**: Some games may crash when suspended
4. **Process Discovery**: Child processes may not always be detected
5. **Windows Only**: Feature is Windows-specific (Linux support would require CRIU)

---

## Quick Start Commands

```bash
# Install dependencies
npm install --save ffi-napi ref-napi ref-struct-napi

# Development
npm run electron:dev

# Build
npm run dist

# Test installer
# Run the generated installer in dist/
```

---

## Troubleshooting

### ffi-napi won't compile
- **Solution**: Use PowerShell fallback or native addon approach

### Can't find game processes
- **Solution**: Improve process discovery logic, add window title matching

### Suspend doesn't work
- **Solution**: Check admin privileges, verify Windows API calls

### Installer checkbox doesn't work
- **Solution**: Verify NSIS script syntax, check registry write permissions

---

## Contact & Support

For questions or issues during implementation, refer to:
- Main plan: `SUSPEND_FEATURE_INTEGRATION_PLAN.md`
- Nyrna reference: https://github.com/Merrit/nyrna
- Windows API docs: https://docs.microsoft.com/en-us/windows/win32/procthread/
