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
      // If we have a Steam App ID, try to find the specific game via external_games lookup first
      if (steamAppId) {
        console.log(`[IGDBMetadataProvider] Attempting verification via Steam App ID: ${steamAppId}`);
        const exactMatch = await this.igdbService.getGameBySteamAppId(steamAppId);

        if (exactMatch) {
          console.log(`[IGDBMetadataProvider] Found exact match via Steam ID: "${exactMatch.name}" (IGDB ID: ${exactMatch.id})`);
          return [{
            id: `igdb-${exactMatch.id}`,
            title: exactMatch.name,
            source: this.name,
            externalId: exactMatch.id,
            steamAppId: exactMatch.steamAppId,
          }];
        } else {
          console.log(`[IGDBMetadataProvider] No match found for Steam ID ${steamAppId}, skipping fuzzy search to avoid incorrect matches.`);
          return [];
        }
      }

      const results = await this.igdbService.searchGame(title);
      return results.map((result) => ({
        id: `igdb-${result.id}`,
        title: result.name,
        source: this.name,
        externalId: result.id,
        steamAppId: result.steamAppId,
      }));
    } catch (error: any) {
      // If authentication fails, disable IGDB service
      if (error?.message?.includes('authenticate') || error?.message?.includes('invalid')) {
        console.error('IGDB authentication failed. Disabling IGDB provider:', error.message);
        this.igdbService = null;
      } else {
        console.error('IGDB search error:', error);
      }
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

      // Search for the game by ID (IGDBService.searchGame handles numeric strings as 'where id = ...')
      const results = await this.igdbService.searchGame(String(gameId));
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
    } catch (error: any) {
      // If authentication fails, disable IGDB service
      if (error?.message?.includes('authenticate') || error?.message?.includes('invalid')) {
        console.error('IGDB authentication failed. Disabling IGDB provider:', error.message);
        this.igdbService = null;
      } else {
        console.error('IGDB getDescription error:', error);
      }
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
        console.log(`[IGDBProvider.getArtwork] Invalid IGDB ID format: ${id}`);
        return null;
      }

      // Search for the game by numeric ID (searchGame now handles numeric IDs correctly)
      const results = await this.igdbService.searchGame(String(gameId));
      if (results.length === 0) {
        console.log(`[IGDBProvider.getArtwork] No results found for game ID: ${gameId}`);
        return null;
      }

      const result = results[0];
      console.log(`[IGDBProvider.getArtwork] Found game "${result.name}", coverUrl: ${result.coverUrl || 'MISSING'}, logoUrl: ${result.logoUrl || 'MISSING'}`);

      return {
        boxArtUrl: result.coverUrl,
        bannerUrl: result.coverUrl, // IGDB uses same cover for banner
        logoUrl: result.logoUrl, // Now includes logos from IGDB's game_logos endpoint
        screenshots: result.screenshotUrls,
        // IGDB cover_big is typically 264x374
        boxArtResolution: result.coverUrl ? { width: 264, height: 374 } : undefined,
      };
    } catch (error: any) {
      // If authentication fails, disable IGDB service
      if (error?.message?.includes('authenticate') || error?.message?.includes('invalid')) {
        console.error('IGDB authentication failed. Disabling IGDB provider:', error.message);
        this.igdbService = null;
      } else {
        console.error('IGDB getArtwork error:', error);
      }
      return null;
    }
  }
}
