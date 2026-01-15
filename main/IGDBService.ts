import axios, { AxiosInstance } from 'axios';

export interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: {
    url?: string;
  } | string; // Handle both object and string formats
  screenshots?: Array<{
    url?: string;
  } | string>; // Handle both object and string formats
  rating?: number;
  first_release_date?: number;
  genres?: Array<{
    name?: string;
  } | string>; // Handle both object and string formats
  platforms?: Array<{
    name?: string;
  } | number | string>; // Can be platform objects, IDs, or names
  age_ratings?: Array<{
    rating?: number;
    category?: number;
  } | number>; // Can be rating objects or IDs
  category?: number; // Game category
}

export interface IGDBGameResult {
  id: number;
  name: string;
  summary?: string;
  coverUrl?: string;
  screenshotUrls?: string[];
  logoUrl?: string;
  rating?: number;
  releaseDate?: number;
  genres?: string[];
  platform?: string;
  ageRating?: string;
  categories?: string[];
}

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

export class IGDBService {
  private clientId: string;
  private clientSecret: string;
  private accessTokenCache: AccessTokenCache | null = null;
  private axiosInstance: AxiosInstance;
  private requestQueue: QueuedRequest<any>[] = [];
  private processingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 250; // 250ms between requests (4 requests/second max)
  private readonly MAX_CONCURRENT_REQUESTS = 2; // Max 2 concurrent requests
  private activeRequests = 0;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.axiosInstance = axios.create({
      baseURL: 'https://api.igdb.com/v4',
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

      this.activeRequests++;
      this.lastRequestTime = Date.now();

      request.execute()
        .then(request.resolve)
        .catch(request.reject)
        .finally(() => {
          this.activeRequests--;
          // Continue processing queue
          setImmediate(() => this.processQueue());
        });
    }

    this.processingQueue = false;
  }

  /**
   * Execute a request without retries on rate limits - just throw immediately
   * This allows the caller to move to the next source
   */
  private async retryRequest<T>(
    execute: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    try {
      return await execute();
    } catch (error: any) {
      // Don't retry on rate limits (429) - just throw immediately so caller can try next source
      const isRateLimit = axios.isAxiosError(error) && error.response?.status === 429;
      if (isRateLimit) {
        console.warn(`[IGDB] Rate limited (429), moving to next source`);
        throw error;
      }
      
      // For other errors, throw immediately (no retries)
      throw error;
    }
  }

  /**
   * Validate credentials by attempting to get an access token
   * Returns true if credentials are valid, false otherwise
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        },
      });

      if (response.data && response.data.access_token) {
        // Cache the token if validation succeeds
        const { access_token, expires_in } = response.data;
        this.accessTokenCache = {
          token: access_token,
          expiresAt: Date.now() + (expires_in - 60) * 1000,
        };
        return true;
      }
      return false;
    } catch (error: any) {
      // Check if it's an authentication error (403, 401, or invalid client secret)
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || '';
        if (status === 403 || status === 401 || message.includes('invalid client')) {
          console.error('IGDB credentials are invalid:', message || error.message);
          return false;
        }
      }
      console.error('Error validating IGDB credentials:', error);
      return false;
    }
  }

  /**
   * Get OAuth2 access token, using cache if valid
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now()) {
      return this.accessTokenCache.token;
    }

    // Fetch new token
    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        },
      });

      const { access_token, expires_in } = response.data;
      
      // Cache the token (expires_in is in seconds, convert to milliseconds)
      // Subtract 60 seconds as a safety margin
      this.accessTokenCache = {
        token: access_token,
        expiresAt: Date.now() + (expires_in - 60) * 1000,
      };

      return access_token;
    } catch (error: any) {
      console.error('Error fetching IGDB access token:', error);
      // Check if it's an authentication error
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || '';
        if (status === 403 || status === 401 || message.includes('invalid client')) {
          throw new Error('IGDB credentials are invalid. Please check your API credentials in Settings > APIs.');
        }
      }
      throw new Error('Failed to authenticate with IGDB API');
    }
  }

  /**
   * Convert IGDB relative image URL to absolute URL with proper size
   */
  private convertImageUrl(url: string, type: 'cover' | 'screenshot'): string {
    if (!url) return '';
    
    // Prepend https: if it's a protocol-relative URL
    let absoluteUrl = url.startsWith('//') ? `https:${url}` : url;
    
    // Replace size tokens
    if (type === 'cover') {
      // Replace t_thumb with t_cover_big for covers
      absoluteUrl = absoluteUrl.replace(/t_thumb/g, 't_cover_big');
    } else if (type === 'screenshot') {
      // Replace t_thumb with t_screenshot_huge for screenshots
      absoluteUrl = absoluteUrl.replace(/t_thumb/g, 't_screenshot_huge');
    }
    
    return absoluteUrl;
  }

  /**
   * Search for games using IGDB API with rate limiting and retry logic
   */
  async searchGame(query: string): Promise<IGDBGameResult[]> {
    return this.queueRequest(async () => {
      return this.retryRequest(async () => {
        try {
          const accessToken = await this.getAccessToken();

          // Build the query string with all required fields
          // Note: age_ratings returns IDs, we'll fetch details separately
          
          // Check if query is a numeric ID (for direct game ID lookups)
          let queryBody: string;
          if (/^\d+$/.test(query)) {
            // Numeric ID query - use WHERE syntax instead of search
            queryBody = `fields name, summary, cover.url, screenshots.url, rating, first_release_date, genres.name, platforms.name, age_ratings, category;
where id = ${query};
limit 1;`;
          } else {
            // Text search query - use search syntax
            queryBody = `fields name, summary, cover.url, screenshots.url, rating, first_release_date, genres.name, platforms.name, age_ratings, category;
search "${query}";
limit 10;`;
          }

          const response = await this.axiosInstance.post<IGDBGame[]>('/games', queryBody, {
            headers: {
              'Client-ID': this.clientId,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'text/plain',
            },
          });

      // Collect all age rating IDs to fetch in one batch
      const ageRatingIds: number[] = [];
      response.data.forEach((game) => {
        if (game.age_ratings) {
          game.age_ratings.forEach((ar) => {
            if (typeof ar === 'number') {
              ageRatingIds.push(ar);
            } else if (typeof ar === 'object' && ar !== null && 'id' in ar) {
              ageRatingIds.push((ar as any).id);
            }
          });
        }
      });

      // Fetch age rating details if we have any
      const ageRatingMap: Map<number, { rating: number; category: number }> = new Map();
      if (ageRatingIds.length > 0) {
        try {
          const uniqueIds = [...new Set(ageRatingIds)];
          const ageRatingQuery = `fields rating, category;
where id = (${uniqueIds.join(',')});
limit 50;`;

          const ageRatingResponse = await this.queueRequest(async () => {
            return this.retryRequest(async () => {
              return await this.axiosInstance.post<Array<{ id: number; rating: number; category: number }>>(
                '/age_ratings',
                ageRatingQuery,
                {
                  headers: {
                    'Client-ID': this.clientId,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'text/plain',
                  },
                }
              );
            });
          });

          ageRatingResponse.data.forEach((ar) => {
            ageRatingMap.set(ar.id, { rating: ar.rating, category: ar.category });
          });
        } catch (error) {
          console.warn('Failed to fetch age rating details:', error);
        }
      }

      // Transform the results
      const results: IGDBGameResult[] = response.data.map((game) => {
        const result: IGDBGameResult = {
          id: game.id,
          name: game.name,
          summary: game.summary,
          rating: game.rating,
          releaseDate: game.first_release_date,
          genres: game.genres?.map((g) => {
            if (typeof g === 'string') return g;
            return g.name || '';
          }).filter((name) => name),
        };

        // Extract platform names
        if (game.platforms && game.platforms.length > 0) {
          const platformNames = game.platforms
            .map((p) => {
              if (typeof p === 'string') return p;
              if (typeof p === 'object' && p !== null && 'name' in p) return p.name || '';
              return '';
            })
            .filter((name) => name);
          if (platformNames.length > 0) {
            result.platform = platformNames.join(', ');
          }
        }

        // Extract age rating from the map we fetched - only use PEGI ratings
        if (game.age_ratings && game.age_ratings.length > 0) {
          // Try to find the first valid PEGI rating
          for (const ar of game.age_ratings) {
            let ageRatingId: number | undefined;
            if (typeof ar === 'number') {
              ageRatingId = ar;
            } else if (typeof ar === 'object' && ar !== null && 'id' in ar) {
              ageRatingId = (ar as any).id;
            }

            if (ageRatingId && ageRatingMap.has(ageRatingId)) {
              const ageRatingData = ageRatingMap.get(ageRatingId)!;
              const category = ageRatingData.category;
              const rating = ageRatingData.rating;

              // IGDB age ratings: category 1 = ESRB, category 2 = PEGI
              // Only use PEGI ratings (category 2)
              if (category === 2) {
                // PEGI ratings
                const pegiRatings: { [key: number]: string } = {
                  1: 'PEGI 3',
                  2: 'PEGI 7',
                  3: 'PEGI 12',
                  4: 'PEGI 16',
                  5: 'PEGI 18',
                };
                result.ageRating = pegiRatings[rating] || `PEGI ${rating}`;
                break; // Use the first valid PEGI rating found
              }
            }
          }
        }

        // Extract categories (game categories like main game, DLC, expansion, etc.)
        if (game.category !== undefined && game.category !== null) {
          const categoryMap: { [key: number]: string } = {
            0: 'Main Game',
            1: 'DLC/Add-on',
            2: 'Expansion',
            3: 'Bundle',
            4: 'Standalone Expansion',
            5: 'Mod',
            6: 'Episode',
            7: 'Season',
            8: 'Remake',
            9: 'Remaster',
            10: 'Expanded Game',
            11: 'Port',
            12: 'Fork',
            13: 'Pack',
            14: 'Update',
          };
          const categoryName = categoryMap[game.category];
          if (categoryName) {
            result.categories = [categoryName];
          }
          // Don't set a default category if category value is not recognized
        }
        // Don't set a default category if category is not provided

        // Convert cover URL - handle both object and string formats
        let coverUrl: string | undefined;
        if (typeof game.cover === 'string') {
          coverUrl = game.cover;
        } else if (game.cover && typeof game.cover === 'object' && 'url' in game.cover) {
          coverUrl = game.cover.url;
        }
        if (coverUrl) {
          result.coverUrl = this.convertImageUrl(coverUrl, 'cover');
          console.log(`[IGDBService] ✓ Found cover for "${game.name}": ${result.coverUrl}`);
        } else {
          console.log(`[IGDBService] ✗ No cover found for "${game.name}" (cover data: ${JSON.stringify(game.cover)})`);
        }

        // Convert screenshot URLs - handle both object and string formats
        if (game.screenshots && game.screenshots.length > 0) {
          result.screenshotUrls = game.screenshots
            .map((s) => {
              if (typeof s === 'string') return s;
              return s.url || '';
            })
            .filter((url) => url)
            .map((url) => this.convertImageUrl(url, 'screenshot'));
        }

        return result;
      });

          return results;
        } catch (error) {
          console.error('Error searching IGDB:', error);
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const statusText = error.response?.statusText || error.message;
            
            // For 429 errors, let retry logic handle it
            if (status === 429) {
              throw error; // Will be caught by retryRequest
            }
            
            throw new Error(`IGDB API error: ${status} ${statusText}`);
          }
          throw error;
        }
      });
    });
  }
}
