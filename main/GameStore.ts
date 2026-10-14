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
   * The library array that every mutation reads from and writes back to, synchronously.
   *
   * Callers must not `await` between calling this and `scheduleSave()`. If they do, two
   * overlapping mutations can read the same snapshot and the later write silently drops the
   * earlier one (A2). Returns the live cache when there is one, otherwise a clone of the
   * persisted array: `store.get` hands back the store's internal objects, and mutating those
   * would change persisted state before anything is saved.
   */
  private getWorkingCopy(): Game[] {
    return this.gamesCache ?? structuredClone(this.store.get('games', []));
  }

  /**
   * Get all games from the store
   */
  async getLibrary(): Promise<Game[]> {
    // Deep copy: callers mutate the returned games (e.g. gameHandlers flag updates), and a
    // shallow copy would still share nested arrays such as links with the cache.
    return structuredClone(this.gamesCache ?? this.store.get('games', []));
  }

  /**
   * Get a copy of one game by ID, or undefined if it isn't in the library.
   */
  getGame(gameId: string): Game | undefined {
    const game = (this.gamesCache ?? this.store.get('games', [])).find(g => g.id === gameId);
    return game ? structuredClone(game) : undefined;
  }

  /**
   * Patch one game by ID. `patch` is either the fields to merge, or a function that receives
   * the current game and returns the fields to change (or nothing, to leave it alone).
   * Fields not named in the patch keep their current values, so a caller that only changes
   * one field can't overwrite a concurrent edit to another. Returns false if no game matches.
   */
  updateGame(
    gameId: string,
    patch: Partial<Game> | ((game: Game) => Partial<Game> | null | undefined),
  ): boolean {
    const games = this.getWorkingCopy();
    const index = games.findIndex(g => g.id === gameId);
    if (index < 0) return false;

    const changes = typeof patch === 'function' ? patch(games[index]) : patch;
    if (!changes) return false;

    games[index] = sanitizeGameArtworkUrls({ ...games[index], ...changes });
    this.scheduleSave(games);
    return true;
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
      // Keep the cache populated while the store resolves so reads stay correct, and so a
      // failure in ensureStore() leaves the pending data in place for a retry.
      const store = await this.ensureStore();
      // The cache may have been flushed or replaced during the await. Snapshot and clear
      // synchronously here, with no await before store.set, so a scheduleSave() that lands
      // afterwards arranges its own fresh write instead of being clobbered by this flush.
      const gamesToSave = this.gamesCache;
      if (!gamesToSave) return;
      this.gamesCache = null;
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore flush start games=${gamesToSave.length}`);
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore flush set games count=${gamesToSave.length}`);
      store.set('games', gamesToSave);
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
      this.store.set('games', gamesToSave);
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore flushSync done`);
      console.log(`[GameStore] Library flushed to disk [SYNC] (${gamesToSave.length} games)`);
    }
  }

  async migratePerGameViewSizeOverrides(): Promise<Record<string, { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number }>> {
    const games = this.getWorkingCopy();

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
      this.scheduleSave(migratedGames);
    }

    return overrides;
  }

  /**
   * Save a single game to the store
   */
  async saveGame(game: Game): Promise<void> {
    if (isDebugOptimizationEnabled()) debugOptimizationLog(`GameStore saveGame entry gameId=${game.id} title=${game.title?.slice(0, 30) ?? ''}`);
    const games = this.getWorkingCopy();
    const existingIndex = games.findIndex(g => g.id === game.id);

    // Create a deep copy to ensure all properties are saved
    const gameToSave: Game = sanitizeGameArtworkUrls({
      ...structuredClone(game),
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
    const gamesMap = new Map<string, Game>();

    // Add existing games to map
    this.getWorkingCopy().forEach(game => {
      gamesMap.set(game.id, game);
    });

    // Merge new games (new games override existing ones with same id)
    newGames.forEach(game => {
      gamesMap.set(game.id, structuredClone(game));
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
    // Image caching is slow and async, so it all happens before the library is read. The merge
    // below is fully synchronous, so nothing can write to the library between its read and its
    // write (A2). Holding a snapshot across the awaits would drop any save made in the meantime.
    const existingBefore = new Map(this.getWorkingCopy().map(game => [game.id, game]));
    const cachedArt = new Map<string, { boxArtUrl: string; bannerUrl: string }>();

    if (shouldCacheImages && imageCacheService) {
      for (const steamGame of steamGames) {
        const gameId = `steam-${steamGame.appId}`;
        const existing = existingBefore.get(gameId);
        // Only games that are new, or existing Steam games with both art slots unlocked, use cached art.
        if (existing) {
          if (existing.platform !== 'steam') continue;
          if (existing.lockedFields?.boxArtUrl || existing.lockedFields?.bannerUrl) continue;
        }

        const boxArtUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/header.jpg`;
        const bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/Library_600x900.jpg`;
        const cached = await imageCacheService.cacheImages({ boxArtUrl, bannerUrl }, gameId);
        cachedArt.set(gameId, {
          boxArtUrl: cached.boxArtUrl || boxArtUrl,
          bannerUrl: cached.bannerUrl || bannerUrl,
        });
      }
    }

    // Synchronous from here on: read the current library, merge, and schedule the write.
    const gamesMap = new Map<string, Game>();
    this.getWorkingCopy().forEach(game => {
      gamesMap.set(game.id, game);
    });

    for (const steamGame of steamGames) {
      const gameId = `steam-${steamGame.appId}`;
      const existingGame = gamesMap.get(gameId);
      const cached = cachedArt.get(gameId);
      const steamBoxArt = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/header.jpg`;
      const steamBanner = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/Library_600x900.jpg`;

      // If game exists, preserve lockedFields and only update unlocked fields
      if (existingGame && existingGame.platform === 'steam') {
        const lockedFields = existingGame.lockedFields || {};
        const boxArtUrl = lockedFields.boxArtUrl
          ? existingGame.boxArtUrl
          : (cached?.boxArtUrl ?? steamBoxArt);
        const bannerUrl = lockedFields.bannerUrl
          ? existingGame.bannerUrl
          : (cached?.bannerUrl ?? steamBanner);

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
        const game: Game = {
          id: gameId,
          title: steamGame.name,
          platform: 'steam',
          exePath: '', // Steam games don't have direct exe paths, would need to construct from installDir
          boxArtUrl: cached?.boxArtUrl ?? steamBoxArt,
          bannerUrl: cached?.bannerUrl ?? steamBanner,
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
    const filteredGames = this.getWorkingCopy().filter(g => g.id !== gameId);
    this.scheduleSave(filteredGames);
  }

  /**
   * Clear all games from the store
   */
  async clearLibrary(): Promise<void> {
    this.scheduleSave([]);
  }

  /**
   * Replace the whole library, and write it to disk straight away. Used to restore a backup (E3),
   * so the restored state is persisted before the call returns.
   */
  async replaceLibrary(games: Game[]): Promise<void> {
    this.scheduleSave(structuredClone(games));
    await this.flushPending();
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
    const games = this.getWorkingCopy();
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
    let clearedCount = 0;

    // If no cache dir provided, we can't check if files exist, so don't clear anything
    if (!cacheDir) {
      console.log('[GameStore] No cache directory provided - skipping URL cleanup');
      return 0;
    }

    const games = this.getWorkingCopy();
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
   * Apply a manual order to the games named in `orderedIds`.
   *
   * The renderer only knows the games currently on screen, so it sends IDs rather than the
   * full library. Each listed game takes the slot that a listed game already occupies, in
   * the order given. Games that are not listed, including hidden and filtered ones, stay
   * exactly where they were. Unknown and duplicate IDs are ignored. The stored objects are
   * reused, so renderer-only fields (cache-busters, merged view settings) are never persisted.
   */
  async reorderGames(orderedIds: string[]): Promise<void> {
    const games = this.getWorkingCopy();
    const gamesById = new Map(games.map(game => [game.id, game]));

    const requested = [...new Set(orderedIds)].filter(id => gamesById.has(id));
    const requestedSet = new Set(requested);
    const slots: number[] = [];
    games.forEach((game, index) => {
      if (requestedSet.has(game.id)) slots.push(index);
    });

    // `requested` and `slots` have the same length, because each is the set of listed games
    // that exist in the library.
    requested.forEach((id, i) => {
      const game = gamesById.get(id);
      if (game) games[slots[i]] = game;
    });

    this.scheduleSave(games);
  }
}
