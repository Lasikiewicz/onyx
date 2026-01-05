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
}

export class SteamGridDBService {
  private apiKey: string;
  private baseUrl = 'https://www.steamgriddb.com/api/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for games by name
   */
  async searchGame(query: string): Promise<SteamGridDBGame[]> {
    try {
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
  }

  /**
   * Get vertical grids (600x900) for a game
   */
  async getVerticalGrids(gameId: number): Promise<SteamGridDBImage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/grids/vertical/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`SteamGridDB API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { data?: SteamGridDBImage[] };
      return data.data || [];
    } catch (error) {
      console.error('Error fetching vertical grids:', error);
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
        throw new Error(`SteamGridDB API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { data?: SteamGridDBImage[] };
      return data.data || [];
    } catch (error) {
      console.error('Error fetching heroes:', error);
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
        throw new Error(`SteamGridDB API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { data?: SteamGridDBImage[] };
      return data.data || [];
    } catch (error) {
      console.error('Error fetching logos:', error);
      return [];
    }
  }

  /**
   * Get all metadata for a game (box art, banner, logo, hero)
   * Prioritizes highest scored images
   */
  async getGameMetadata(gameId: number): Promise<SteamGridDBMetadata> {
    try {
      const [verticalGrids, heroes, logos] = await Promise.all([
        this.getVerticalGrids(gameId),
        this.getHeroes(gameId),
        this.getLogos(gameId),
      ]);

      // Sort by score (highest first) and filter out NSFW/humor/epilepsy content
      const filterImage = (img: SteamGridDBImage) => !img.nsfw && !img.humor && !img.epilepsy;
      
      const bestVertical = verticalGrids
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];
      
      const bestHero = heroes
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];
      
      const bestLogo = logos
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];

      return {
        boxArtUrl: bestVertical?.url || '',
        bannerUrl: bestHero?.url || '',
        logoUrl: bestLogo?.url || '',
        heroUrl: bestHero?.url || '',
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
      return await this.getGameMetadata(selectedGame.id);
    } catch (error) {
      console.error('Error in searchAndFetchMetadata:', error);
      return null;
    }
  }
}
