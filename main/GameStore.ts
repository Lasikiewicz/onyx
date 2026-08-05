import { SteamGame } from './SteamService.js';
import { debugOptimizationLog, isDebugOptimizationEnabled } from './debugOptimizationLog.js';
import { normalizeOnyxLocalUrl, sanitizeGameArtworkUrls, stripTransientUrlSuffix } from './artworkUrlUtils.js';

export interface Game {
  id: string;
  title: string;
  sortingName?: string;
  platform: 'steam' | 'other' | string;
  exePath: string;
  launchArgs?: string;  // Command-line arguments for exe launch
  boxArtUrl: string;
  bannerUrl: string;
  alternativeBannerUrl?: string;
  useAlternativeBackground?: boolean;
  boxArtIsVideo?: boolean;
  bannerIsVideo?: boolean;
  alternativeBannerIsVideo?: boolean;
  logoIsVideo?: boolean;
  heroIsVideo?: boolean;
  iconIsVideo?: boolean;
  logoUrl?: string;
  logoSizePerViewMode?: {
    carousel?: number;
    coverflow?: number;
    grid?: number;
    logo?: number;
    list?: number;
  };
  heroUrl?: string;
  iconUrl?: string;
  screenshots?: string[];
  description?: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  categories?: string[];
  features?: string[];
  tags?: string[];
  releaseDate?: string;
  series?: string;
  ageRating?: string;
  region?: string;
  source?: string;
  completionStatus?: string;
  userScore?: number;
  criticScore?: number;
  communityScore?: number;
  installationDirectory?: string;
  installSize?: number;
  playtime?: number;
  lastPlayed?: string;
  playCount?: number;
  dateAdded?: string;
  favorite?: boolean;
  hidden?: boolean;
  broken?: boolean;
  notes?: string;
  modManagerUrl?: string;
  links?: Array<{ name: string; url: string; hidden?: boolean; iconUrl?: string }>;
  actions?: Array<{ name: string; path: string; arguments?: string; workingDir?: string }>;
  scripts?: Array<{ name: string; script: string }>;
  xboxKind?: 'uwp' | 'pc';
  packageFamilyName?: string;
  appUserModelId?: string;
  launchUri?: string;
  lockedFields?: {
    title?: boolean;
    boxArtUrl?: boolean;
    bannerUrl?: boolean;
    exePath?: boolean;
    [key: string]: boolean | undefined;
  };
}

interface StoreSchema {
  games: Game[];
}

import Store from './electronStoreShim.js';

export class GameStore {
  private store: Store<StoreSchema>;
  private gamesCache: Game[] | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private pendingSaveSince: number | null = null;
  private readonly SAVE_DELAY = 2000;
  /**
   * Upper bound on how long a pending save may be deferred by repeated scheduleSave calls.
   * Without this cap a continuous stream of saves (the image optimization queue saves once
   * per game) resets the debounce forever and nothing ever reaches disk.
   */
  private readonly MAX_SAVE_DELAY = 10000;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'game-library',
      defaults: {
        games: [],
      },
    });
  }

  private async ensureStore(): Promise<Store<StoreSchema>> {
    return this.store;
  }

  /**
   * Get all games from the store
   */
  async getLibrary(): Promise<Game[]> {
    if (this.gamesCache) {
      return [...this.gamesCache];
    }
    const store = await this.ensureStore();
    // Copy: `get` hands back the store's live internal array, and callers mutate the
    // result (e.g. gameHandlers flag updates), which would silently mutate persisted state.
    return [...((store as any).get('games', []) as Game[])];
  }

  /**
   * Schedule a debounced save to disk
   */
  private scheduleSave(games: Game[]): void {
    this.gamesCache = games;

    const now = Date.now();
    if (this.pendingSaveSince === null) {
      this.pendingSaveSince = now;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce bursts, but never defer a pending save beyond MAX_SAVE_DELAY.
    const waited = now - this.pendingSaveSince;
    const delay = Math.max(0, Math.min(this.SAVE_DELAY, this.MAX_SAVE_DELAY - waited));

    this.saveTimeout = setTimeout(() => {
      void this.flush();
    }, delay);
  }

  /**
   * Immediately flush any pending saves to disk
   */
  async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.pendingSaveSince = null;

    if (this.gamesCache) {
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore flush start games=${this.gamesCache.length}`);
      const store = await this.ensureStore();
      const gamesToSave = this.gamesCache;
      this.gamesCache = null; // Clear cache before setting to avoid race conditions
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore flush set games count=${gamesToSave.length}`);
      (store as any).set('games', gamesToSave);
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore flush done`);
      console.log(`[GameStore] Library flushed to disk (${gamesToSave.length} games)`);
    }
  }

  /**
   * Flush any pending debounced save to disk now (e.g. after optimization queue saveGame to avoid one big delayed write).
   */
  async flushPending(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.flush();
  }

  /**
   * Synchronously flush any pending saves to disk. 
   * Only works if the store is already initialized.
   */
  flushSync(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.pendingSaveSince = null;

    if (this.gamesCache && this.store) {
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore flushSync start games=${this.gamesCache.length}`);
      const gamesToSave = this.gamesCache;
      this.gamesCache = null;
      (this.store as any).set('games', gamesToSave);
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore flushSync done`);
      console.log(`[GameStore] Library flushed to disk [SYNC] (${gamesToSave.length} games)`);
    }
  }

  async migratePerGameViewSizeOverrides(): Promise<Record<string, { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number }>> {
    const store = await this.ensureStore();
    const games = await this.getLibrary();

    const overrides: Record<string, { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number }> = {};
    let changed = false;

    const migratedGames = games.map((game) => {
      if (!game.logoSizePerViewMode || typeof game.logoSizePerViewMode !== 'object') {
        return game;
      }

      const hasValues = Object.values(game.logoSizePerViewMode).some((value) => typeof value === 'number');
      if (!hasValues) {
        return game;
      }

      overrides[game.id] = {
        ...(overrides[game.id] || {}),
        ...game.logoSizePerViewMode,
      };

      const { logoSizePerViewMode, ...rest } = game;
      changed = true;
      return rest as Game;
    });

    if (changed) {
      (store as any).set('games', migratedGames);
    }

    return overrides;
  }

  /**
   * Save a single game to the store
   */
  async saveGame(game: Game): Promise<void> {
    if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore saveGame entry gameId=${game.id} title=${game.title?.slice(0, 30) ?? ''}`);
    const store = await this.ensureStore();
    const games = await this.getLibrary();
    const existingIndex = games.findIndex(g => g.id === game.id);

    // Create a deep copy to ensure all properties are saved
    const gameToSave: Game = sanitizeGameArtworkUrls({
      ...game,
      // Preserve favorite property as-is (true, false, or undefined)
      favorite: game.favorite,
      lockedFields: game.lockedFields ? { ...game.lockedFields } : undefined,
      // Explicitly preserve launchArgs so it is never dropped
      launchArgs: game.launchArgs,
    });

    if (existingIndex >= 0) {
      // Update existing game - preserve dateAdded
      games[existingIndex] = {
        ...gameToSave,
        dateAdded: games[existingIndex].dateAdded || gameToSave.dateAdded
      };
      console.log(`Updated game: ${gameToSave.title} (${gameToSave.id})`);
    } else {
      // Add new game - set dateAdded if not already set
      if (!gameToSave.dateAdded) {
        gameToSave.dateAdded = new Date().toISOString();
      }
      games.push(gameToSave);
      console.log(`Added new game: ${gameToSave.title} (${gameToSave.id})`);
    }

    this.scheduleSave(games);
    if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore saveGame scheduled gameId=${game.id} totalGames=${games.length}`);
    console.log(`Total games in memory: ${games.length}`);
  }

  /**
   * Save multiple games to the store, avoiding duplicates
   */
  async saveGames(newGames: Game[]): Promise<void> {
    const store = await this.ensureStore();
    const existingGames = await this.getLibrary();
    const gamesMap = new Map<string, Game>();

    // Add existing games to map
    existingGames.forEach(game => {
      gamesMap.set(game.id, game);
    });

    // Merge new games (new games override existing ones with same id)
    newGames.forEach(game => {
      gamesMap.set(game.id, game);
    });

    this.scheduleSave(Array.from(gamesMap.values()));
  }

  /**
   * Merge Steam games into the store
   * Creates Game objects from SteamGame objects, avoiding duplicates
   * Preserves existing game data including lockedFields
   * @param steamGames - Array of Steam games to merge
   * @param imageCacheService - Optional image cache service for local storage
   * @param shouldCacheImages - Whether to cache images locally (default: false)
   */
  async mergeSteamGames(
    steamGames: SteamGame[],
    imageCacheService?: { cacheImages: (urls: { boxArtUrl?: string; bannerUrl?: string; alternativeBannerUrl?: string; logoUrl?: string; heroUrl?: string; iconUrl?: string; screenshots?: string[] }, gameId: string) => Promise<{ boxArtUrl?: string; bannerUrl?: string; alternativeBannerUrl?: string; logoUrl?: string; heroUrl?: string; iconUrl?: string; screenshots?: string[] }> },
    shouldCacheImages: boolean = false
  ): Promise<void> {
    const store = await this.ensureStore();
    const existingGames = await this.getLibrary();
    const gamesMap = new Map<string, Game>();

    // Add existing games to map
    existingGames.forEach(game => {
      gamesMap.set(game.id, game);
    });

    // Convert SteamGame to Game and merge (using for...of for async operations)
    for (const steamGame of steamGames) {
      const gameId = `steam-${steamGame.appId}`;
      const existingGame = gamesMap.get(gameId);

      // If game exists, preserve lockedFields and only update unlocked fields
      if (existingGame && existingGame.platform === 'steam') {
        const lockedFields = existingGame.lockedFields || {};
        let boxArtUrl = lockedFields.boxArtUrl
          ? existingGame.boxArtUrl
          : `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/header.jpg`;
        let bannerUrl = lockedFields.bannerUrl
          ? existingGame.bannerUrl
          : `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/Library_600x900.jpg`;

        // Cache images if enabled and not locked
        if (shouldCacheImages && imageCacheService && !lockedFields.boxArtUrl && !lockedFields.bannerUrl) {
          const cached = await imageCacheService.cacheImages({ boxArtUrl, bannerUrl }, gameId);
          boxArtUrl = cached.boxArtUrl || boxArtUrl;
          bannerUrl = cached.bannerUrl || bannerUrl;
        }

        const updatedGame: Game = {
          ...existingGame, // Preserve all existing fields
          // Only update title if not locked
          title: lockedFields.title ? existingGame.title : steamGame.name,
          boxArtUrl,
          bannerUrl,
          // Preserve playtime if it exists (don't overwrite with undefined)
          playtime: existingGame.playtime !== undefined ? existingGame.playtime : undefined,
        };
        gamesMap.set(gameId, updatedGame);
      } else if (!existingGame) {
        // New game - create fresh
        let boxArtUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/header.jpg`;
        let bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/Library_600x900.jpg`;

        // Cache images if enabled
        if (shouldCacheImages && imageCacheService) {
          const cached = await imageCacheService.cacheImages({ boxArtUrl, bannerUrl }, gameId);
          boxArtUrl = cached.boxArtUrl || boxArtUrl;
          bannerUrl = cached.bannerUrl || bannerUrl;
        }

        const game: Game = {
          id: gameId,
          title: steamGame.name,
          platform: 'steam',
          exePath: '', // Steam games don't have direct exe paths, would need to construct from installDir
          boxArtUrl,
          bannerUrl,
        };
        gamesMap.set(gameId, game);
      }
      // If existing game is not a Steam game, don't overwrite it
    }

    const finalGames = Array.from(gamesMap.values());
    this.scheduleSave(finalGames);
    console.log(`Merged ${steamGames.length} Steam games, total games: ${finalGames.length}`);
  }

  /**
   * Delete a game from the store
   */
  async deleteGame(gameId: string): Promise<void> {
    const store = await this.ensureStore();
    const games = await this.getLibrary();
    const filteredGames = games.filter(g => g.id !== gameId);
    this.scheduleSave(filteredGames);
  }

  /**
   * Clear all games from the store
   */
  async clearLibrary(): Promise<void> {
    const store = await this.ensureStore();
    this.scheduleSave([]);
  }

  /**
   * Update metadata (boxArtUrl, bannerUrl, logoUrl, heroUrl) for a game by ID
   */
  async updateGameMetadata(
    gameId: string,
    boxArtUrl: string,
    bannerUrl: string,
    logoUrl?: string,
    heroUrl?: string,
    alternativeBannerUrl?: string,
    iconUrl?: string,
    screenshots?: string[]
  ): Promise<boolean> {
    const store = await this.ensureStore();
    const games = await this.getLibrary();
    const gameIndex = games.findIndex(g => g.id === gameId);

    if (gameIndex >= 0) {
      games[gameIndex].boxArtUrl = stripTransientUrlSuffix(boxArtUrl) || '';
      games[gameIndex].bannerUrl = stripTransientUrlSuffix(bannerUrl) || '';
      if (logoUrl !== undefined) {
        games[gameIndex].logoUrl = stripTransientUrlSuffix(logoUrl);
      }
      if (heroUrl !== undefined) {
        games[gameIndex].heroUrl = stripTransientUrlSuffix(heroUrl);
      }
      if (alternativeBannerUrl !== undefined) {
        games[gameIndex].alternativeBannerUrl = stripTransientUrlSuffix(alternativeBannerUrl);
      }
      if (iconUrl !== undefined) {
        games[gameIndex].iconUrl = stripTransientUrlSuffix(iconUrl);
      }
      if (screenshots !== undefined) {
        games[gameIndex].screenshots = screenshots;
      }
      this.scheduleSave(games);
      return true;
    }

    return false;
  }

  /**
   * Clear broken onyx-local:// URLs from all games
   * This is used to clean up URLs that point to files that don't exist in the cache
   * Only clears URLs if the corresponding file doesn't exist
   */
  async clearBrokenOnyxLocalUrls(cacheDir?: string): Promise<number> {
    const store = await this.ensureStore();
    const games = await this.getLibrary();
    let clearedCount = 0;

    // If no cache dir provided, we can't check if files exist, so don't clear anything
    if (!cacheDir) {
      console.log('[GameStore] No cache directory provided - skipping URL cleanup');
      return 0;
    }

    const { existsSync } = require('node:fs');

    const clearIfMissing = (
      game: Game,
      field: 'boxArtUrl' | 'bannerUrl' | 'logoUrl' | 'heroUrl' | 'alternativeBannerUrl' | 'iconUrl',
      label: string
    ) => {
      const currentUrl = game[field];
      if (!currentUrl?.startsWith('onyx-local://')) {
        return;
      }

      const assetPath = this.extractFilePathFromOnyxUrl(currentUrl, cacheDir);
      if (!existsSync(assetPath)) {
        console.log(`[GameStore] Clearing broken ${label} URL for ${game.title}: ${currentUrl}`);
        game[field] = '';
        clearedCount++;
      }
    };

    games.forEach(game => {
      clearIfMissing(game, 'boxArtUrl', 'boxart');
      clearIfMissing(game, 'bannerUrl', 'banner');
      clearIfMissing(game, 'logoUrl', 'logo');
      clearIfMissing(game, 'heroUrl', 'hero');
      clearIfMissing(game, 'alternativeBannerUrl', 'alternative banner');
      clearIfMissing(game, 'iconUrl', 'icon');

      if (Array.isArray(game.screenshots)) {
        const nextScreenshots = game.screenshots.filter((url, index) => {
          if (!url?.startsWith('onyx-local://')) {
            return true;
          }

          const screenshotPath = this.extractFilePathFromOnyxUrl(url, cacheDir);
          if (existsSync(screenshotPath)) {
            return true;
          }

          console.log(`[GameStore] Clearing broken screenshot URL ${index + 1} for ${game.title}: ${url}`);
          clearedCount++;
          return false;
        });

        if (nextScreenshots.length !== game.screenshots.length) {
          game.screenshots = nextScreenshots;
        }
      }
    });

    if (clearedCount > 0) {
      console.log(`[GameStore] Cleared ${clearedCount} broken onyx-local:// URLs`);
      this.scheduleSave(games);
    }

    return clearedCount;
  }

  /**
   * Extract file path from onyx-local URL
   * Handles both simple format (onyx-local://gameId-type) and encoded format
   */
  private extractFilePathFromOnyxUrl(url: string, cacheDir: string): string {
    const path = require('node:path');

    const normalizedUrl = normalizeOnyxLocalUrl(url) || '';

    // Extract the part after onyx-local://
    let urlPart = normalizedUrl.replace('onyx-local://', '');

    // If it looks like a full path (encoded), decode it
    if (urlPart.includes('%') || urlPart.includes('/')) {
      try {
        urlPart = decodeURIComponent(urlPart);
        // If it's already an absolute path, return as-is
        if (path.isAbsolute(urlPart)) {
          return urlPart;
        }
      } catch (e) {
        // If decode fails, treat as simple format
      }
    }

    // Simple format: onyx-local://gameId-type
    // The protocol handler looks for files like: {gameId}-{type}.{ext}
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];
    for (const ext of extensions) {
      const filePath = path.join(cacheDir, `${urlPart}${ext}`);
      if (require('node:fs').existsSync(filePath)) {
        return filePath;
      }
    }

    // Return path with first extension as fallback (will be checked with existsSync)
    return path.join(cacheDir, `${urlPart}.jpg`);
  }

  /**
   * Reorder games in the store according to the provided order
   */
  async reorderGames(reorderedGames: Game[]): Promise<void> {
    const store = await this.ensureStore();
    this.scheduleSave(reorderedGames);
  }

  /**
   * Get a list of games that are missing from the disk
   * @param steamService - Optional SteamService to check if Steam games are still installed
   * @returns Array of missing games
   */
  async getMissingGames(steamService?: { scanSteamGames: () => Promise<Array<{ appId: string }>> }): Promise<Game[]> {
    const games = await this.getLibrary();
    const { existsSync } = require('node:fs');
    const missingGames: Game[] = [];

    // Get list of installed Steam games if SteamService is provided
    let installedSteamAppIds: Set<string> | null = null;
    if (steamService) {
      try {
        const steamGames = await steamService.scanSteamGames();
        installedSteamAppIds = new Set(steamGames.map(g => g.appId));
        console.log(`[GameStore] Found ${installedSteamAppIds.size} installed Steam games`);
      } catch (error) {
        console.warn('[GameStore] Could not scan Steam games:', error);
      }
    }

    for (const game of games) {
      let isMissing = false;

      // Check Steam games
      if (game.id.startsWith('steam-')) {
        if (installedSteamAppIds) {
          const appIdMatch = game.id.match(/^steam-(.+)$/);
          if (appIdMatch && appIdMatch[1]) {
            const appId = appIdMatch[1];
            if (!installedSteamAppIds.has(appId)) {
              console.log(`[GameStore] Steam game no longer installed: ${game.title} (AppID: ${appId})`);
              isMissing = true;
            }
          }
        } else {
          // If we can't check Steam, don't mark as missing
          continue;
        }
      } else {
        // For non-Steam games, check if exePath or installationDirectory exists
        const pathsToCheck: string[] = [];

        if (game.exePath && !game.exePath.startsWith('steam://') && !game.exePath.startsWith('http://') && !game.exePath.startsWith('https://')) {
          pathsToCheck.push(game.exePath);
        }

        if (game.installationDirectory) {
          pathsToCheck.push(game.installationDirectory);
        }

        // If we have paths to check, verify at least one exists
        if (pathsToCheck.length > 0) {
          const anyPathExists = pathsToCheck.some(path => {
            try {
              return existsSync(path);
            } catch (error) {
              return false;
            }
          });

          if (!anyPathExists) {
            console.log(`[GameStore] Game files no longer exist: ${game.title} (exePath: ${game.exePath}, installDir: ${game.installationDirectory})`);
            isMissing = true;
          }
        } else {
          // If no paths to check (e.g., custom game with no exePath), keep it
          continue;
        }
      }

      if (isMissing) {
        missingGames.push(game);
      }
    }

    return missingGames;
  }

  /**
   * Check for missing games and remove them from the store
   * @param steamService - Optional SteamService to check if Steam games are still installed
   * @returns Number of games removed
   */
  async removeMissingGames(steamService?: { scanSteamGames: () => Promise<Array<{ appId: string }>> }): Promise<number> {
    const missingGames = await this.getMissingGames(steamService);

    if (missingGames.length > 0) {
      const store = await this.ensureStore();
      const games = await this.getLibrary();
      const missingIds = new Set(missingGames.map(g => g.id));
      const gamesToKeep = games.filter(g => !missingIds.has(g.id));

      console.log(`[GameStore] Removing ${missingGames.length} missing game(s) from library`);
      this.scheduleSave(gamesToKeep);
    }

    return missingGames.length;
  }
}

