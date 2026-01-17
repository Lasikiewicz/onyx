export interface SteamGridDBConfig {
  apiKey: string;
}

export interface SteamGridDBGame {
  id: number;
  name: string;
  types: string[];
  verified: boolean;
  release_date?: number;
  developer?: string;
  publisher?: string;
  steam_app_id?: number;
}

export interface SteamGridDBImage {
  id: number;
  score: number;
  style?: string;
  width: number;
  height: number;
  nsfw: boolean;
  humor: boolean;
  notes?: string;
  mime?: string;
  language?: string;
  url: string;
  thumb: string;
  lock: boolean;
  epilepsy: boolean;
  upvotes: number;
  downvotes: number;
  author: {
    name: string;
    steam64: string;
    avatar: string;
  };
}

export interface SteamGridDBMetadata {
  boxArtUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  heroUrl?: string;
  iconUrl?: string;
}

export class SteamGridDBService {
  private apiKey: string;
  private baseUrl = 'https://www.steamgriddb.com/api/v2';

  // Request queue for rate limiting
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 250; // 250ms between requests (4 requests/sec max)

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Queue a request to prevent rate limiting
   */
  private async queueRequest<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await execute();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift();
        if (!request) break;

        // Rate limiting: ensure minimum interval between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }

        this.lastRequestTime = Date.now();
        await request();
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get game by Steam App ID (more accurate than title search)
   */
  async getGameBySteamAppId(steamAppId: string | number): Promise<SteamGridDBGame | null> {
    return this.queueRequest(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/games/steam/${steamAppId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`[SteamGridDB] No game found for Steam App ID: ${steamAppId}`);
            return null;
          }
          if (response.status === 401) {
            throw new Error('Invalid SteamGridDB API key');
          }
          throw new Error(`SteamGridDB API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { data?: SteamGridDBGame };
        return data.data || null;
      } catch (error) {
        console.error('Error fetching SteamGridDB game by Steam App ID:', error);
        return null;
      }
    });
  }

  /**
   * Search for games by name
   */
  async searchGame(query: string, steamAppId?: string): Promise<SteamGridDBGame[]> {
    return this.queueRequest(async () => {
      try {
        // If Steam App ID provided, try direct lookup first (more accurate)
        if (steamAppId) {
          const game = await this.getGameBySteamAppId(steamAppId);
          if (game) {
            console.log(`[SteamGridDB] Found game by Steam App ID ${steamAppId}: ${game.name}`);
            return [game];
          }
        }

        // Fall back to title search
        const response = await fetch(`${this.baseUrl}/search/autocomplete/${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid SteamGridDB API key');
          }
          throw new Error(`SteamGridDB API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { data?: SteamGridDBGame[] };
        return data.data || [];
      } catch (error) {
        console.error('Error searching SteamGridDB:', error);
        throw error;
      }
    });
  }

  /**
   * Get vertical grids (600x900) for a game
   * Includes both static and animated grids
   */
  async getVerticalGrids(gameId: number, includeAnimated: boolean = true): Promise<SteamGridDBImage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/grids/vertical/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        // 404 is expected for games without vertical grids - don't log as error
        if (response.status === 404) {
          return [];
        }
        // Other errors should be logged but not thrown
        console.warn(`[SteamGridDB] API error ${response.status} for vertical grids (game ${gameId}): ${response.statusText}`);
        return [];
      }

      const data = await response.json() as { data?: SteamGridDBImage[] };
      const grids = data.data || [];

      // Filter by mime type if needed (animated grids are typically webp or gif)
      // But by default, include all grids (both static and animated)
      if (!includeAnimated) {
        return grids.filter(img => !img.mime || (img.mime !== 'image/webp' && img.mime !== 'image/gif'));
      }

      return grids;
    } catch (error) {
      // Network errors or other issues - return empty array instead of throwing
      console.warn(`[SteamGridDB] Error fetching vertical grids for game ${gameId}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Get capsule images (boxart) for a game
   * Capsules are vertical game cover images
   */
  async getCapsules(gameId: number, includeAnimated: boolean = true): Promise<SteamGridDBImage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/grids/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        console.warn(`[SteamGridDB] API error ${response.status} for capsules (game ${gameId}): ${response.statusText}`);
        return [];
      }

      const data = await response.json() as { data?: SteamGridDBImage[] };
      const grids = data.data || [];

      if (!includeAnimated) {
        return grids.filter(img => !img.mime || (img.mime !== 'image/webp' && img.mime !== 'image/gif'));
      }

      return grids;
    } catch (error) {
      console.warn(`[SteamGridDB] Error fetching capsules for game ${gameId}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Get heroes (1920x1080) for a game
   */
  async getHeroes(gameId: number): Promise<SteamGridDBImage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/heroes/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        console.warn(`[SteamGridDB] API error ${response.status} for heroes (game ${gameId}): ${response.statusText}`);
        return [];
      }

      const data = await response.json() as { data?: SteamGridDBImage[] };
      return data.data || [];
    } catch (error) {
      console.warn(`[SteamGridDB] Error fetching heroes for game ${gameId}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Get clear logos (PNG) for a game
   */
  async getLogos(gameId: number): Promise<SteamGridDBImage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/logos/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        console.warn(`[SteamGridDB] API error ${response.status} for logos (game ${gameId}): ${response.statusText}`);
        return [];
      }

      const data = await response.json() as { data?: SteamGridDBImage[] };
      return data.data || [];
    } catch (error) {
      console.warn(`[SteamGridDB] Error fetching logos for game ${gameId}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Get icons for a game
   */
  async getIcons(gameId: number): Promise<SteamGridDBImage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/icons/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        console.warn(`[SteamGridDB] API error ${response.status} for icons (game ${gameId}): ${response.statusText}`);
        return [];
      }

      const data = await response.json() as { data?: SteamGridDBImage[] };
      return data.data || [];
    } catch (error) {
      console.warn(`[SteamGridDB] Error fetching icons for game ${gameId}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Get all metadata for a game (box art, banner, logo, hero, icon)
   * Prioritizes highest scored images
   */
  async getGameMetadata(gameId: number): Promise<SteamGridDBMetadata> {
    try {
      const [capsules, heroes, logos, icons] = await Promise.all([
        this.getCapsules(gameId),
        this.getHeroes(gameId),
        this.getLogos(gameId),
        this.getIcons(gameId),
      ]);

      // Sort by score (highest first) and filter out NSFW/humor/epilepsy content
      const filterImage = (img: SteamGridDBImage) => !img.nsfw && !img.humor && !img.epilepsy;

      const bestCapsule = capsules
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];

      const bestHero = heroes
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];

      const bestLogo = logos
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];

      const bestIcon = icons
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];

      return {
        boxArtUrl: bestCapsule?.url || '',
        bannerUrl: bestHero?.url || '',
        logoUrl: bestLogo?.url || '',
        heroUrl: bestHero?.url || '',
        iconUrl: bestIcon?.url || '',
      };
    } catch (error) {
      console.error('Error fetching game metadata:', error);
      return {
        boxArtUrl: '',
        bannerUrl: '',
        logoUrl: '',
        heroUrl: '',
      };
    }
  }

  /**
   * Search for a game and fetch its metadata
   */
  async searchAndFetchMetadata(gameTitle: string, steamAppId?: string): Promise<SteamGridDBMetadata | null> {
    try {
      // First, try to search for the game
      const games = await this.searchGame(gameTitle);

      if (games.length === 0) {
        return null;
      }

      // If we have a Steam App ID, try to find a matching game
      let selectedGame: SteamGridDBGame | undefined;
      if (steamAppId) {
        selectedGame = games.find(g => g.steam_app_id === parseInt(steamAppId, 10));
      }

      // If no match or no Steam App ID, use the first result
      if (!selectedGame) {
        selectedGame = games[0];
      }

      // Fetch metadata for the selected game
      const metadata = await this.getGameMetadata(selectedGame.id);

      // If logo is missing, try a broader search or different types if possible
      // (SteamGridDB API doesn't have many more logo options, but we can log it)
      if (!metadata.logoUrl) {
        console.log(`[SteamGridDB] Logo missing for ${selectedGame.name} (ID: ${selectedGame.id})`);
      }

      return metadata;
    } catch (error) {
      console.error('Error in searchAndFetchMetadata:', error);
      return null;
    }
  }
}
