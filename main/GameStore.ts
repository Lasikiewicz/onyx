import type Store from 'electron-store';
import { SteamGame } from './SteamService.js';

export interface Game {
  id: string;
  title: string;
  sortingName?: string;
  platform: 'steam' | 'other' | string;
  exePath: string;
  boxArtUrl: string;
  bannerUrl: string;
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
  favorite?: boolean;
  hidden?: boolean;
  broken?: boolean;
  notes?: string;
  links?: Array<{ name: string; url: string }>;
  actions?: Array<{ name: string; path: string; arguments?: string; workingDir?: string }>;
  scripts?: Array<{ name: string; script: string }>;
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

export class GameStore {
  private store: Store<StoreSchema> | null = null;
  private storePromise: Promise<Store<StoreSchema>>;

  constructor() {
    // Use dynamic import for ES module
    // TypeScript will compile this to require() in CommonJS, so we use eval to preserve dynamic import
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    this.storePromise = (new Function('return import("electron-store")')() as Promise<typeof import('electron-store')>).then((StoreModule) => {
      const Store = StoreModule.default;
      this.store = new Store<StoreSchema>({
        name: 'game-library',
        defaults: {
          games: [],
        },
      });
      return this.store;
    });
  }

  private async ensureStore(): Promise<Store<StoreSchema>> {
    if (this.store) {
      return this.store;
    }
    return await this.storePromise;
  }

  /**
   * Get all games from the store
   */
  async getLibrary(): Promise<Game[]> {
    const store = await this.ensureStore();
    return (store as any).get('games', []);
  }

  /**
   * Save a single game to the store
   */
  async saveGame(game: Game): Promise<void> {
    const store = await this.ensureStore();
    const games = await this.getLibrary();
    const existingIndex = games.findIndex(g => g.id === game.id);
    
    // Create a deep copy to ensure all properties are saved
    const gameToSave: Game = {
      ...game,
      // Preserve favorite property as-is (true, false, or undefined)
      favorite: game.favorite,
      lockedFields: game.lockedFields ? { ...game.lockedFields } : undefined,
    };
    
    if (existingIndex >= 0) {
      // Update existing game
      games[existingIndex] = gameToSave;
      console.log(`Updated game: ${gameToSave.title} (${gameToSave.id})`);
    } else {
      // Add new game
      games.push(gameToSave);
      console.log(`Added new game: ${gameToSave.title} (${gameToSave.id})`);
    }
    
    (store as any).set('games', games);
    console.log(`Total games in store: ${games.length}`);
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
    
    (store as any).set('games', Array.from(gamesMap.values()));
  }

  /**
   * Merge Steam games into the store
   * Creates Game objects from SteamGame objects, avoiding duplicates
   * Preserves existing game data including lockedFields
   */
  async mergeSteamGames(steamGames: SteamGame[]): Promise<void> {
    const store = await this.ensureStore();
    const existingGames = await this.getLibrary();
    const gamesMap = new Map<string, Game>();
    
    // Add existing games to map
    existingGames.forEach(game => {
      gamesMap.set(game.id, game);
    });
    
    // Convert SteamGame to Game and merge
    steamGames.forEach(steamGame => {
      const gameId = `steam-${steamGame.appId}`;
      const existingGame = gamesMap.get(gameId);
      
      // If game exists, preserve lockedFields and only update unlocked fields
      if (existingGame && existingGame.platform === 'steam') {
        const lockedFields = existingGame.lockedFields || {};
        const updatedGame: Game = {
          ...existingGame, // Preserve all existing fields
          // Only update title if not locked
          title: lockedFields.title ? existingGame.title : steamGame.name,
          // Only update boxArtUrl if not locked
          boxArtUrl: lockedFields.boxArtUrl 
            ? existingGame.boxArtUrl 
            : `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/header.jpg`,
          // Only update bannerUrl if not locked
          bannerUrl: lockedFields.bannerUrl 
            ? existingGame.bannerUrl 
            : `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/library_600x900.jpg`,
        };
        gamesMap.set(gameId, updatedGame);
      } else if (!existingGame) {
        // New game - create fresh
        const game: Game = {
          id: gameId,
          title: steamGame.name,
          platform: 'steam',
          exePath: '', // Steam games don't have direct exe paths, would need to construct from installDir
          boxArtUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/header.jpg`,
          bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamGame.appId}/library_600x900.jpg`,
        };
        gamesMap.set(gameId, game);
      }
      // If existing game is not a Steam game, don't overwrite it
    });
    
    const finalGames = Array.from(gamesMap.values());
    (store as any).set('games', finalGames);
    console.log(`Merged ${steamGames.length} Steam games, total games: ${finalGames.length}`);
  }

  /**
   * Delete a game from the store
   */
  async deleteGame(gameId: string): Promise<void> {
    const store = await this.ensureStore();
    const games = await this.getLibrary();
    const filteredGames = games.filter(g => g.id !== gameId);
    (store as any).set('games', filteredGames);
  }

  /**
   * Clear all games from the store
   */
  async clearLibrary(): Promise<void> {
    const store = await this.ensureStore();
    (store as any).set('games', []);
  }

  /**
   * Update metadata (boxArtUrl, bannerUrl) for a game by ID
   */
  async updateGameMetadata(gameId: string, boxArtUrl: string, bannerUrl: string): Promise<boolean> {
    const store = await this.ensureStore();
    const games = await this.getLibrary();
    const gameIndex = games.findIndex(g => g.id === gameId);
    
    if (gameIndex >= 0) {
      games[gameIndex].boxArtUrl = boxArtUrl;
      games[gameIndex].bannerUrl = bannerUrl;
      (store as any).set('games', games);
      return true;
    }
    
    return false;
  }

  /**
   * Reorder games in the store according to the provided order
   */
  async reorderGames(reorderedGames: Game[]): Promise<void> {
    const store = await this.ensureStore();
    (store as any).set('games', reorderedGames);
  }
}
