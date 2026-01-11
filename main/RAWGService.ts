import axios, { AxiosInstance } from 'axios';

export interface RAWGGame {
  id: number;
  name: string;
  name_original?: string;
  description?: string;
  description_raw?: string;
  released?: string;
  background_image?: string;
  background_image_additional?: string;
  website?: string;
  rating?: number;
  rating_top?: number;
  ratings?: Array<{
    id: number;
    title: string;
    count: number;
    percent: number;
  }>;
  ratings_count?: number;
  reviews_text_count?: number;
  metacritic?: number;
  metacritic_platforms?: Array<{
    metascore: number;
    url: string;
    platform: {
      platform: number;
      name: string;
      slug: string;
    };
  }>;
  tba?: boolean;
  updated?: string;
  genres?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
    language: string;
    games_count: number;
    image_background?: string;
  }>;
  developers?: Array<{
    id: number;
    name: string;
    slug: string;
    games_count: number;
    image_background?: string;
  }>;
  publishers?: Array<{
    id: number;
    name: string;
    slug: string;
    games_count: number;
    image_background?: string;
  }>;
  platforms?: Array<{
    platform: {
      id: number;
      name: string;
      slug: string;
    };
    released_at?: string;
    requirements?: {
      minimum?: string;
      recommended?: string;
    };
  }>;
  stores?: Array<{
    id: number;
    store: {
      id: number;
      name: string;
      slug: string;
      domain?: string;
      games_count?: number;
      image_background?: string;
    };
    url?: string;
  }>;
  esrb_rating?: {
    id: number;
    name: string;
    slug: string;
  };
  playtime?: number;
  screenshots?: Array<{
    id: number;
    image: string;
    width: number;
    height: number;
    is_deleted: boolean;
  }>;
  movies?: Array<{
    id: number;
    name: string;
    preview: string;
    data: {
      480: string;
      max: string;
    };
  }>;
}

export interface RAWGSearchResult {
  count: number;
  next?: string;
  previous?: string;
  results: RAWGGame[];
}

export interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

export class RAWGService {
  private apiKey: string;
  private axiosInstance: AxiosInstance;
  private requestQueue: QueuedRequest<any>[] = [];
  private processingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 250; // 250ms between requests (4 requests/second max)
  private readonly MAX_CONCURRENT_REQUESTS = 2;
  private activeRequests = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.axiosInstance = axios.create({
      baseURL: 'https://api.rawg.io/api',
      params: {
        key: this.apiKey,
      },
    });
  }

  /**
   * Queue a request to prevent rate limiting
   */
  private async queueRequest<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push({ execute, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      // Wait if we have too many concurrent requests
      while (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Ensure minimum interval between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }

      const request = this.requestQueue.shift();
      if (!request) break;

      this.lastRequestTime = Date.now();
      this.activeRequests++;

      request
        .execute()
        .then(result => {
          this.activeRequests--;
          request.resolve(result);
          this.processQueue();
        })
        .catch(error => {
          this.activeRequests--;
          request.reject(error);
          this.processQueue();
        });
    }

    this.processingQueue = false;
  }

  /**
   * Search for games by name
   */
  async searchGame(query: string): Promise<RAWGGame[]> {
    return this.queueRequest(async () => {
      try {
        const response = await this.axiosInstance.get<RAWGSearchResult>('/games', {
          params: {
            search: query,
            page_size: 20,
          },
        });
        return response.data.results || [];
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Invalid RAWG API key');
        }
        console.error('RAWG search error:', error);
        throw error;
      }
    });
  }

  /**
   * Get game details by ID
   */
  async getGameDetails(gameId: number): Promise<RAWGGame | null> {
    return this.queueRequest(async () => {
      try {
        const response = await this.axiosInstance.get<RAWGGame>(`/games/${gameId}`);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Invalid RAWG API key');
        }
        console.error('RAWG getGameDetails error:', error);
        throw error;
      }
    });
  }
}
