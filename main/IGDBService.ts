import axios, { AxiosInstance } from './axiosShim.js';

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
  artworks?: Array<{
    url?: string;
  } | string>; // Handle both object and string formats - promotional art
  game_logos?: Array<{
    image_id?: string;
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
  external_games?: Array<{
    category: number;
    uid: string;
    url?: string;
  }>;
  websites?: Array<{
    category: number;
    url: string;
    trusted: boolean;
  }>;
}

export interface IGDBGameResult {
  id: number;
  name: string;
  summary?: string;
  coverUrl?: string;
  screenshotUrls?: string[];
  artworkUrls?: string[];
  logoUrl?: string;
  rating?: number;
  releaseDate?: number;
  genres?: string[];
  platform?: string;
  ageRating?: string;
  categories?: string[];
  steamAppId?: string;
  links?: Array<{ name: string; url: string }>;
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
  private convertImageUrl(url: string, type: 'cover' | 'screenshot' | 'logo'): string {
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
    } else if (type === 'logo') {
      // For logos, use t_original or large size
      absoluteUrl = absoluteUrl.replace(/t_thumb/g, 't_original');
    }

    return absoluteUrl;
  }

  /**
   * Sanitize search query to remove special characters that might break IGDB search
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/[®™©]/g, '') // Remove trademark/copyright symbols
      .replace(/[:\-]/g, ' ') // Replace colons and hyphens with spaces
      .replace(/\s+/g, ' ')   // Collapse multiple spaces
      .trim();
  }

  /** IGDB website category enum → display name (covers all known categories so no link is dropped) */
  private static readonly WEBSITE_CATEGORY_MAP: Record<number, string> = {
    1: 'Official Website',
    2: 'Community Wiki',
    3: 'Wikipedia',
    4: 'Facebook',
    5: 'Twitter',
    6: 'Twitch',
    8: 'Instagram',
    9: 'YouTube',
    10: 'iPhone',
    11: 'iPad',
    12: 'Android',
    13: 'Steam',
    14: 'Subreddit',
    15: 'Itch.io',
    16: 'Epic',
    17: 'GOG',
    18: 'Discord',
    19: 'Google Play',
    20: 'Amazon Store',
    21: 'Xbox',
  };

  /** IGDB external_games category → store name */
  private static readonly EXTERNAL_GAME_CATEGORY_MAP: Record<number, { name: string; urlTemplate?: (uid: string) => string }> = {
    1: { name: 'Steam', urlTemplate: (uid) => `https://store.steampowered.com/app/${uid}` },
    5: { name: 'GOG', urlTemplate: (uid) => `https://www.gog.com/game/${uid}` },
    8: { name: 'PlayStation', urlTemplate: (uid) => `https://store.playstation.com/en-us/product/${uid}` },
    11: { name: 'Xbox', urlTemplate: (uid) => `https://www.microsoft.com/store/apps/${uid}` },
    26: { name: 'Epic', urlTemplate: (uid) => `https://store.epicgames.com/p/${uid}` },
  };

  /** Infer link name from URL when website category is unknown */
  private inferLinkNameFromUrl(url: string): string {
    const u = url.toLowerCase();
    if (u.includes('steam') || u.includes('steampowered')) return 'Steam';
    if (u.includes('epicgames') || u.includes('epicgames.com')) return 'Epic';
    if (u.includes('xbox') || u.includes('microsoft.com/store')) return 'Xbox';
    if (u.includes('playstation') || u.includes('store.playstation')) return 'PlayStation';
    if (u.includes('reddit')) return 'Subreddit';
    if (u.includes('discord')) return 'Discord';
    if (u.includes('wikipedia')) return 'Wikipedia';
    if (u.includes('fandom') || u.includes('wiki')) return 'Community Wiki';
    if (u.includes('youtube') || u.includes('youtu.be')) return 'YouTube';
    if (u.includes('twitch')) return 'Twitch';
    if (u.includes('twitter') || u.includes('x.com')) return 'Twitter';
    if (u.includes('facebook')) return 'Facebook';
    if (u.includes('instagram')) return 'Instagram';
    if (u.includes('gog.com')) return 'GOG';
    if (u.includes('amazon.')) return 'Amazon Store';
    return 'Official Website';
  }

  private buildLinksFromGame(game: IGDBGame): Array<{ name: string; url: string }> {
    const links: Array<{ name: string; url: string }> = [];

    if (game.websites) {
      for (const w of game.websites) {
        if (!w?.url) continue;
        const url = w.url.startsWith('http') ? w.url : `https://${w.url}`;
        let name = IGDBService.WEBSITE_CATEGORY_MAP[w.category] ?? this.inferLinkNameFromUrl(url);
        // Override misclassified store URLs (e.g. IGDB often tags Amazon as "Official Website")
        if (name === 'Official Website') name = this.inferLinkNameFromUrl(url);
        links.push({ name, url });
      }
    }

    if (game.external_games) {
      for (const ext of game.external_games) {
        const meta = IGDBService.EXTERNAL_GAME_CATEGORY_MAP[ext.category];
        const url = ext.url || (meta?.urlTemplate && ext.uid ? meta.urlTemplate(ext.uid) : null);
        const name = meta?.name ?? (ext.url ? this.inferLinkNameFromUrl(ext.url) : null);
        if (name && url) links.push({ name, url });
      }
    }

    // Dedupe by exact URL first
    const seenUrl = new Set<string>();
    const byUrl = links.filter((l) => {
      const key = l.url.toLowerCase().replace(/\/+$/, '');
      if (seenUrl.has(key)) return false;
      seenUrl.add(key);
      return true;
    });

    const linkOrder = [
      'Official Website', 'YouTube', 'Subreddit', 'Discord', 'Community Wiki', 'Wikipedia',
      'Facebook', 'Twitter', 'Twitch', 'Instagram', 'Steam', 'GOG', 'Epic', 'Itch.io', 'Xbox', 'PlayStation',
      'Google Play', 'Amazon Store', 'iPhone', 'iPad', 'Android'
    ];
    const orderIndex = new Map(linkOrder.map((name, i) => [name.toLowerCase(), i]));
    const seenType = new Set<string>();
    
    const filtered = byUrl.filter((l) => {
      const key = l.name.toLowerCase();
      if (seenType.has(key)) return false;
      seenType.add(key);
      return true;
    });
    
    filtered.sort((a, b) => {
      const ia = orderIndex.get(a.name.toLowerCase()) ?? 999;
      const ib = orderIndex.get(b.name.toLowerCase()) ?? 999;
      return ia - ib;
    });
    return filtered;
  }

  /**
   * Search for games using IGDB API with rate limiting and retry logic
   */
  async searchGame(query: string, linksOnly: boolean = false): Promise<IGDBGameResult[]> {
    return this.queueRequest(async () => {
      return this.retryRequest(async () => {
        try {
          const accessToken = await this.getAccessToken();

          // Build the query string with all required fields
          const fields = linksOnly
            ? 'id, name, websites.*, external_games.*'
            : 'id, name, summary, cover.url, screenshots.url, artworks.url, rating, first_release_date, genres.name, platforms.name, age_ratings, category, external_games.*, websites.*';

          // Check if query is a numeric ID (for direct game ID lookups)
          let queryBody: string;
          if (/^\d+$/.test(query)) {
            queryBody = `fields ${fields};
where id = ${query};
limit 1;`;
          } else {
            const sanitizedQuery = this.sanitizeQuery(query);
            queryBody = `fields ${fields};
search "${sanitizedQuery}";
limit 10;`;
          }

          console.log(`[IGDBService] Sending query to /games:`, queryBody);

          const response = await this.axiosInstance.post<IGDBGame[]>('/games', queryBody, {
            headers: {
              'Client-ID': this.clientId,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'text/plain',
            },
          });

          // Collect all age rating IDs for batch fetch (skip for linksOnly)
          const ageRatingMap: Map<number, { rating: number; category: number }> = new Map();
          if (!linksOnly) {
            const ageRatingIds: number[] = [];
            response.data.forEach((game) => {
              if (game.age_ratings) {
                game.age_ratings.forEach((ar) => {
                  if (typeof ar === 'number') ageRatingIds.push(ar);
                  else if (typeof ar === 'object' && ar !== null && 'id' in ar) ageRatingIds.push((ar as any).id);
                });
              }
            });

            if (ageRatingIds.length > 0) {
              try {
                const uniqueIds = [...new Set(ageRatingIds)];
                const ageRatingQuery = `fields rating, category; where id = (${uniqueIds.join(',')}); limit 50;`;
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
                ageRatingResponse.data.forEach((ar) => ageRatingMap.set(ar.id, { rating: ar.rating, category: ar.category }));
              } catch (error) {
                console.warn('Failed to fetch age rating details:', error);
              }
            }
          }

          // Transform results
          return response.data.map((game) => {
            const result: IGDBGameResult = {
              id: game.id,
              name: game.name,
              summary: game.summary,
              rating: game.rating,
              releaseDate: game.first_release_date,
              genres: game.genres?.map((g) => (typeof g === 'string' ? g : g.name || '')).filter(Boolean),
            };

            // Platforms
            if (game.platforms && game.platforms.length > 0) {
              const platformNames = game.platforms
                .map((p) => (typeof p === 'string' ? p : typeof p === 'object' && p !== null && 'name' in p ? p.name || '' : ''))
                .filter(Boolean);
              if (platformNames.length > 0) result.platform = platformNames.join(', ');
            }

            // Age Rating (PEGI Only)
            if (!linksOnly && game.age_ratings) {
              for (const ar of game.age_ratings) {
                const ageRatingId = typeof ar === 'number' ? ar : (ar as any).id;
                if (ageRatingId && ageRatingMap.has(ageRatingId)) {
                  const arData = ageRatingMap.get(ageRatingId)!;
                  if (arData.category === 2) { // 2 = PEGI
                    const pegiRatings: Record<number, string> = { 1: 'PEGI 3', 2: 'PEGI 7', 3: 'PEGI 12', 4: 'PEGI 16', 5: 'PEGI 18' };
                    result.ageRating = pegiRatings[arData.rating] || `PEGI ${arData.rating}`;
                    break;
                  }
                }
              }
            }

            // Category
            if (game.category !== undefined) {
              const categoryMap: Record<number, string> = { 0: 'Main Game', 1: 'DLC/Add-on', 2: 'Expansion', 3: 'Bundle', 4: 'Standalone Expansion', 5: 'Mod', 8: 'Remake', 9: 'Remaster' };
              const categoryName = categoryMap[game.category];
              if (categoryName) result.categories = [categoryName];
            }

            // Steam ID
            if (game.external_games) {
              const steamGame = game.external_games.find(eg => eg.category === 1);
              if (steamGame) result.steamAppId = steamGame.uid;
            }

            // Images
            if (game.cover) {
              const url = typeof game.cover === 'string' ? game.cover : game.cover.url;
              if (url) result.coverUrl = this.convertImageUrl(url, 'cover');
            }
            if (game.screenshots) {
              result.screenshotUrls = game.screenshots.map(s => typeof s === 'string' ? s : s.url || '').filter(Boolean).map(url => this.convertImageUrl(url, 'screenshot'));
            }

            // Links (The Core Task) - all IGDB website categories + external_games
            const links = this.buildLinksFromGame(game);
            if (links.length > 0) result.links = links;

            return result;
          });
        } catch (error: any) {
          console.error('[IGDBService] Error:', error);
          if (axios.isAxiosError(error) && error.response?.status === 429) throw error;
          return [];
        }
      });
    });
  }

  async fastSearchGame(query: string, linksOnly: boolean = false): Promise<IGDBGameResult[]> {
    try {
      const accessToken = await this.getAccessToken();
      const fields = linksOnly
        ? 'name, websites.*, external_games.*'
        : 'name, summary, cover.url, screenshots.url, artworks.url, rating, first_release_date, genres.name, platforms.name, age_ratings, category, external_games.*, websites.*';

      let queryBody: string;
      if (/^\d+$/.test(query)) {
        queryBody = `fields ${fields}; where id = ${query}; limit 1;`;
      } else {
        const sanitizedQuery = this.sanitizeQuery(query);
        queryBody = `fields ${fields}; search "${sanitizedQuery}"; limit 10;`;
      }

      const response = await this.axiosInstance.post<IGDBGame[]>('/games', queryBody, {
        headers: { 'Client-ID': this.clientId, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'text/plain' },
      });

      return response.data.map(game => {
        const result: IGDBGameResult = {
          id: game.id,
          name: game.name,
          summary: game.summary,
          rating: game.rating,
          releaseDate: game.first_release_date,
          genres: game.genres?.map(g => typeof g === 'string' ? g : g.name || '').filter(Boolean),
        };
        // Reuse mapping logic (simplified for fast search)
        if (game.cover) result.coverUrl = this.convertImageUrl(typeof game.cover === 'string' ? game.cover : game.cover.url || '', 'cover');

        const links = this.buildLinksFromGame(game);
        if (links.length > 0) result.links = links;
        return result;
      });
    } catch (error: any) {
      console.error('[IGDBService.fastSearchGame] Error:', error);
      return [];
    }
  }

  async getGameBySteamAppId(steamAppId: string, linksOnly: boolean = false): Promise<IGDBGameResult | null> {
    return this.queueRequest(async () => {
      return this.retryRequest(async () => {
        try {
          const accessToken = await this.getAccessToken();
          const query = `fields game; where uid = "${steamAppId}" & category = 1; limit 1;`;
          const response = await this.axiosInstance.post<Array<{ game: number }>>('/external_games', query, {
            headers: { 'Client-ID': this.clientId, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'text/plain' },
          });

          if (response.data.length === 0 || !response.data[0].game) return null;
          const results = await this.searchGame(String(response.data[0].game), linksOnly);
          return results.length > 0 ? results[0] : null;
        } catch (error: any) {
          console.error('[IGDBService] Steam ID lookup error:', error);
          if (axios.isAxiosError(error) && error.response?.status === 429) throw error;
          return null;
        }
      });
    });
  }
}
