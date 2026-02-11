import { GiantBombService, GiantBombGameResult } from './GiantBombService.js';
import { MetadataProvider, GameSearchResult, GameDescription, GameArtwork } from './MetadataProvider.js';

/**
 * Giant Bomb Metadata Provider
 * Provides descriptions, metadata, and artwork from Giant Bomb
 */
export class GiantBombMetadataProvider implements MetadataProvider {
  readonly name = 'giantbomb';
  private giantBombService: GiantBombService | null = null;

  constructor(giantBombService: GiantBombService | null) {
    this.giantBombService = giantBombService;
  }

  isAvailable(): boolean {
    return this.giantBombService !== null;
  }

  async search(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
    if (!this.giantBombService) {
      return [];
    }

    try {
      const results = await this.giantBombService.searchGame(title);
      return results.map((result) => ({
        id: `giantbomb-${result.id}`,
        title: result.name,
        source: this.name,
        externalId: result.id,
        steamAppId, // Pass through if available
        boxArtUrl: result.coverUrl,
      }));
    } catch (error: any) {
      console.error('GiantBomb search error:', error);
      return [];
    }
  }

  async getDescription(id: string): Promise<GameDescription | null> {
    if (!this.giantBombService) {
      return null;
    }

    try {
      // Extract Giant Bomb game ID from provider ID
      const gameId = parseInt(id.replace('giantbomb-', ''), 10);
      if (isNaN(gameId)) {
        return null;
      }

      const result = await this.giantBombService.getGameDetails(gameId);
      if (!result) {
        return null;
      }

      return {
        description: result.summary,
        releaseDate: result.releaseDate,
        genres: result.genres,
        developers: result.developers,
        publishers: result.publishers,
        platforms: result.platforms,
      };
    } catch (error: any) {
      console.error('GiantBomb getDescription error:', error);
      return null;
    }
  }

  async getArtwork(id: string, steamAppId?: string): Promise<GameArtwork | null> {
    if (!this.giantBombService) {
      return null;
    }

    try {
      // Extract Giant Bomb game ID
      const gameId = parseInt(id.replace('giantbomb-', ''), 10);
      if (isNaN(gameId)) {
        console.log(`[GiantBombProvider.getArtwork] Invalid Giant Bomb ID format: ${id}`);
        return null;
      }

      const result = await this.giantBombService.getGameDetails(gameId);
      if (!result) {
        console.log(`[GiantBombProvider.getArtwork] No results found for game ID: ${gameId}`);
        return null;
      }

      console.log(`[GiantBombProvider.getArtwork] Found game "${result.name}", coverUrl: ${result.coverUrl || 'MISSING'}`);

      return {
        boxArtUrl: result.coverUrl,
        bannerUrl: result.coverUrl, // Use cover as banner
        screenshots: result.screenshotUrls,
        // Giant Bomb images are high quality
        boxArtResolution: result.coverUrl ? { width: 800, height: 1200 } : undefined, // Approximate for super_url
      };
    } catch (error: any) {
      console.error('GiantBomb getArtwork error:', error);
      return null;
    }
  }
}