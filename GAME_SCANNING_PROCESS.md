# Game Scanning Process Documentation

## Overview
The Onyx game launcher scans for games from multiple sources including Steam, Xbox Game Pass, Epic Games, EA Play, and manual folders. This document explains how the scanning process works.

## Scanning Sources

### 1. **Steam Library** (`steam:scanGames`)
- **Location**: Standard Steam installation directories (`Program Files (x86)\Steam\steamapps`)
- **Method**: Reads `libraryfolders.vdf` file to discover all Steam library locations
- **Game Detection**: Looks for valid Steam app directories with `appmanifest_*.acf` files
- **Executable**: Uses Steam App ID to identify and launch games (doesn't search for exe files)
- **Metadata**: Retrieves from IGDB API, SteamGridDB, or Steam Community

### 2. **Xbox Game Pass for PC** (`xbox:scanGames`)
- **Location**: `C:\XboxGames\` folder structure
- **Method**: 
  - Reads each game folder in XboxGames directory
  - Recursively searches up to 20 directory levels deep for `.exe` files
  - Filters out helper executables (GameLaunchHelper, bootstrapper, installer, setup, updater, launcher)
- **Game Detection**: Looks for a main executable file in the Content folder or closest to root
- **Selection Priority**:
  1. Executables in `Content\...\Binaries\WinGDK\` or similar game folders
  2. If multiple found, selects closest to root (fewest directory separators)
- **Known Issues**:
  - Some games (like Tony Hawk's Pro Skater 3+4) may not have directly accessible executables
  - Games might use custom launcher structures that aren't detected
  - Requires file system permissions to read all folders

### 3. **Epic Games Launcher** (`appConfig` scanning)
- **Location**: `C:\Program Files\Epic Games\` (configurable)
- **Method**: Scans for game executable files in folders
- **Detection**: Looks for `.exe` files that aren't installers or setup files

### 4. **EA Play / Origin** (`appConfig` scanning)
- **Location**: `C:\Program Files (x86)\Origin\` or `C:\Program Files\EA Games\` (configurable)
- **Method**: Scans configured paths for game executables
- **Detection**: Similar filtering as Epic Games

### 5. **Rockstar Games Launcher**
- **Location**: `C:\Program Files\Rockstar Games\`
- **Method**: Scans for game folders containing executable files
- **Filtering**: Skips known non-game folders (Launcher, Social Club)

### 6. **Manual Folders**
- **Location**: User-specified directories
- **Method**: Recursively scans folders for executable files
- **Game Detection**: Finds standalone game executables

## Scanning Flow

```
import:scanAllSources (Main entry point)
├── steam:scanGames
│   ├── Find Steam library paths
│   ├── List app manifests
│   └── Return Steam games
├── xbox:scanGames (XboxService.scanXboxGames)
│   ├── Read XboxGames folder
│   ├── For each game folder:
│   │   ├── findExecutables (recursive, 20 levels deep)
│   │   ├── Filter helper executables
│   │   └── Select main executable (prefer Content folder)
│   └── Return Xbox PC games
├── Epic Games / EA Play scanning
├── Rockstar scanning
└── Manual folder scanning
    ├── Recursively scan directories
    ├── Find all .exe files
    └── Filter non-game executables
```

## Executable Detection Logic

### Patterns Excluded:
- `gamelaunchhelper`
- `bootstrapper`
- `installer`
- `setup`
- `uninstall`
- `launcher`
- `updater`

### How Xbox Games are Selected:
1. **Find all executables** in the game folder (recursive, 20 levels deep)
2. **Filter out** helper executables using the pattern list above
3. **Prefer executables in Content folder** (Xbox Game Pass standard structure)
4. **Fallback**: Select executable closest to root (fewest `/` or `\` separators)

## Why Some Games Aren't Found

### Common Reasons:
1. **No Direct Executable**: Game might use a launcher or special boot system
   - Example: Tony Hawk's Pro Skater 3+4 may not have a standard executable
   - **Solution**: Check if the game folder has an alternative launch method

2. **Permission Issues**: Insufficient permissions to read game folders
   - Windows system folders might be restricted
   - **Solution**: Run as administrator or check folder permissions

3. **Unusual Folder Structure**: Game doesn't follow Xbox Game Pass standard paths
   - Expected: `XboxGames\GameName\Content\...Binaries\WinGDK\Game.exe`
   - Unusual structures aren't recognized
   - **Solution**: Manually add the game with correct executable path

4. **Deep Nesting**: Executable is deeper than 20 directory levels
   - **Solution**: Increase maxDepth in findExecutables (line 183 in XboxService.ts)

5. **Symlinks/Junctions**: Game uses symbolic links that prevent directory traversal
   - **Solution**: Check Windows Event Viewer for permission errors

## Metadata Fetching

After games are detected, the system fetches metadata:

1. **Image Metadata**:
   - Primary: SteamGridDB (high-quality fan-made artwork)
   - Fallback: IGDB (official game database)
   - Fallback: Steam Community (user-generated images)

2. **Game Information**:
   - IGDB API: Release date, genres, description, rating
   - Steam Community: Release year, platform info
   - SteamGridDB: Game verification, high-quality images

3. **Caching**:
   - Images can be cached locally for offline access
   - Metadata is stored in game database

## Timeout Handling

To prevent hanging requests, the following timeouts are implemented:

- **Artwork fetch**: 15 seconds
- **Metadata search**: 20 seconds
- **Full metadata fetch**: 20 seconds
- **Image caching**: 10 seconds
- **SteamGridDB operations**: 8 seconds each

If a request times out:
- Logs the error with game title
- Returns partial metadata if available
- Continues with next game
- User can manually update metadata

## Performance Optimization Tips

1. **Limit Deep Folder Scans**: For manual folders with many files, limit recursion depth
2. **Disable Metadata Fetching**: Turn off automatic metadata download if internet is slow
3. **Use Local Caching**: Enable "Store metadata locally" in settings
4. **Sequential vs Parallel**: System uses parallel scanning for speed but sequential metadata fetching to avoid rate limiting

## Debugging

To debug game scanning issues:

1. **Check logs**: Look for `[XboxService]` or `[ImportService]` log entries
2. **Verify folder structure**: Manually check game folder for executables
3. **Check permissions**: Run as administrator to access system folders
4. **Increase logging**: Monitor console output for detection patterns
5. **Manual addition**: If automatic detection fails, add game manually with correct path

## Future Improvements

- Better handling of custom launcher structures
- Detection of emulators and ROM collections
- Smarter executable selection based on file properties
- Batch metadata fetching with queue management
- Support for cloud game services (Xbox Cloud Gaming)
