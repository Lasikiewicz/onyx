# Onyx Improvements Based on DLSS Swapper Analysis

**Date**: 2026-01-15  
**Status**: Implemented

## Overview

After analyzing DLSS Swapper's game detection and launching system, several critical improvements have been implemented to make Onyx more reliable and accurate.

---

## Key Problems Fixed

### 1. ✅ **Steam State Validation** (CRITICAL FIX)

**Problem**: Onyx was detecting Steam games that weren't fully installed, in the middle of updates, or had missing files.

**Solution from DLSS Swapper**: Check `StateFlags` field in Steam's ACF manifest files to verify game installation status.

**Changes Made**:
- Added `SteamStateFlag` enum to `SteamService.ts` with all Steam installation states
- Parse `StateFlags` from ACF manifests during game scanning
- Skip games that aren't fully installed or have issues:
  - `StateUpdateRequired` - Game needs update
  - `StateFilesMissing` - Files are missing
  - `StateFilesCorrupt` - Files are corrupted
  - `StateUninstalling` - Game is being uninstalled
  - `StateDownloading` - Game is currently downloading
- Only add games with `StateFullyInstalled` flag set

**Files Modified**: `main/SteamService.ts`

**Impact**: Prevents adding broken/incomplete Steam games to library.

---

### 2. ✅ **Excluded Steam Apps List** (IMPORTANT FIX)

**Problem**: Non-game Steam apps like redistributables and tools were being added to the library.

**Solution from DLSS Swapper**: Maintain hardcoded list of known non-game Steam App IDs to skip.

**Changes Made**:
- Added `EXCLUDED_STEAM_APPIDS` set to `SteamService` class
- Currently excludes:
  - `228980` - Steamworks Common Redistributables
  - `1070560` - Steam Linux Runtime
  - `1391110` - Steam Linux Runtime - Soldier
  - `1493710` - Steam Linux Runtime - Sniper
- Check against this list before adding games

**Files Modified**: `main/SteamService.ts`

**Impact**: Cleaner library without system tools/redistributables.

---

### 3. ✅ **Enhanced Executable Filtering** (MAJOR IMPROVEMENT)

**Problem**: Onyx was detecting non-game executables as games (installers, updaters, launchers, crash reporters, etc.).

**Solution from DLSS Swapper**: More aggressive pattern matching against known non-game executable patterns.

**Changes Made** (`ImportService.findExecutables`):
- Added 30+ new exclusion patterns:
  - `update`, `patcher`, `repair` (updater tools)
  - `config`, `settings`, `benchmark` (configuration tools)
  - `diagnostic`, `reporter`, `monitor` (diagnostic tools)
  - `helper`, `service`, `daemon`, `agent` (background services)
  - `overlay`, `crashreport`, `errorhandler` (support tools)
  - `uplay`, `ubisoft`, `eadesktop`, `origin`, `epicgames`, `steam` (launcher executables)
  - `activation`, `redist`, `directx`, `prereq` (installer helpers)
  - `ue4`, `ue5` (Unreal Engine editor tools)
  - `*server`, `*editor` (server/editor executables)

**Files Modified**: `main/ImportService.ts`

**Impact**: Dramatically reduces false positives when scanning game folders.

---

### 4. ✅ **Install Path Validation** (RELIABILITY FIX)

**Problem**: Games with deleted install directories were still being added to the library.

**Solution from DLSS Swapper**: Always check `Directory.Exists()` before adding games.

**Changes Made**:
- Added `existsSync()` check in `XboxService.scanXboxGames` before adding game
- Logs warning and skips game if directory doesn't exist

**Files Modified**: `main/XboxService.ts`

**Impact**: Prevents adding games that are no longer installed.

---

### 5. ✅ **Platform-Specific URI Launch Protocols** (MAJOR FEATURE)

**Problem**: Onyx only supported launching Steam and generic .exe files. Other launcher games were launching incorrectly or not at all.

**Solution from DLSS Swapper**: Use each platform's native URI protocol for launching games.

**Launch Protocols Implemented**:
- **Steam**: `steam://rungameid/<AppID>` ✅ (existing)
- **Epic Games**: `com.epicgames.launcher://apps/<InstallPath>?action=launch&silent=true` ✅ **NEW**
- **EA/Origin**: `origin2://game/launch?offerIds=<OfferId>` ✅ **NEW**
- **GOG Galaxy**: `goggalaxy://openGameView/<ProductID>` ✅ **NEW**
- **Ubisoft Connect**: `uplay://launch/<GameID>` ✅ **NEW**

**Benefits**:
- Games launch through their native launcher (proper DRM, achievements, cloud saves)
- No need to find .exe files directly
- Launcher handles updates, DLC, etc.
- More reliable than direct .exe launching

**Files Modified**: `main/LauncherService.ts`

**Impact**: Correct platform-specific launching for all major launchers.

---

## Architecture Differences: DLSS Swapper vs Onyx

### DLSS Swapper's Approach
- **Game Detection**: Per-launcher library classes (`SteamLibrary`, `EpicGamesStoreLibrary`, etc.)
- **Manifest Parsing**: Reads native launcher manifests (`.acf`, `.item`, `.db`)
- **Registry Scanning**: Heavy use of Windows Registry for launcher paths
- **Binary Parsing**: Custom parsers for Ubisoft's binary configuration format
- **UWP Integration**: Uses Windows `PackageManager` API for Xbox games
- **Launch Method**: Direct executable launching for most platforms

### Onyx's Approach
- **Game Detection**: Unified `ImportService` with service delegation
- **Executable Scanning**: Recursive directory scanning for `.exe` files
- **Flexible Detection**: Handles both manifests and direct folder scanning
- **Metadata Integration**: Fetches game metadata from IGDB/RAWG/SteamGridDB
- **Launch Method**: **NOW IMPROVED** - Uses URI protocols for launchers, .exe for others

### Why These Differences Exist
- **DLSS Swapper** focuses on DLL swapping (needs precise game file locations)
- **Onyx** focuses on unified library management (metadata, organization, launching)
- Both approaches valid for their use cases

---

## What We Learned But Didn't Implement (Yet)

### 1. **Epic Games Manifest Parsing**
DLSS Swapper reads `.item` manifest files to filter games vs DLC:
```csharp
if (manifest?.AppCategories.Contains("games") != true) continue;
if (manifest.AppName != manifest.MainGameAppName) continue; // Skip DLC
```
**Onyx Status**: Could be added to `ImportService.scanEpic()` to skip DLC

### 2. **Xbox ApplicationId Loading**
DLSS Swapper parses `appxmanifest.xml` to get Application IDs for Xbox UWP launching:
```csharp
var launchCode = $"shell:appsFolder\\{PackageFamilyName}!{ApplicationId}";
Process.Start("explorer.exe", launchCode);
```
**Onyx Status**: Not critical since Xbox PC games use direct .exe launching

### 3. **Battle.net Launcher Integration**
DLSS Swapper has a hardcoded dictionary mapping game UIDs to launcher IDs:
```csharp
Process.Start(BattleNet.ClientPath, $"--exec=\"launch {LauncherId}\"");
```
**Onyx Status**: Would require mapping Battle.net game IDs to their launch codes

### 4. **Registry-Based Launcher Detection**
DLSS Swapper reads Windows Registry extensively for launcher paths:
```csharp
HKEY_LOCAL_MACHINE\SOFTWARE\Valve\Steam -> InstallPath
HKEY_LOCAL_MACHINE\SOFTWARE\Ubisoft\Launcher -> InstallDir
```
**Onyx Status**: Already has `LauncherDetectionService` with registry support

---

## Testing Checklist

After these changes, test the following:

### Steam Games
- [ ] Only fully installed Steam games appear in library
- [ ] Steamworks redistributables don't appear
- [ ] Games mid-download don't appear
- [ ] Steam games launch via `steam://` protocol

### Epic Games
- [ ] Epic games launch via `com.epicgames.launcher://` protocol
- [ ] DLC doesn't appear as separate games (if manifest parsing added)

### Xbox Game Pass
- [ ] Only games with valid install paths are added
- [ ] Helper executables are filtered out
- [ ] Games launch correctly

### Manual Folder Scanning
- [ ] Updaters/installers aren't detected as games
- [ ] Crash reporters aren't detected as games
- [ ] Launcher executables aren't detected as games

### EA/Origin & GOG
- [ ] Games launch via their respective URI protocols
- [ ] Correct platform detection

---

## Future Improvements

1. **Add Epic DLC Filtering**: Parse `.item` manifests to skip DLC
2. **Add Battle.net Launch Support**: Implement `Battle.net.exe --exec="launch <code>"` launching
3. **Add Rockstar Games Launcher Support**: Implement Rockstar URI protocol if available
4. **Xbox UWP Launch Support**: Parse `appxmanifest.xml` for proper UWP app launching
5. **Verify Install Directories**: Add periodic check to remove games with deleted folders
6. **State Monitoring**: Track if games are running, updating, etc.

---

## Files Changed Summary

| File | Changes | Impact |
|------|---------|--------|
| `main/SteamService.ts` | Added StateFlags validation, excluded apps list | Critical - prevents broken games |
| `main/ImportService.ts` | Enhanced executable filtering (30+ patterns) | Major - reduces false positives |
| `main/LauncherService.ts` | Added URI protocols for 4 new launchers | Major - correct platform launching |
| `main/XboxService.ts` | Added install path validation | Important - reliability |

---

## Key Takeaways

1. **State Validation Matters**: Always check if games are actually playable before adding them
2. **Be Aggressive with Filtering**: Better to miss a game than add 10 non-games
3. **Use Native Launch Methods**: URI protocols > Direct .exe launching
4. **Validate Paths**: Always check `existsSync()` before adding games
5. **Learn from Mature Projects**: DLSS Swapper has 3+ years of battle-testing

---

## References

- DLSS Swapper Repository: https://github.com/beeradmoore/dlss-swapper
- Steam StateFlags Documentation: https://github.com/lutris/lutris (similar implementation)
- URI Protocol Documentation: Each launcher's official docs
