import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import axios from 'axios';

export interface SteamGame {
  appId: string;
  name: string;
  installDir: string;
  libraryPath: string;
  stateFlags?: number;
  isFullyInstalled?: boolean;
}

// Steam StateFlags enum
enum SteamStateFlag {
  StateInvalid = 0,
  StateUninstalled = 1 << 0,         // 1
  StateUpdateRequired = 1 << 1,      // 2
  StateFullyInstalled = 1 << 2,      // 4
  StateEncrypted = 1 << 3,           // 8
  StateLocked = 1 << 4,              // 16
  StateFilesMissing = 1 << 5,        // 32
  StateAppRunning = 1 << 6,          // 64
  StateFilesCorrupt = 1 << 7,        // 128
  StateUpdateRunning = 1 << 8,       // 256
  StateUpdatePaused = 1 << 9,        // 512
  StateUpdateStarted = 1 << 10,      // 1024
  StateUninstalling = 1 << 11,       // 2048
  StateBackupRunning = 1 << 12,      // 4096
  StateDownloading = 1 << 20,        // 1048576
}

export class SteamService {
  private customSteamPath: string | null = null;

  // Known non-game Steam apps to skip (redistributables, tools, etc.)
  private readonly EXCLUDED_STEAM_APPIDS = new Set([
    '228980', // Steamworks Common Redistributables
    '1070560', // Steam Linux Runtime
    '1391110', // Steam Linux Runtime - Soldier
    '1493710', // Steam Linux Runtime - Sniper
  ]);

  constructor() {
    // Don't set default path in constructor - let it be set via setSteamPath
  }

  /**
   * Set a custom Steam installation path
   */
  setSteamPath(path: string): void {
    if (!existsSync(path)) {
      throw new Error(`Steam path does not exist: ${path}`);
    }
    this.customSteamPath = path;
  }

  /**
   * Get the Steam installation path (custom or default)
   */
  getSteamPath(): string {
    if (this.customSteamPath) {
      return this.customSteamPath;
    }
    return this.getDefaultSteamPath();
  }

  /**
   * Get the default Steam installation path on Windows
   */
  private getDefaultSteamPath(): string {
    if (platform() !== 'win32') {
      throw new Error('Steam scanning is currently only supported on Windows');
    }

    const defaultPath = 'C:\\Program Files (x86)\\Steam';
    const altPath = 'C:\\Program Files\\Steam';

    if (existsSync(defaultPath)) {
      return defaultPath;
    }
    if (existsSync(altPath)) {
      return altPath;
    }

    throw new Error('Steam installation not found in default locations');
  }

  /**
   * Parse a VDF (Valve Data Format) file
   * VDF files use a simple text format with key-value pairs
   * Handles both tabs and spaces, and different quote styles
   */
  private parseVDF(content: string): any {
    const result: any = {};
    const lines = content.split('\n');
    const stack: any[] = [result];
    const keyStack: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) continue;

      // Match opening brace with key: "key" { or "key"\t{
      const openMatch = trimmed.match(/^"([^"]+)"\s*\{/);
      if (openMatch) {
        const key = openMatch[1];
        const current = stack[stack.length - 1];
        if (!current[key]) {
          current[key] = {};
        }
        stack.push(current[key]);
        keyStack.push(key);
        continue;
      }

      // Match closing brace
      if (trimmed === '}' || trimmed.startsWith('}')) {
        if (stack.length > 1) {
          stack.pop();
          keyStack.pop();
        }
        continue;
      }

      // Match key-value pair - handles tabs and spaces
      // Pattern: "key" "value" or "key"\t"value" or "key"\t\t"value"
      // Also handle values that might span multiple lines or have special characters
      const kvMatch = trimmed.match(/^"([^"]+)"\s+"([^"]*)"$/);
      if (kvMatch) {
        const [, key, value] = kvMatch;
        const current = stack[stack.length - 1];
        current[key] = value;
        continue;
      }

      // Try to match key-value with escaped quotes or special characters
      // Some ACF files might have values with escaped quotes or other characters
      const kvMatch2 = trimmed.match(/^"([^"]+)"\s+"(.+)"$/);
      if (kvMatch2) {
        const [, key, value] = kvMatch2;
        const current = stack[stack.length - 1];
        // Remove surrounding quotes from value if present
        current[key] = value.replace(/^"|"$/g, '');
      }
    }

    return result;
  }

  /**
   * Read and parse libraryfolders.vdf to find all Steam library locations
   */
  private getLibraryFolders(): string[] {
    const steamPath = this.getSteamPath();
    const libraryFoldersPath = join(steamPath, 'steamapps', 'libraryfolders.vdf');

    const libraries: string[] = [steamPath]; // Always include main Steam path

    if (!existsSync(libraryFoldersPath)) {
      console.warn(`libraryfolders.vdf not found at ${libraryFoldersPath}, using default Steam path only`);
      console.log(`Will scan: ${steamPath}`);
      return libraries;
    }

    try {
      const content = readFileSync(libraryFoldersPath, 'utf-8');
      const parsed = this.parseVDF(content);

      // libraryfolders.vdf structure can be:
      // libraryfolders { "0" { "path" "..." } "1" { "path" "..." } }
      // or in newer versions: libraryfolders { "contentstatsid" "..." "0" { "path" "..." } }
      if (parsed.libraryfolders) {
        const folders = parsed.libraryfolders;
        for (const key in folders) {
          // Skip non-numeric keys and special keys
          if (key !== 'TimeNextStatsReport' && key !== 'contentstatsid' && folders[key]?.path) {
            const libraryPath = folders[key].path.replace(/\\\\/g, '\\').replace(/\//g, '\\');
            if (existsSync(libraryPath) && !libraries.includes(libraryPath)) {
              libraries.push(libraryPath);
              console.log(`Found additional Steam library: ${libraryPath}`);
            }
          }
        }
      }

      console.log(`Total Steam libraries to scan: ${libraries.length}`);
      return libraries;
    } catch (error) {
      console.error('Error reading libraryfolders.vdf:', error);
      console.log(`Falling back to default Steam path: ${steamPath}`);
      return libraries;
    }
  }

  /**
   * Parse an ACF (App Cache File) manifest to extract game information
   */
  private parseACF(content: string): { appId: string; name: string; installDir: string; stateFlags: number; isFullyInstalled: boolean } | null {
    try {
      const parsed = this.parseVDF(content);

      // ACF files can have AppState or appstate at the root level
      const appState = parsed.AppState || parsed.appstate || parsed;

      if (!appState) {
        console.warn('No AppState found in ACF file');
        return null;
      }

      // Try various case variations for the fields
      const appId = appState.appid || appState.AppID || appState.appID || '';
      const name = appState.name || appState.Name || appState.NAME || '';
      const installDir = appState.installdir || appState.InstallDir || appState.INSTALLDIR || '';
      const stateFlags = appState.StateFlags || appState.stateflags || '';

      if (!appId) {
        console.warn('No appid found in ACF file');
        return null;
      }

      // Some ACF files might not have a name field, skip those (they're likely DLC or other content)
      if (!name) {
        console.warn(`ACF file has appid ${appId} but no name field`);
        return null;
      }

      // Parse StateFlags to check if game is fully installed
      const stateFlagsNum = stateFlags ? parseInt(String(stateFlags), 10) : 0;
      const isFullyInstalled = (stateFlagsNum & SteamStateFlag.StateFullyInstalled) !== 0;
      const hasIssues = (stateFlagsNum & (SteamStateFlag.StateUpdateRequired |
        SteamStateFlag.StateFilesMissing |
        SteamStateFlag.StateFilesCorrupt |
        SteamStateFlag.StateUninstalling |
        SteamStateFlag.StateDownloading)) !== 0;

      // Skip games that aren't fully installed or have issues
      if (!isFullyInstalled || hasIssues) {
        console.warn(`Skipping game ${name} (${appId}) - not fully installed (StateFlags: ${stateFlagsNum})`);
        return null;
      }

      return {
        appId: String(appId),
        name: String(name),
        installDir: installDir ? String(installDir) : name,
        stateFlags: stateFlagsNum,
        isFullyInstalled: isFullyInstalled,
      };
    } catch (error) {
      console.error('Error parsing ACF file:', error);
      return null;
    }
  }

  /**
   * Scan a single Steam library folder for installed games
   */
  private scanLibraryFolder(libraryPath: string): SteamGame[] {
    const steamappsPath = join(libraryPath, 'steamapps');

    if (!existsSync(steamappsPath)) {
      console.warn(`Steamapps folder not found: ${steamappsPath}`);
      return [];
    }

    const games: SteamGame[] = [];

    try {
      const files = readdirSync(steamappsPath);
      const acfFiles = files.filter(file => file.endsWith('.acf'));

      console.log(`Scanning ${steamappsPath}`);
      console.log(`Total files in steamapps: ${files.length}`);
      console.log(`Found ${acfFiles.length} ACF files`);

      if (acfFiles.length === 0) {
        console.warn(`No ACF files found in ${steamappsPath}`);
        console.log(`Files found: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
      }

      for (const acfFile of acfFiles) {
        const acfPath = join(steamappsPath, acfFile);

        try {
          const content = readFileSync(acfPath, 'utf-8');

          // Debug: log first few lines of problematic files
          if (content.length < 100) {
            console.warn(`ACF file ${acfFile} is very small (${content.length} bytes)`);
          }

          const gameInfo = this.parseACF(content);

          if (gameInfo) {
            // Skip excluded app IDs (redistributables, tools, etc.)
            if (this.EXCLUDED_STEAM_APPIDS.has(gameInfo.appId)) {
              console.log(`⊘ Skipped (excluded): ${gameInfo.name} (AppID: ${gameInfo.appId})`);
              continue;
            }

            games.push({
              appId: gameInfo.appId,
              name: gameInfo.name,
              installDir: gameInfo.installDir,
              libraryPath: libraryPath,
              stateFlags: gameInfo.stateFlags,
              isFullyInstalled: gameInfo.isFullyInstalled,
            });
            console.log(`✓ Parsed: ${gameInfo.name} (AppID: ${gameInfo.appId})`);
          } else {
            // Try to extract appid from filename as fallback
            const appIdMatch = acfFile.match(/appmanifest_(\d+)\.acf/);
            if (appIdMatch) {
              const appId = appIdMatch[1];
              const parsed = this.parseVDF(content);
              const appState = parsed.AppState || parsed.appstate || parsed;
              const name = appState?.name || appState?.Name || `Steam Game ${appId}`;
              // Skip excluded app IDs in fallback path too (redistributables, tools, etc.)
              if (this.EXCLUDED_STEAM_APPIDS.has(appId)) {
                console.log(`⊘ Skipped (excluded): ${name} (AppID: ${appId})`);
                continue;
              }

              games.push({
                appId: appId,
                name: String(name),
                installDir: appState?.installdir || appState?.InstallDir || name,
                libraryPath: libraryPath,
              });
              console.log(`✓ Parsed (fallback): ${name} (AppID: ${appId})`);
            } else {
              console.warn(`✗ Failed to parse ACF file: ${acfFile}`);
            }
          }
        } catch (error) {
          console.error(`✗ Error reading ACF file ${acfFile}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error scanning library folder ${libraryPath}:`, error);
    }

    return games;
  }

  /**
   * Scan all Steam libraries for installed games
   */
  public scanSteamGames(): SteamGame[] {
    try {
      const steamPath = this.getSteamPath();
      console.log(`Scanning Steam games from: ${steamPath}`);

      const libraries = this.getLibraryFolders();
      console.log(`Found ${libraries.length} Steam library folder(s)`);

      const allGames: SteamGame[] = [];

      for (const library of libraries) {
        console.log(`Scanning library: ${library}`);
        const games = this.scanLibraryFolder(library);
        console.log(`Found ${games.length} games in ${library}`);
        allGames.push(...games);
      }

      // Remove duplicates (same appId might appear in multiple libraries)
      const uniqueGames = Array.from(
        new Map(allGames.map(game => [game.appId, game])).values()
      );

      console.log(`Total unique games found: ${uniqueGames.length}`);
      return uniqueGames.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error scanning Steam games:', error);
      throw error; // Re-throw to let caller handle it
    }
  }

  /**
   * Fetch playtime data for Steam games from Steam Web API or Community API
   * @param steamId - Steam ID of the user
   * @param apiKey - Optional Steam Web API key (if not provided, uses Community API)
   * @returns Map of appId to playtime in minutes
   */
  async fetchPlaytimeData(steamId: string, apiKey?: string): Promise<Map<string, number>> {
    const playtimeMap = new Map<string, number>();

    try {
      // Try Steam Web API first if API key is provided
      if (apiKey) {
        try {
          const apiUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=true`;
          const response = await axios.get(apiUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (response.data?.response?.games) {
            for (const game of response.data.response.games) {
              const appId = String(game.appid);
              const playtimeMinutes = game.playtime_forever || 0;
              playtimeMap.set(appId, playtimeMinutes);
            }
            console.log(`[SteamService] Fetched playtime for ${playtimeMap.size} games via Steam Web API`);
            return playtimeMap;
          }
        } catch (apiError) {
          console.warn('[SteamService] Steam Web API failed, falling back to Community API:', apiError);
        }
      }

      // Fallback to Steam Community API (no key required, but less reliable)
      try {
        const communityUrl = `https://steamcommunity.com/profiles/${steamId}/games/?tab=all&xml=1`;
        const response = await axios.get(communityUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        // Parse XML response
        const xmlData = response.data;

        // Extract game data from XML
        // Format: <game><appID>123456</appID><name>Game Name</name><hoursOnRecord>12.5</hoursOnRecord>...</game>
        // Also handle cases where hoursOnRecord might be missing (game not played)
        const gameMatches = Array.from(xmlData.matchAll(/<game>[\s\S]*?<\/game>/g)) as RegExpMatchArray[];

        for (const gameMatch of gameMatches) {
          const gameXml = gameMatch[0] as string;
          const appIdMatch = gameXml.match(/<appID>(\d+)<\/appID>/);

          if (appIdMatch) {
            const appId = appIdMatch[1];
            // Try to find hoursOnRecord (may not exist if game hasn't been played)
            const hoursMatch = gameXml.match(/<hoursOnRecord>([\d.]+)<\/hoursOnRecord>/);

            if (hoursMatch) {
              const hours = parseFloat(hoursMatch[1]);
              const minutes = Math.round(hours * 60);
              playtimeMap.set(appId, minutes);
            } else {
              // Game exists but has no playtime (0 minutes)
              playtimeMap.set(appId, 0);
            }
          }
        }

        console.log(`[SteamService] Fetched playtime for ${playtimeMap.size} games via Steam Community API`);
      } catch (communityError) {
        console.error('[SteamService] Failed to fetch playtime from Steam Community API:', communityError);
        // Check if it's a profile privacy issue
        if (axios.isAxiosError(communityError) && communityError.response?.status === 403) {
          throw new Error('Steam profile is private. Please set your Steam profile to public to sync playtime.');
        }
        throw new Error('Failed to fetch playtime data from Steam');
      }
    } catch (error) {
      console.error('[SteamService] Error fetching playtime data:', error);
      throw error;
    }

    return playtimeMap;
  }

  /**
   * Search for games on Steam Store
   * @param query - Search term
   * @returns Array of matching games with basic info
   */
  async searchGames(query: string): Promise<Array<{ appId: string; name: string; tinyImage: string }>> {
    try {
      const response = await axios.get(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`, {
        timeout: 10000
      });

      if (response.data && response.data.items) {
        return response.data.items.map((item: any) => ({
          appId: String(item.id),
          name: item.name,
          tinyImage: item.tiny_image
        }));
      }
      return [];
    } catch (error) {
      console.error(`[SteamService] Error searching for "${query}":`, error);
      return [];
    }
  }

  /**
   * Get game details from Steam Store API
   * @param appId - Steam App ID
   */
  async getGameDetails(appId: string): Promise<{ name: string; description: string; developers: string[]; publishers: string[] } | null> {
    try {
      const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`, {
        timeout: 10000
      });

      if (response.data && response.data[appId] && response.data[appId].success) {
        const data = response.data[appId].data;
        return {
          name: data.name,
          description: data.short_description,
          developers: data.developers || [],
          publishers: data.publishers || []
        };
      }
      return null;
    } catch (error) {
      console.error(`[SteamService] Error fetching details for app ${appId}:`, error);
      return null;
    }
  }
}
