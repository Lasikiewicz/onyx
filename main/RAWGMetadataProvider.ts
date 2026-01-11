import { RAWGService, RAWGGame } from './RAWGService.js';
import { MetadataProvider, GameSearchResult, GameDescription, GameArtwork } from './MetadataProvider.js';

/**
 * RAWG.io Metadata Provider
 * Provides comprehensive text metadata from RAWG.io
 * RAWG.io is excellent for text metadata - descriptions, genres, ratings, etc.
 */
export class RAWGMetadataProvider implements MetadataProvider {
  readonly name = 'rawg';
  private rawgService: RAWGService | null = null;

  constructor(rawgService: RAWGService | null) {
    this.rawgService = rawgService;
  }

  isAvailable(): boolean {
    return this.rawgService !== null;
  }

  async search(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
    if (!this.rawgService) {
      return [];
    }

    try {
      const results = await this.rawgService.searchGame(title);
      return results.map((game) => ({
        id: `rawg-${game.id}`,
        title: game.name,
        source: this.name,
        externalId: game.id,
      }));
    } catch (error: any) {
      // If authentication fails, disable RAWG service
      if (error?.message?.includes('Invalid RAWG API key') || error?.message?.includes('API key')) {
        console.error('RAWG authentication failed. Disabling RAWG provider:', error.message);
        this.rawgService = null;
      } else {
        console.error('RAWG search error:', error);
      }
      return [];
    }
  }

  async getDescription(id: string): Promise<GameDescription | null> {
    if (!this.rawgService) {
      return null;
    }

    try {
      // Extract RAWG game ID from provider ID
      const gameId = parseInt(id.replace('rawg-', ''), 10);
      if (isNaN(gameId)) {
        return null;
      }

      const game = await this.rawgService.getGameDetails(gameId);
      if (!game) {
        return null;
      }

      // Extract metadata from RAWG game object
      const description: GameDescription = {};

      // Description/Summary
      if (game.description) {
        description.description = game.description;
      }
      if (game.description_raw) {
        description.summary = game.description_raw;
      }

      // Release date
      if (game.released) {
        try {
          const date = new Date(game.released);
          if (!isNaN(date.getTime())) {
            description.releaseDate = date.toISOString().split('T')[0];
          }
        } catch (err) {
          console.warn(`[RAWG] Could not parse release date: ${game.released}`);
        }
      }

      // Genres
      if (game.genres && Array.isArray(game.genres)) {
        description.genres = game.genres.map((g) => g.name).filter(Boolean);
      }

      // Developers
      if (game.developers && Array.isArray(game.developers)) {
        description.developers = game.developers.map((d) => d.name).filter(Boolean);
      }

      // Publishers
      if (game.publishers && Array.isArray(game.publishers)) {
        description.publishers = game.publishers.map((p) => p.name).filter(Boolean);
      }

      // Age rating (ESRB)
      if (game.esrb_rating) {
        description.ageRating = game.esrb_rating.name;
      }

      // Rating (Metacritic or RAWG rating)
      if (game.metacritic !== undefined && game.metacritic !== null) {
        description.rating = game.metacritic;
      } else if (game.rating !== undefined && game.rating !== null) {
        // RAWG rating is typically 0-5, convert to 0-100 scale
        description.rating = game.rating * 20;
      }

      // Platforms
      if (game.platforms && Array.isArray(game.platforms)) {
        description.platforms = game.platforms
          .map((p) => p.platform.name)
          .filter(Boolean)
          .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      }

      // Categories/Tags
      if (game.tags && Array.isArray(game.tags)) {
        description.categories = game.tags.map((t) => t.name).filter(Boolean);
      }

      return Object.keys(description).length > 0 ? description : null;
    } catch (error: any) {
      // If authentication fails, disable RAWG service
      if (error?.message?.includes('Invalid RAWG API key') || error?.message?.includes('API key')) {
        console.error('RAWG authentication failed. Disabling RAWG provider:', error.message);
        this.rawgService = null;
      } else {
        console.error('RAWG getDescription error:', error);
      }
      return null;
    }
  }

  async getArtwork(id: string, steamAppId?: string): Promise<GameArtwork | null> {
    if (!this.rawgService) {
      return null;
    }

    try {
      // Extract RAWG game ID
      const gameId = parseInt(id.replace('rawg-', ''), 10);
      if (isNaN(gameId)) {
        return null;
      }

      const game = await this.rawgService.getGameDetails(gameId);
      if (!game) {
        return null;
      }

      const artwork: GameArtwork = {};

      // RAWG provides background_image which can be used as banner/hero
      if (game.background_image) {
        artwork.bannerUrl = game.background_image;
        artwork.heroUrl = game.background_image;
        // RAWG background images are typically 1920x1080 or similar
        artwork.bannerResolution = { width: 1920, height: 1080 };
        artwork.heroResolution = { width: 1920, height: 1080 };
      }

      // Additional background image
      if (game.background_image_additional) {
        artwork.heroUrl = game.background_image_additional;
      }

      // Screenshots
      if (game.screenshots && Array.isArray(game.screenshots)) {
        artwork.screenshots = game.screenshots.map((s) => s.image).filter(Boolean);
      }

      // Note: RAWG doesn't typically provide box art or logos
      // Box art would need to come from other sources

      return Object.keys(artwork).length > 0 ? artwork : null;
    } catch (error: any) {
      // If authentication fails, disable RAWG service
      if (error?.message?.includes('Invalid RAWG API key') || error?.message?.includes('API key')) {
        console.error('RAWG authentication failed. Disabling RAWG provider:', error.message);
        this.rawgService = null;
      } else {
        console.error('RAWG getArtwork error:', error);
      }
      return null;
    }
  }
}
