import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import { spawnSync } from 'node:child_process';
import { GameFilteringService } from './GameFilteringService.js';

export interface XboxGame {
  id: string;
  name: string;
  installPath: string;
  type: 'uwp' | 'pc';
  packageFamilyName?: string;
  appId?: string;
  appUserModelId?: string;
  launchUri?: string;
}

export class XboxService {
  private gameFilteringService: GameFilteringService;

  constructor() {
    this.gameFilteringService = new GameFilteringService();
  }

  /**
   * Scan WindowsApps with GamingServices registry validation
   * ONLY returns UWP games that Microsoft officially registered as game installations
   * This is the most reliable way to filter games from utilities in UWP
   */
  private scanWindowsAppsWithGamingServicesValidation(winAppsPath: string): XboxGame[] {
    const games: XboxGame[] = [];
    
    if (!existsSync(winAppsPath)) {
      console.warn(`WindowsApps folder not found: ${winAppsPath}`);
      return games;
    }

    // Get the authoritative list from GamingServices registry
    const gamingServicePackages = this.getGamingServicesPackageFamilies();
    
    if (gamingServicePackages.size === 0) {
      console.warn(`[XboxService] No games found in GamingServices registry - cannot validate UWP games`);
      return games;
    }

    console.log(`[XboxService] Found ${gamingServicePackages.size} games in GamingServices registry`);

    try {
      const entries = readdirSync(winAppsPath);
      
      for (const entry of entries) {
        const pfnLower = entry.toLowerCase();
        
        // ONLY include if in GamingServices registry
        if (!gamingServicePackages.has(pfnLower)) {
          continue;
        }

        const fullPath = join(winAppsPath, entry);
        
        try {
          const stats = statSync(fullPath);
          if (stats.isDirectory()) {
            try {
              const subEntries = readdirSync(fullPath);
              const hasExe = subEntries.some(e => e.toLowerCase().endsWith('.exe'));
              
              if (hasExe) {
                const exeFile = subEntries.find(e => 
                  e.toLowerCase().endsWith('.exe') && 
                  !e.toLowerCase().includes('installer') &&
                  !e.toLowerCase().includes('setup')
                );
                
                if (exeFile) {
                  const name = this.extractAppName(entry);
                  const idFragment = this.sanitizeIdSegment(entry);

                  games.push({
                    id: `xbox-uwp-${idFragment}`,
                    name: name,
                    installPath: fullPath,
                    type: 'uwp',
                    packageFamilyName: entry,
                    appUserModelId: '',
                    launchUri: ''
                  });
                  console.log(`✓ Found validated UWP game: ${name}`);
                }
              }
            } catch (err) {
              continue;
            }
          }
        } catch (err) {
          continue;
        }
      }
    } catch (error) {
      console.error(`Error scanning WindowsApps: ${error}`);
    }

    return games;
  }

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

          // Skip DLC packs, pre-order packs, game stubs, trackers, and launch helpers
          if (dirName.includes('dlc') ||
              dirName.includes('game pass') ||
              dirName.includes('pre order') ||
              dirName.includes('pre-order') ||
              dirName.includes('game stub') ||
              dirName.includes('tracker') ||
              dirName.includes('launcher')) {
            console.log(`[XboxService] Skipping DLC/pack/stub folder: ${entry}`);
            continue;
          }

          console.log(`[XboxService] Scanning game folder: ${entry}`);
          
          // Deep scan for executables (up to 20 levels deep)
          const exeFiles = this.findExecutables(fullPath, 0, 20);
          console.log(`[XboxService] Found ${exeFiles.length} executables in ${entry}`);
          
          // Filter out helper executables BUT KEEP gamelaunchhelper (we need it for launching)
          const gameExes = exeFiles.filter(exe => {
            const fileName = exe.toLowerCase();
            const fileNameOnly = fileName.split(/[/\\]/).pop() || '';
            // Keep gamelaunchhelper.exe - it's the Xbox game launcher
            if (fileNameOnly === 'gamelaunchhelper.exe') {
              return true;
            }
            return !fileNameOnly.includes('bootstrapper') &&
                   !fileNameOnly.includes('installer') &&
                   !fileNameOnly.includes('setup') &&
                   !fileNameOnly.includes('uninstall') &&
                   !fileNameOnly.includes('updater') &&
                   fileNameOnly !== 'crashreportclient.exe' &&
                   fileNameOnly !== 'battlenet.overlay.runtime.exe' &&
                   fileNameOnly !== 'crashpad_handler.exe' &&
                   fileNameOnly !== 'embark-crash-helper.exe' &&
                   fileNameOnly !== 'blizzardbrowser.exe' &&
                   fileNameOnly !== 'blizzarderror.exe';
          });
          
          console.log(`[XboxService] Filtered to ${gameExes.length} game executables in ${entry}`);
          
          if (gameExes.length > 0) {
            // Verify install path exists before adding
            if (!existsSync(fullPath)) {
              console.warn(`[XboxService] Skipping ${entry} - directory no longer exists`);
              continue;
            }
            
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
            
            // For Xbox PC games, try to find gamelaunchhelper.exe for launching
            // This is the proper launcher for Game Pass games
            let launcherExe = mainExe;
            console.log(`[XboxService] Searching for gamelaunchhelper in ${gameExes.length} executables:`, gameExes.map(e => e.split(/[/\\]/).pop()));
            const helperExe = gameExes.find(exe => 
              exe.toLowerCase().includes('gamelaunchhelper.exe')
            );
            console.log(`[XboxService] Helper search result:`, helperExe ? 'FOUND' : 'NOT FOUND');
            if (helperExe) {
              launcherExe = helperExe;
              console.log(`[XboxService] ✓ Using gamelaunchhelper for ${entry}: ${helperExe}`);
            } else {
              console.log(`[XboxService] ⚠ Gamelaunchhelper not found for ${entry}, using main exe: ${mainExe}`);
            }
            
            // Apply filtering before adding
            const gameName = this.mapToNewestGameName(entry);
            
            // Try to extract package info for proper launching
            const packageInfo = this.extractPackageInfo(fullPath);
            
            if (packageInfo) {
              // We have package info - this is a proper UWP/MSIX game
              games.push({
                id: `xbox-pc-${entry}`,
                name: gameName,
                installPath: launcherExe,  // Use gamelaunchhelper if available, otherwise game exe
                type: 'pc',
                packageFamilyName: packageInfo.packageFamilyName,
                appId: packageInfo.appId,
                appUserModelId: packageInfo.appUserModelId,
                launchUri: packageInfo.launchUri,
              });
              console.log(`[XboxService] ✓ Found Xbox PC game with package info: ${gameName} (${packageInfo.appUserModelId})`);
            } else {
              // No package info - fallback to exe launch
              games.push({
                id: `xbox-pc-${entry}`,
                name: gameName,
                installPath: launcherExe,  // Use gamelaunchhelper if available, otherwise game exe
                type: 'pc',
              });
              console.log(`[XboxService] ✓ Found Xbox PC game (no package info): ${gameName} (${launcherExe})`);
            }
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
   * Extract package information from AppxManifest.xml for PC Game Pass games
   * Returns: { packageFamilyName, appId, appUserModelId, launchUri } or null if not found
   */
  private extractPackageInfo(gameFolderPath: string): { packageFamilyName: string; appId: string; appUserModelId: string; launchUri: string } | null {
    try {
      // Search for AppxManifest.xml in the game folder
      const manifestFiles: string[] = [];
      const searchForManifest = (dirPath: string, depth: number = 0, maxDepth: number = 10): void => {
        if (depth > maxDepth) return;
        try {
          const entries = readdirSync(dirPath);
          for (const entry of entries) {
            const fullPath = join(dirPath, entry);
            try {
              const stats = statSync(fullPath);
              if (stats.isFile() && entry.toLowerCase() === 'appxmanifest.xml') {
                manifestFiles.push(fullPath);
              } else if (stats.isDirectory() && depth < maxDepth) {
                searchForManifest(fullPath, depth + 1, maxDepth);
              }
            } catch (err) {
              continue;
            }
          }
        } catch (err) {
          return;
        }
      };

      searchForManifest(gameFolderPath);
      
      if (manifestFiles.length === 0) {
        return null;
      }

      // Read and parse the manifest XML
      const manifestPath = manifestFiles[0];
      const manifestContent = readFileSync(manifestPath, 'utf-8');
      
      // Extract Identity Name (Package Name)
      const nameMatch = manifestContent.match(/<Identity[^>]+Name="([^"]+)"/);
      if (!nameMatch) return null;
      const packageName = nameMatch[1];
      
      // Extract Publisher hash from Publisher attribute
      // Format: Publisher="CN=<HASH>" -> extract the hash part
      const publisherMatch = manifestContent.match(/<Identity[^>]+Publisher="CN=([^"]+)"/);
      if (!publisherMatch) return null;
      
      // Now get the actual PackageFamilyName from Get-AppxPackage
      // We can't compute the publisher hash ourselves, so we query the system
      const result = spawnSync('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Get-AppxPackage | Where-Object { $_.Name -eq "${packageName}" } | Select-Object -First 1 PackageFamilyName | ConvertTo-Json`
      ], {
        encoding: 'utf-8',
        windowsHide: true,
      });

      if (result.status !== 0 || !result.stdout) {
        console.warn(`[XboxService] Failed to get PackageFamilyName for ${packageName}`);
        return null;
      }

      const parsed = JSON.parse(result.stdout.trim());
      const packageFamilyName = parsed?.PackageFamilyName;
      if (!packageFamilyName) {
        console.warn(`[XboxService] No PackageFamilyName found for ${packageName}`);
        return null;
      }

      // Extract Application ID from <Application Id="...">
      const appIdMatch = manifestContent.match(/<Application[^>]+Id="([^"]+)"/);
      const appId = appIdMatch ? appIdMatch[1] : 'App';
      
      // Construct AppUserModelId: PackageFamilyName!AppId
      const appUserModelId = `${packageFamilyName}!${appId}`;
      const launchUri = `shell:AppsFolder\\${appUserModelId}`;

      console.log(`[XboxService] ✓ Extracted package info: ${appUserModelId}`);
      return { packageFamilyName, appId, appUserModelId, launchUri };
    } catch (error) {
      console.warn(`[XboxService] Failed to extract package info from ${gameFolderPath}: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Find executable files in a directory (recursive, deep scan with high max depth)
   */
  private findExecutables(dirPath: string, depth: number = 0, maxDepth: number = 20): string[] {
    const executables: string[] = [];
    
    if (depth > maxDepth) return executables;
    
    try {
      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        
        try {
          const stats = statSync(fullPath);
          
          if (stats.isFile() && entry.toLowerCase().endsWith('.exe')) {
            const lowerName = entry.toLowerCase();
            
            // KEEP gamelaunchhelper.exe - it's the Xbox Game Pass launcher we need!
            if (lowerName === 'gamelaunchhelper.exe') {
              executables.push(fullPath);
              continue;
            }
            
            // Filter out other non-game executables
            if (!lowerName.includes('installer') &&
                !lowerName.includes('setup') &&
                !lowerName.includes('uninstall') &&
                !lowerName.includes('updater') &&
                !lowerName.includes('bootstrapper')) {
              executables.push(fullPath);
            }
          } else if (stats.isDirectory() && depth < maxDepth) {
            // Skip known system/cache folders and WinGDK folders to speed up search
            const dirName = entry.toLowerCase();
            if (dirName === '$recycle.bin' || 
                dirName === 'system volume information' ||
                dirName === '.git' ||
                dirName === '__pycache__' ||
                dirName === 'node_modules' ||
                dirName.includes('wingdk')) {
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
   * Map generic game names to their newest versions
   * This ensures that generic folder names like "Call of Duty" are assumed to be the latest game
   */
  private mapToNewestGameName(folderName: string): string {
    const lowerName = folderName.toLowerCase();
    
    // Call of Duty: Always assume the newest game (Black Ops 7 as of 2026)
    if (lowerName === 'call of duty' || lowerName === 'cod') {
      return 'Call of Duty: Black Ops 7';
    }
    
    // Can add more mappings here as new games are released
    // Example:
    // if (lowerName === 'battlefield') {
    //   return 'Battlefield 2043';
    // }
    
    return folderName;
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
   * Build a stable ID fragment from a package family name or AppUserModelId
   */
  private sanitizeIdSegment(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9!_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '')
      || 'unknown';
  }

  /**
   * Heuristic filter to drop obvious non-game UWP apps (music, system, utilities)
   * Uses hybrid approach: publisher whitelist + system app detection + keyword filtering + size heuristics
   */
  private isLikelyNonGame(app: { Name?: string; PackageFamilyName?: string; AppUserModelId?: string; InstallLocation?: string }): boolean {
    const name = (app.Name || '').toLowerCase();
    const pfn = (app.PackageFamilyName || '').toLowerCase();
    const aumid = (app.AppUserModelId || '').toLowerCase();
    const installPath = app.InstallLocation || '';

    // Must have an install location inside WindowsApps; otherwise ignore
    if (!installPath || !installPath.toLowerCase().includes('windowsapps')) {
      return true;
    }

    // ===== XBOX-SPECIFIC FILTERING LOGIC =====

    // STEP 1: Check known game publishers (WHITELIST)
    const knownPublishers = [
      'ea', 'activision', 'ubisoft', '2k', 'square', 'rockstar', 'bethesda',
      'capcom', 'bandai', 'konami', 'sega', 'disney', 'warner', 'paramount',
      'sony', 'microsoft.game', 'xboxgamestudio', 'obsidian', 'ninja', 'rare',
      'inxile', 'playground', 'coalition', 'remedy', 'compulsion', 'sloclap',
      'astragon', 'innerspace', 'fishlabs', 'graphsimulations', 'larian'
    ];

    const publisherPrefix = pfn.split('.')[0].toLowerCase();
    if (publisherPrefix && knownPublishers.some(pub => pub.startsWith(publisherPrefix) || publisherPrefix.includes(pub.split('.')[0]))) {
      return false; // ✅ Known game publisher
    }

    // STEP 2: System/Microsoft apps (definite excludes)
    const systemPrefixes = [
      'microsoft.windows', 'microsoft.desktopappinstaller', 'microsoft.net',
      'microsoft.vclibs', 'microsoft.ui.xaml', 'microsoft.advertising',
      'microsoft.services.store', 'microsoft.store', 'microsoft.windowsstore',
      'microsoft.gethelp', 'microsoft.getstarted', 'microsoft.edge', 'microsoft.bing',
      'microsoft.office', 'microsoft.skypeapp', 'microsoft.msn', 'microsoft.zune',
      'microsoft.people', 'microsoft.photos', 'microsoft.camera', 'microsoft.messaging',
      'microsoft.weather', 'microsoft.soundrecorder', 'microsoft.3dviewer',
      'microsoft.stickynotes', 'microsoft.officehub', 'microsoft.windowscommunicationsapps',
      'microsoft.xboxapp', 'microsoft.xbox.tcui', 'microsoft.xboxgameoverlay',
      'microsoft.xboxidentityprovider', 'microsoft.gamingapp', 'microsoft.gamingservices',
      // Additional Microsoft utilities
      'microsoft.commandpalette', 'microsoft.commandpal', 'microsoft.copilot',
      'microsoft.help', 'microsoft.news', 'microsoft.paint', 'microsoft.defender',
      'microsoft.teams', 'microsoft.todo', 'microsoft.outline', 'microsoft.snip',
      'microsoft.gethelp', 'microsoft.getsupport', 'microsoft.devicemonitor',
      'microsoft.mixedreality', 'microsoft.xbox', 'microsoft.input'
    ];

    if (systemPrefixes.some(prefix => pfn.startsWith(prefix))) {
      return true; // ❌ System app
    }

    // STEP 3: OEM utility brands (Apple, Google, Lenovo, Dell, HP, etc.)
    const oemBrands = ['apple', 'google', 'lenovo', 'dell', 'hp', 'asus', 'msi', 'razer', 'corsair'];
    if (oemBrands.some(brand => pfn.startsWith(brand) || name.startsWith(brand))) {
      return true;
    }

    // STEP 4: Size heuristic - count files
    try {
      const files = readdirSync(installPath, { recursive: true });
      const fileCount = files.length;
      // Utilities < 20 files; Games > 100 files
      if (fileCount < 20) {
        return true; // Small folder = likely utility
      }
    } catch (err) {
      // Can't read folder, continue with keyword check
    }

    // STEP 5: Keyword-based exclusions (most comprehensive list)
    const nonGameKeywords = [
      // Media/Entertainment
      'music', 'video', 'tv', 'movie', 'media', 'photo', 'camera', 'photoeditor',
      'gallery', 'clipchamp', 'paint', 'editor', 'viewer', 'player',
      // System/Tools  
      'settings', 'config', 'update', 'updater', 'installer', 'runtime', 'driver',
      'service', 'services', 'keyboard', 'language', 'voice', 'assistant', 'copilot',
      'search', 'mail', 'outlook', 'calendar', 'news', 'weather', 'maps', 'clock',
      'calculator', 'store', 'browser', 'edge', 'onedrive', 'onenote', 'teams', 'office',
      'word', 'excel', 'powerpoint', 'access', 'publisher', 'project',
      // Support/Admin
      'support', 'help', 'feedback', 'repair', 'firmware', 'backup', 'sync',
      'family', 'security', 'defender', 'antivirus', 'malware',
      // Hardware/Drivers
      'intel', 'nvidia', 'amd', 'realtek', 'audio', 'driver', 'chipset',
      'graphics', 'network', 'wifi', 'bluetooth',
      // Hardware Manufacturer
      'quick assist', 'whatsapp', 'icloud', 'iphone', 'itunes',
      // Development
      'python', 'idle', 'node', 'npm', 'git', 'compiler', 'debugger', 'ide',
      // Archive/Compression
      'winrar', 'archive', '7-zip', 'zip', 'compress', 'extract',
      // Utilities
      'tool', 'utility', 'helper', 'launcher', 'optimizer', 'cleaner',
      'uninstaller', 'manager', 'monitor', 'monitor', 'converter', 'recorder',
      'codec', 'directx', 'vcredist', 'redist', 'bootstrap', 'bootstrapper',
      'gamelaunchhelper',
      // Communication
      'telegram', 'discord', 'slack', 'zoom', 'skype',
      // Specific cases
      'snipping', 'sticky', 'hdr calibration', 'insider hub', 'game bar',
      'xbox accessory', 'game launcher', 'mixed reality', 'link',
      'power automate', 'phone link'
    ];

    if (nonGameKeywords.some(keyword => name.includes(keyword) || pfn.includes(keyword))) {
      return true;
    }

    // STEP 6: Shell app manifests (no real app)
    if (aumid.endsWith('_cw5n1h2txyewy!app')) {
      return true;
    }

    // Default: assume it's a game
    return false;
  }

  /**
   * Read GamingServices registry to get known game package family names.
   * Strong positive signal that the package is an actual game install.
   */
  private getGamingServicesPackageFamilies(): Set<string> {
    const packages = new Set<string>();

    if (platform() !== 'win32') {
      return packages;
    }

    try {
      const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$roots = @(
  'HKLM:\\SOFTWARE\\Microsoft\\GamingServices\\Games',
  'HKCU:\\SOFTWARE\\Microsoft\\GamingServices\\Games'
)
$results = foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem $root | ForEach-Object {
    $pfn = $_.GetValue('PackageFamilyName')
    if (-not $pfn) { $pfn = $_.GetValue('PackageMoniker') }
    if ($pfn) { $pfn }
  }
}
$results | Sort-Object -Unique | ConvertTo-Json
`.trim();

      const psResult = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
        encoding: 'utf8',
      });

      if (psResult.status !== 0 || psResult.error) {
        return packages;
      }

      const output = psResult.stdout?.trim();
      if (!output) {
        return packages;
      }

      const parsed = JSON.parse(output);
      const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      list.forEach((pfn: string) => {
        if (typeof pfn === 'string' && pfn.length > 0) {
          packages.add(pfn.toLowerCase());
        }
      });
    } catch (err) {
      // Best-effort; ignore errors
    }

    return packages;
  }

  /**
   * Discover UWP / MSIX entries via Start menu (Playnite-style)
   * Uses PowerShell Get-StartApps to retrieve AppUserModelIds that can be launched with shell:AppsFolder.
   */
  private scanUwpStartApps(): XboxGame[] {
    if (platform() !== 'win32') {
      return [];
    }

    try {
      const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$packages = @{}
Get-AppxPackage -PackageTypeFilter Main | ForEach-Object { $packages[$_.PackageFamilyName] = $_ }
$startApps = Get-StartApps
$results = foreach ($app in $startApps) {
  if ($null -eq $app.AppID -or $app.AppID -notmatch '!') { continue }
  $parts = $app.AppID -split '!', 2
  $pfn = $parts[0]
  $appId = $parts[1]
  $pkg = $packages[$pfn]
  if ($null -eq $pkg) { continue }
  if ($pkg.IsFramework -or $pkg.IsResourcePackage) { continue }
  if ($pfn -match '^Microsoft\\.(Windows|XboxApp|Xbox.TCUI|StorePurchaseApp|Store|GamingApp|VCLibs|UI.Xaml)' -or $pfn -match '^Microsoft\\.NET') { continue }
  [PSCustomObject]@{
    Name = $app.Name
    PackageFamilyName = $pfn
    AppId = $appId
    AppUserModelId = $app.AppID
    InstallLocation = $pkg.InstallLocation
  }
}
$results | ConvertTo-Json -Depth 4
`.trim();

      const psResult = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
        encoding: 'utf8',
      });

      if (psResult.error) {
        console.warn(`[XboxService] PowerShell error: ${psResult.error.message}`);
        return [];
      }

      if (psResult.status !== 0) {
        console.warn(`[XboxService] PowerShell exited with code ${psResult.status}: ${psResult.stderr?.toString()}`);
        return [];
      }

      const output = psResult.stdout?.trim();
      if (!output) {
        return [];
      }

      let parsed: any;
      try {
        parsed = JSON.parse(output);
      } catch (err) {
        console.warn('[XboxService] Failed to parse PowerShell JSON output');
        return [];
      }

      const apps = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      if (apps.length === 0) {
        return [];
      }

      // Gather GamingServices PFNs - use as authoritative source
      const gamingServicePackages = this.getGamingServicesPackageFamilies();

      const games: XboxGame[] = [];
      for (const app of apps) {
        if (!app || !app.AppUserModelId || !app.PackageFamilyName) {
          continue;
        }

        // MUST validate against GamingServices registry (only games MS officially registered)
        if (!gamingServicePackages.has(String(app.PackageFamilyName).toLowerCase())) {
          console.log(`⊘ Skipped (not in GamingServices): ${app.Name}`);
          continue;
        }

        const appUserModelId: string = app.AppUserModelId;
        const packageFamilyName: string = app.PackageFamilyName;
        const appId: string = app.AppId || appUserModelId.split('!')[1] || '';
        const launchUri = `shell:AppsFolder\\${appUserModelId}`;
        const idFragment = this.sanitizeIdSegment(appUserModelId);

        games.push({
          id: `xbox-uwp-${idFragment}`,
          name: app.Name || this.extractAppName(packageFamilyName),
          installPath: app.InstallLocation || '',
          type: 'uwp',
          packageFamilyName,
          appId,
          appUserModelId,
          launchUri,
        });
      }

      return games;
    } catch (error) {
      console.error(`[XboxService] Error scanning UWP start apps: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  /**
   * MAIN public scan method - entry point for Xbox game detection
   * Strategy: Prefer C:\XboxGames (definitive PC Game Pass) + UWP validation via GamingServices registry
   */
  public scanGames(xboxPath: string): XboxGame[] {
    if (platform() !== 'win32') {
      throw new Error('Xbox Game Pass scanning is currently only supported on Windows');
    }

    console.log(`[XboxService] Scanning Xbox games from path: ${xboxPath}`);
    const gamesMap = new Map<string, XboxGame>();
    const addGame = (game: XboxGame) => {
      if (!game) return;
      const key = game.appUserModelId || game.id;
      if (!gamesMap.has(key)) {
        gamesMap.set(key, game);
      }
    };

    // STRATEGY: Scan C:\XboxGames first (PC Game Pass - these are DEFINITELY games)
    // This is the authoritative source for installed Game Pass titles
    if (xboxPath.includes('XboxGames')) {
      console.log(`[XboxService] Scanning XboxGames path (PC Game Pass): ${xboxPath}`);
      const xboxGames = this.scanXboxGames(xboxPath);
      xboxGames.forEach(addGame);
      // If we found PC games, return them (don't bother with UWP scanning)
      if (xboxGames.length > 0) {
        const games = Array.from(gamesMap.values());
        console.log(`[XboxService] Found ${games.length} Xbox games (PC Game Pass)`);
        return games;
      }
    }

    // SECONDARY: Scan WindowsApps for UWP games (only if no PC Game Pass games found)
    // For UWP, MUST validate against GamingServices registry (only include games MS officially registered)
    if (xboxPath.includes('WindowsApps')) {
      console.log(`[XboxService] Scanning WindowsApps path (UWP Games)`);
      const winAppsGames = this.scanWindowsAppsWithGamingServicesValidation(xboxPath);
      winAppsGames.forEach(addGame);
    }

    const games = Array.from(gamesMap.values());
    console.log(`[XboxService] Total Xbox games found: ${games.length}`);
    return games;
  }
}
