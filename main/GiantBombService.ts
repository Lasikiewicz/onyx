import { getRateLimitCoordinator } from './RateLimitCoordinator.js';

export interface GiantBombGame {
  id: number;
  name: string;
  deck?: string;
  description?: string;
  image?: {
    original_url?: string;
    super_url?: string;
    screen_url?: string;
    small_url?: string;
    thumb_url?: string;
    medium_url?: string;
  };
  images?: Array<{
    original: string;
    super: string;
    screen: string;
    small: string;
    thumb: string;
    medium: string;
  }>;
  original_release_date?: string;
  genres?: Array<{
    name: string;
  }>;
  platforms?: Array<{
    name: string;
  }>;
  developers?: Array<{
    name: string;
  }>;
  publishers?: Array<{
    name: string;
  }>;
  expected_release_year?: number;
  expected_release_month?: number;
  expected_release_day?: number;
}

export interface GiantBombGameResult {
  id: number;
  name: string;
  summary?: string;
  coverUrl?: string;
  screenshotUrls?: string[];
  logoUrl?: string;
  releaseDate?: string;
  genres?: string[];
  platforms?: string[];
  developers?: string[];
  publishers?: string[];
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

export class GiantBombService {
  private apiKey: string;
  private rateLimiter = getRateLimitCoordinator();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private buildUrl(endpoint: string, params: Record<string, string | number | undefined> = {}): string {
    const url = new URL(`https://www.giantbomb.com/api${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('format', 'json');
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  /**
   * Validate API key by attempting a simple request
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const url = this.buildUrl('/games', {
        limit: 1,
        field_list: 'id',
      });
      const response = await fetch(url);
      if (!response.ok) {
        console.error('[GiantBombService] Credential validation HTTP error:', response.status);
        return false;
      }
      const data: any = await response.json().catch(() => null);
      return data && data.status_code === 1;
    } catch (error: any) {
      console.error('[GiantBombService] Credential validation error:', error?.message ?? error);
      return false;
    }
  }

  /**
   * Search for games by title
   */
  async searchGame(title: string): Promise<GiantBombGameResult[]> {
    return this.rateLimiter.queueRequest("giantbomb", async () => {
      try {
        const url = this.buildUrl('/games', {
          filter: `name:${title}`,
          limit: 10,
          field_list: 'id,name,deck,image,original_release_date,genres,platforms,developers,publishers',
        });
        const response = await fetch(url);
        if (!response.ok) {
          console.error('GiantBomb search HTTP error:', response.status);
          return [];
        }
        const data: any = await response.json().catch(() => null);

        if (!data?.results) {
          return [];
        }

        return (data.results as GiantBombGame[]).map((game: GiantBombGame) => ({
          id: game.id,
          name: game.name,
          summary: game.deck,
          coverUrl: game.image?.super_url || game.image?.original_url,
          releaseDate: game.original_release_date,
          genres: game.genres?.map(g => g.name),
          platforms: game.platforms?.map(p => p.name),
          developers: game.developers?.map(d => d.name),
          publishers: game.publishers?.map(p => p.name),
        }));
      } catch (error: any) {
        console.error('GiantBomb search error:', error?.message ?? error);
        return [];
      }
    });
  }

  /**
   * Get detailed game information by ID
   */
  async getGameDetails(gameId: number): Promise<GiantBombGameResult | null> {
    return this.rateLimiter.queueRequest("giantbomb", async () => {
      try {
        const url = this.buildUrl(`/game/${gameId}`, {
          field_list: 'id,name,deck,description,image,images,original_release_date,genres,platforms,developers,publishers',
        });
        const response = await fetch(url);
        if (!response.ok) {
          console.error('GiantBomb getGameDetails HTTP error:', response.status);
          return null;
        }
        const data: any = await response.json().catch(() => null);

        if (!data?.results || data.results.length === 0) {
          return null;
        }

        const game = data.results[0] as GiantBombGame;

        return {
          id: game.id,
          name: game.name,
          summary: game.deck || game.description,
          coverUrl: game.image?.super_url || game.image?.original_url,
          screenshotUrls: game.images?.map(img => img.super || img.original),
          releaseDate: game.original_release_date,
          genres: game.genres?.map(g => g.name),
          platforms: game.platforms?.map(p => p.name),
          developers: game.developers?.map(d => d.name),
          publishers: game.publishers?.map(p => p.name),
        };
      } catch (error: any) {
        console.error('GiantBomb getGameDetails error:', error?.message ?? error);
        return null;
      }
    });
  }
}