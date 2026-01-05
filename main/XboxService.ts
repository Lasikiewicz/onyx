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
   */
  private scanXboxGames(xboxGamesPath: string): XboxGame[] {
    const games: XboxGame[] = [];
    
    if (!existsSync(xboxGamesPath)) {
      console.warn(`XboxGames folder not found: ${xboxGamesPath}`);
      return games;
    }

    try {
      const entries = readdirSync(xboxGamesPath);
      
      for (const entry of entries) {
        const fullPath = join(xboxGamesPath, entry);
        
        try {
          const stats = statSync(fullPath);
          if (stats.isDirectory()) {
            // Look for .exe files in the game folder
            const exeFiles = this.findExecutables(fullPath);
            
            // Filter out helper executables
            const gameExes = exeFiles.filter(exe => {
              const fileName = exe.toLowerCase();
              return !fileName.includes('gamelaunchhelper') &&
                     !fileName.includes('bootstrapper') &&
                     !fileName.endsWith('gamelaunchhelper.exe') &&
                     !fileName.endsWith('bootstrapper.exe');
            });
            
            if (gameExes.length > 0) {
              // Use the first executable found (usually the main game exe)
              // Prefer executables in the root or Content folder, not in subfolders
              const mainExe = gameExes.find(exe => {
                const relativePath = exe.replace(fullPath, '').toLowerCase();
                return !relativePath.includes('content') || relativePath.includes('content\\') && !relativePath.includes('gamelaunchhelper');
              }) || gameExes[0];
              
              games.push({
                id: `xbox-pc-${entry}`,
                name: entry, // Use folder name as game name
                installPath: mainExe,
                type: 'pc',
              });
              console.log(`✓ Found Xbox PC game: ${entry} (${mainExe})`);
            }
          }
        } catch (err) {
          // Skip entries we can't access
          continue;
        }
      }
    } catch (error) {
      console.error(`Error scanning XboxGames: ${error}`);
    }

    return games;
  }

  /**
   * Find executable files in a directory (recursive, max depth 3)
   */
  private findExecutables(dirPath: string, depth: number = 0, maxDepth: number = 3): string[] {
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
            
            // Check patterns
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
            // Recursively search subdirectories
            const subExes = this.findExecutables(fullPath, depth + 1, maxDepth);
            executables.push(...subExes);
          }
        } catch (err) {
          // Skip entries we can't access
          continue;
        }
      }
    } catch (err) {
      // Skip directories we can't access
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

    const games: XboxGame[] = [];
    
    // Check if path is WindowsApps or XboxGames
    if (xboxPath.includes('WindowsApps')) {
      const winAppsGames = this.scanWindowsApps(xboxPath);
      games.push(...winAppsGames);
    } else if (xboxPath.includes('XboxGames')) {
      const xboxGames = this.scanXboxGames(xboxPath);
      games.push(...xboxGames);
    } else {
      // Try both locations
      const winAppsPath = join(xboxPath, 'WindowsApps');
      const xboxGamesPath = join(xboxPath, 'XboxGames');
      
      if (existsSync(winAppsPath)) {
        const winAppsGames = this.scanWindowsApps(winAppsPath);
        games.push(...winAppsGames);
      }
      
      if (existsSync(xboxGamesPath)) {
        const xboxGames = this.scanXboxGames(xboxGamesPath);
        games.push(...xboxGames);
      }
    }

    return games;
  }
}
