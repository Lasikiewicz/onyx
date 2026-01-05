import { IGDBService, IGDBGameResult } from './IGDBService.js';
import { MetadataProvider, GameSearchResult, GameDescription, GameArtwork } from './MetadataProvider.js';

/**
 * IGDB Metadata Provider
 * Provides descriptions, metadata, and artwork from IGDB
 */
export class IGDBMetadataProvider implements MetadataProvider {
  readonly name = 'igdb';
  private igdbService: IGDBService | null = null;

  constructor(igdbService: IGDBService | null) {
    this.igdbService = igdbService;
  }

  isAvailable(): boolean {
    return this.igdbService !== null;
  }

  async search(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
    if (!this.igdbService) {
      return [];
    }

    try {
      const results = await this.igdbService.searchGame(title);
      return results.map((result) => ({
        id: `igdb-${result.id}`,
        title: result.name,
        source: this.name,
        externalId: result.id,
      }));
    } catch (error) {
      console.error('IGDB search error:', error);
      return [];
    }
  }

  async getDescription(id: string): Promise<GameDescription | null> {
    if (!this.igdbService) {
      return null;
    }

    try {
      // Extract IGDB game ID from provider ID
      const gameId = parseInt(id.replace('igdb-', ''), 10);
      if (isNaN(gameId)) {
        return null;
      }

      // Search for the game - IGDB searchGame can handle ID-based queries
      // We'll search with a unique identifier to get the specific game
      const results = await this.igdbService.searchGame(`id:${gameId}`);
      if (results.length === 0) {
        // Try searching by the ID directly as a fallback
        const allResults = await this.igdbService.searchGame(String(gameId));
        if (allResults.length === 0) {
          return null;
        }
        const result = allResults.find(r => r.id === gameId) || allResults[0];
        return {
          description: result.summary,
          releaseDate: result.releaseDate ? new Date(result.releaseDate * 1000).toISOString() : undefined,
          genres: result.genres,
          ageRating: result.ageRating,
          rating: result.rating,
          platforms: result.platform ? [result.platform] : undefined,
          categories: result.categories,
        };
      }

      const result = results[0];
      return {
        description: result.summary,
        releaseDate: result.releaseDate ? new Date(result.releaseDate * 1000).toISOString() : undefined,
        genres: result.genres,
        ageRating: result.ageRating,
        rating: result.rating,
        platforms: result.platform ? [result.platform] : undefined,
        categories: result.categories,
      };
    } catch (error) {
      console.error('IGDB getDescription error:', error);
      return null;
    }
  }

  async getArtwork(id: string, steamAppId?: string): Promise<GameArtwork | null> {
    if (!this.igdbService) {
      return null;
    }

    try {
      // Extract IGDB game ID
      const gameId = parseInt(id.replace('igdb-', ''), 10);
      if (isNaN(gameId)) {
        return null;
      }

      // Search for the game to get cover and screenshot info
      let results = await this.igdbService.searchGame(`id:${gameId}`);
      if (results.length === 0) {
        // Fallback: search by ID as string
        const allResults = await this.igdbService.searchGame(String(gameId));
        results = allResults.filter(r => r.id === gameId);
        if (results.length === 0) {
          return null;
        }
      }

      const result = results[0];
      
      return {
        boxArtUrl: result.coverUrl,
        bannerUrl: result.coverUrl, // IGDB uses same cover for banner
        screenshots: result.screenshotUrls,
        // IGDB cover_big is typically 264x374
        boxArtResolution: result.coverUrl ? { width: 264, height: 374 } : undefined,
      };
    } catch (error) {
      console.error('IGDB getArtwork error:', error);
      return null;
    }
  }
}
