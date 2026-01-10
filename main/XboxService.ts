import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

export interface XboxGame {
  id: string;
  name: string;
  installPath: string;
  type: 'uwp' | 'pc';
}

export class XboxService {
  /**
   * Scan WindowsApps folder for UWP games
   */
  private scanWindowsApps(winAppsPath: string): XboxGame[] {
    const games: XboxGame[] = [];
    
    if (!existsSync(winAppsPath)) {
      console.warn(`WindowsApps folder not found: ${winAppsPath}`);
      return games;
    }

    try {
      // WindowsApps requires special permissions, so we'll try to read it
      const entries = readdirSync(winAppsPath);
      
      for (const entry of entries) {
        // UWP apps are typically in folders with long names like:
        // Microsoft.XboxGameOverlay_1.0.0.0_x64__8wekyb3d8bbwe
        const fullPath = join(winAppsPath, entry);
        
        try {
          const stats = statSync(fullPath);
          if (stats.isDirectory()) {
            // Look for .exe files in the folder (UWP games have executables)
            try {
              const subEntries = readdirSync(fullPath);
              const hasExe = subEntries.some(e => e.toLowerCase().endsWith('.exe'));
              
              if (hasExe) {
                // Try to find the main executable
                const exeFile = subEntries.find(e => 
                  e.toLowerCase().endsWith('.exe') && 
                  !e.toLowerCase().includes('installer') &&
                  !e.toLowerCase().includes('setup')
                );
                
                if (exeFile) {
                  // Extract a readable name from the folder name
                  const name = this.extractAppName(entry);
                  
                  games.push({
                    id: `xbox-uwp-${entry}`,
                    name: name,
                    installPath: join(fullPath, exeFile),
                    type: 'uwp',
                  });
                  console.log(`✓ Found UWP game: ${name}`);
                }
              }
            } catch (err) {
              // Skip folders we can't access
              continue;
            }
          }
        } catch (err) {
          // Skip entries we can't access
          continue;
        }
      }
    } catch (error) {
      console.error(`Error scanning WindowsApps: ${error}`);
    }

    return games;
  }

  /**
   * Scan XboxGames folder for PC Game Pass games
   * Games can be in various structures:
   * - C:\XboxGames\GameName\Content\Game.exe
   * - C:\XboxGames\GameName\Game.exe
   * - C:\XboxGames\GameName\SubFolder\Game.exe
   */
  private scanXboxGames(xboxGamesPath: string): XboxGame[] {
    const games: XboxGame[] = [];
    
    if (!existsSync(xboxGamesPath)) {
      console.warn(`[XboxService] XboxGames folder not found: ${xboxGamesPath}`);
      return games;
    }

    console.log(`[XboxService] Scanning XboxGames folder: ${xboxGamesPath}`);

    try {
      const entries = readdirSync(xboxGamesPath);
      console.log(`[XboxService] Found ${entries.length} entries in XboxGames folder`);
      
      for (const entry of entries) {
        const fullPath = join(xboxGamesPath, entry);
        
        try {
          const stats = statSync(fullPath);
          if (!stats.isDirectory()) {
            continue;
          }

          // Skip known non-game folders
          const dirName = entry.toLowerCase();
          if (dirName === 'content' || dirName === 'metadata' || dirName.startsWith('$')) {
            continue;
          }

          console.log(`[XboxService] Scanning game folder: ${entry}`);
          
          // Deep scan for executables (up to 20 levels deep)
          const exeFiles = this.findExecutables(fullPath, 0, 20);
          console.log(`[XboxService] Found ${exeFiles.length} executables in ${entry}`);
          
          // Filter out helper executables
          const gameExes = exeFiles.filter(exe => {
            const fileName = exe.toLowerCase();
            const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
            return !fileNameOnly.includes('gamelaunchhelper') &&
                   !fileNameOnly.includes('bootstrapper') &&
                   !fileNameOnly.includes('installer') &&
                   !fileNameOnly.includes('setup') &&
                   !fileNameOnly.includes('uninstall') &&
                   !fileNameOnly.includes('updater') &&
                   !fileNameOnly.includes('launcher') &&
                   !fileNameOnly.endsWith('gamelaunchhelper.exe') &&
                   !fileNameOnly.endsWith('bootstrapper.exe') &&
                   fileNameOnly !== 'crashreportclient.exe' &&
                   fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                   fileNameOnly !== 'crashpad_handler.exe' &&
                   fileNameOnly !== 'embark-crash-helper.exe' &&
                   fileNameOnly !== 'blizzardbrowser.exe' &&
                   fileNameOnly !== 'blizzarderror.exe';
          });
          
          console.log(`[XboxService] Filtered to ${gameExes.length} game executables in ${entry}`);
          
          if (gameExes.length > 0) {
            // Prefer executables in Content folder or root, avoid helper folders
            let mainExe = gameExes[0];
            
            // Try to find executable in Content folder first (common Xbox Game Pass structure)
            const contentExe = gameExes.find(exe => {
              const relativePath = exe.replace(fullPath, '').toLowerCase();
              return relativePath.includes('content') && 
                     !relativePath.includes('gamelaunchhelper') &&
                     !relativePath.includes('bootstrapper');
            });
            
            if (contentExe) {
              mainExe = contentExe;
            } else {
              // Prefer executables closer to root (fewer directory separators)
              const exeWithDepth = gameExes.map(exe => ({
                exe,
                depth: (exe.match(/[/\\]/g) || []).length
              }));
              exeWithDepth.sort((a, b) => a.depth - b.depth);
              mainExe = exeWithDepth[0].exe;
            }
            
            games.push({
              id: `xbox-pc-${entry}`,
              name: entry, // Use folder name as game name
              installPath: mainExe,
              type: 'pc',
            });
            console.log(`[XboxService] ✓ Found Xbox PC game: ${entry} (${mainExe})`);
          } else {
            // Log detailed information about the folder structure for debugging
            console.log(`[XboxService] No valid game executables found in ${entry}`);
            
            // Check if folder has specific structures that might indicate issues
            try {
              const folderContents = readdirSync(fullPath);
              const hasContentFolder = folderContents.some(f => f.toLowerCase() === 'content');
              const hasBinariesFolder = folderContents.some(f => f.toLowerCase().includes('binaries'));
              const hasBuildFolder = folderContents.some(f => f.toLowerCase() === 'build');
              
              if (hasContentFolder || hasBinariesFolder || hasBuildFolder) {
                console.log(`[XboxService]   └─ Folder has expected structure (Content: ${hasContentFolder}, Binaries: ${hasBinariesFolder}, Build: ${hasBuildFolder})`);
                console.log(`[XboxService]   └─ Sub-folders: ${folderContents.filter(f => {
                  const stat = statSync(join(fullPath, f));
                  return stat.isDirectory();
                }).slice(0, 5).join(', ')}${folderContents.length > 5 ? '...' : ''}`);
              } else {
                console.log(`[XboxService]   └─ Root contents: ${folderContents.slice(0, 5).join(', ')}${folderContents.length > 5 ? '...' : ''}`);
              }
            } catch (err) {
              console.log(`[XboxService]   └─ Could not inspect folder structure: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }
        } catch (err) {
          console.warn(`[XboxService] Could not scan entry "${entry}":`, err);
          continue;
        }
      }
    } catch (error) {
      console.error(`[XboxService] Error scanning XboxGames: ${error}`);
    }

    console.log(`[XboxService] Total Xbox PC games found: ${games.length}`);
    return games;
  }

  /**
   * Find executable files in a directory (recursive, deep scan with high max depth)
   */
  private findExecutables(dirPath: string, depth: number = 0, maxDepth: number = 20): string[] {
    const executables: string[] = [];
    
    if (depth > maxDepth) return executables;
    
    // Common non-game executables to exclude
    const excludeNames = [
      'gamelaunchhelper.exe',
      'bootstrapper.exe',
      'gamelaunchhelper',
      'bootstrapper',
    ];
    
    try {
      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        
        try {
          const stats = statSync(fullPath);
          
          if (stats.isFile() && entry.toLowerCase().endsWith('.exe')) {
            // Exclude common non-game executables
            const lowerName = entry.toLowerCase();
            const baseName = lowerName.replace('.exe', '');
            
            // Check exact matches first
            if (excludeNames.includes(lowerName) || excludeNames.includes(baseName)) {
              continue;
            }
            
            // Check patterns - but be less aggressive about filtering
            // The main goal is to find ANY exe, then let the caller decide
            if (!lowerName.includes('installer') &&
                !lowerName.includes('setup') &&
                !lowerName.includes('uninstall') &&
                !lowerName.includes('launcher') &&
                !lowerName.includes('updater') &&
                !lowerName.includes('gamelaunchhelper') &&
                !lowerName.includes('bootstrapper')) {
              executables.push(fullPath);
            }
          } else if (stats.isDirectory() && depth < maxDepth) {
            // Skip known system/cache folders to speed up search
            const dirName = entry.toLowerCase();
            if (dirName === '$recycle.bin' || 
                dirName === 'system volume information' ||
                dirName === '.git' ||
                dirName === '__pycache__' ||
                dirName === 'node_modules') {
              continue;
            }
            
            // Recursively search subdirectories
            const subExes = this.findExecutables(fullPath, depth + 1, maxDepth);
            executables.push(...subExes);
          }
        } catch (err) {
          // Skip entries we can't access (permission denied, etc.)
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (depth === 0) {
            // Only log permission errors at root level to avoid spam
            console.debug(`[XboxService] Could not access "${fullPath}": ${errorMsg.substring(0, 50)}`);
          }
          continue;
        }
      }
    } catch (err) {
      // Skip directories we can't read
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (depth === 0) {
        console.debug(`[XboxService] Could not read directory "${dirPath}": ${errorMsg.substring(0, 50)}`);
      }
    }
    
    return executables;
  }

  /**
   * Extract a readable app name from UWP folder name
   */
  private extractAppName(folderName: string): string {
    // UWP folder format: Publisher.AppName_Version_Architecture_Hash
    // Example: Microsoft.XboxGameOverlay_1.0.0.0_x64__8wekyb3d8bbwe
    
    // Remove version and hash parts
    let name = folderName.split('_')[0];
    
    // Remove publisher prefix if present (e.g., "Microsoft.")
    if (name.includes('.')) {
      const parts = name.split('.');
      // Take the last part as it's usually the app name
      name = parts[parts.length - 1];
    }
    
    // Convert to readable format (remove dots, add spaces)
    name = name.replace(/\./g, ' ');
    
    return name || folderName;
  }

  /**
   * Scan for Xbox Game Pass games from a given path
   */
  public scanGames(xboxPath: string): XboxGame[] {
    if (platform() !== 'win32') {
      throw new Error('Xbox Game Pass scanning is currently only supported on Windows');
    }

    console.log(`[XboxService] Scanning Xbox games from path: ${xboxPath}`);
    const games: XboxGame[] = [];
    
    // Check if path is WindowsApps or XboxGames
    if (xboxPath.includes('WindowsApps')) {
      console.log(`[XboxService] Detected WindowsApps path, scanning UWP games`);
      const winAppsGames = this.scanWindowsApps(xboxPath);
      games.push(...winAppsGames);
    } else if (xboxPath.includes('XboxGames')) {
      console.log(`[XboxService] Detected XboxGames path, scanning PC games`);
      const xboxGames = this.scanXboxGames(xboxPath);
      games.push(...xboxGames);
    } else {
      // Try both locations
      const winAppsPath = join(xboxPath, 'WindowsApps');
      const xboxGamesPath = join(xboxPath, 'XboxGames');
      
      if (existsSync(winAppsPath)) {
        console.log(`[XboxService] Found WindowsApps subfolder, scanning UWP games`);
        const winAppsGames = this.scanWindowsApps(winAppsPath);
        games.push(...winAppsGames);
      }
      
      if (existsSync(xboxGamesPath)) {
        console.log(`[XboxService] Found XboxGames subfolder, scanning PC games`);
        const xboxGames = this.scanXboxGames(xboxGamesPath);
        games.push(...xboxGames);
      } else {
        // Fallback: If the path itself might be a game folder or contains games directly
        // This handles cases where C:\XboxGames is the path but structure is different
        console.log(`[XboxService] No WindowsApps or XboxGames subfolder found, scanning path directly`);
        const directGames = this.scanXboxGames(xboxPath);
        games.push(...directGames);
      }
    }

    console.log(`[XboxService] Total Xbox games found: ${games.length}`);
    return games;
  }
}
