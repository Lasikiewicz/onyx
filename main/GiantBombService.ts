import axios, { AxiosInstance } from 'axios';
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
  private axiosInstance: AxiosInstance;
  private rateLimiter = getRateLimitCoordinator();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.axiosInstance = axios.create({
      baseURL: 'https://www.giantbomb.com/api',
      params: {
        api_key: this.apiKey,
        format: 'json',
      },
    });
  }

  /**
   * Search for games by title
   */
  async searchGame(title: string): Promise<GiantBombGameResult[]> {
    return this.rateLimiter.queueRequest("giantbomb", async () => {
      try {
        const response = await this.axiosInstance.get('/games', {
          params: {
            filter: `name:${title}`,
            limit: 10,
            field_list: 'id,name,deck,image,original_release_date,genres,platforms,developers,publishers',
          },
        });

        if (!response.data?.results) {
          return [];
        }

        return response.data.results.map((game: GiantBombGame) => ({
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
        console.error('GiantBomb search error:', error.message);
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
        const response = await this.axiosInstance.get(`/game/${gameId}`, {
          params: {
            field_list: 'id,name,deck,description,image,images,original_release_date,genres,platforms,developers,publishers',
          },
        });

        if (!response.data?.results || response.data.results.length === 0) {
          return null;
        }

        const game = response.data.results[0] as GiantBombGame;

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
        console.error('GiantBomb getGameDetails error:', error.message);
        return null;
      }
    });
  }
}