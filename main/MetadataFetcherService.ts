export interface GameMetadata {
  boxArtUrl: string;
  bannerUrl: string;
  screenshots?: string[];
}

export interface IGDBConfig {
  clientId: string;
  accessToken: string;
}

export class MetadataFetcherService {
  private useMock: boolean;
  private igdbConfig?: IGDBConfig;

  constructor(useMock: boolean = true, igdbConfig?: IGDBConfig) {
    this.useMock = useMock;
    this.igdbConfig = igdbConfig;
  }

  /**
   * Set IGDB API credentials
   */
  setIGDBConfig(config: IGDBConfig): void {
    this.igdbConfig = config;
    this.useMock = false;
  }

  /**
   * Enable or disable mock mode
   */
  setMockMode(enabled: boolean): void {
    this.useMock = enabled;
  }

  /**
   * Fetch game artwork using Steam CDN (for Steam games) or fallback
   */
  private async fetchSteamArtwork(appId: string): Promise<GameMetadata> {
    try {
      // Try Steam CDN first
      const boxArtUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
      const bannerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
      
      // Verify images exist by checking if they load
      const boxArtResponse = await fetch(boxArtUrl, { method: 'HEAD' });
      const bannerResponse = await fetch(bannerUrl, { method: 'HEAD' });
      
      if (boxArtResponse.ok || bannerResponse.ok) {
        return {
          boxArtUrl: boxArtResponse.ok ? boxArtUrl : bannerUrl,
          bannerUrl: bannerResponse.ok ? bannerUrl : boxArtUrl,
        };
      }
    } catch (error) {
      console.warn('Steam CDN fetch failed:', error);
    }
    
    // Fallback to placeholder
    return {
      boxArtUrl: '',
      bannerUrl: '',
    };
  }

  /**
   * Fetch game artwork using mock (placeholder) method
   */
  private async fetchMockArtwork(title: string): Promise<GameMetadata> {
    // Return empty metadata - let the UI handle missing images
    return {
      boxArtUrl: '',
      bannerUrl: '',
    };
  }

  /**
   * Fetch game artwork using IGDB API
   */
  private async fetchIGDBArtwork(title: string): Promise<GameMetadata> {
    if (!this.igdbConfig) {
      throw new Error('IGDB credentials not configured');
    }

    const { clientId, accessToken } = this.igdbConfig;

    try {
      // Search for the game by name
      const searchResponse = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search: title,
          fields: 'id,name,cover,screenshots',
          limit: 1,
        }),
      });

      if (!searchResponse.ok) {
        throw new Error(`IGDB API error: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const games = await searchResponse.json() as Array<{ id: number; name: string; cover?: number; screenshots?: number[] }>;

      if (!games || games.length === 0) {
        // Fallback to mock if no results found
        return this.fetchMockArtwork(title);
      }

      const game = games[0];
      const coverId = game.cover;
      const screenshotIds = game.screenshots || [];

      // Fetch cover image URL
      let boxArtUrl = '';
      let bannerUrl = '';

      if (coverId) {
        const coverResponse = await fetch('https://api.igdb.com/v4/covers', {
          method: 'POST',
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids: [coverId],
            fields: 'image_id',
          }),
        });

        if (coverResponse.ok) {
          const covers = await coverResponse.json() as Array<{ image_id: string }>;
          if (covers && covers.length > 0 && covers[0].image_id) {
            // IGDB image URLs format: https://images.igdb.com/igdb/image/upload/t_{size}/{image_id}.jpg
            const imageId = covers[0].image_id;
            // Use t_cover_big for box art (264x374) and t_1080p for banner
            boxArtUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
            bannerUrl = `https://images.igdb.com/igdb/image/upload/t_1080p/${imageId}.jpg`;
          }
        }
      }

      // Fetch screenshot URLs
      const screenshots: string[] = [];
      if (screenshotIds.length > 0) {
        const screenshotResponse = await fetch('https://api.igdb.com/v4/screenshots', {
          method: 'POST',
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ids: screenshotIds.slice(0, 5), // Limit to 5 screenshots
            fields: 'image_id',
          }),
        });

        if (screenshotResponse.ok) {
          const screenshotData = await screenshotResponse.json() as Array<{ image_id: string }>;
          screenshots.push(
            ...screenshotData
              .filter((s) => s.image_id)
              .map((s) => 
                `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`
              )
          );
        }
      }

      // If no cover found, fallback to mock
      if (!boxArtUrl) {
        return this.fetchMockArtwork(title);
      }

      return {
        boxArtUrl,
        bannerUrl: bannerUrl || boxArtUrl, // Use box art as fallback for banner
        screenshots: screenshots.length > 0 ? screenshots : undefined,
      };
    } catch (error) {
      console.error('Error fetching IGDB artwork:', error);
      // Fallback to mock on error
      return this.fetchMockArtwork(title);
    }
  }

  /**
   * Search for game artwork by title
   * Returns box art URL and banner URL
   */
  async searchArtwork(title: string, steamAppId?: string): Promise<GameMetadata> {
    // If we have a Steam App ID, try Steam CDN first
    if (steamAppId) {
      const steamMetadata = await this.fetchSteamArtwork(steamAppId);
      if (steamMetadata.boxArtUrl || steamMetadata.bannerUrl) {
        return steamMetadata;
      }
    }
    
    // Try IGDB if configured
    if (!this.useMock && this.igdbConfig) {
      try {
        return await this.fetchIGDBArtwork(title);
      } catch (error) {
        console.warn('IGDB fetch failed, falling back:', error);
      }
    }
    
    // Fallback to mock/placeholder
    return this.fetchMockArtwork(title);
  }
}
