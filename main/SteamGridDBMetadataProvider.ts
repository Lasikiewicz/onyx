import { SteamGridDBService, SteamGridDBGame, SteamGridDBImage } from './SteamGridDBService.js';
import { MetadataProvider, GameSearchResult, GameArtwork } from './MetadataProvider.js';

/**
 * SteamGridDB Metadata Provider
 * Provides high-quality artwork from SteamGridDB
 */
export class SteamGridDBMetadataProvider implements MetadataProvider {
  readonly name = 'steamgriddb';
  private steamGridDBService: SteamGridDBService | null = null;

  constructor(steamGridDBService: SteamGridDBService | null) {
    this.steamGridDBService = steamGridDBService;
  }

  isAvailable(): boolean {
    return this.steamGridDBService !== null;
  }

  async search(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
    if (!this.steamGridDBService) {
      return [];
    }

    try {
      const games = await this.steamGridDBService.searchGame(title);
      return games.map((game) => ({
        id: `steamgriddb-${game.id}`,
        title: game.name,
        source: this.name,
        externalId: game.id,
        steamAppId: game.steam_app_id?.toString(),
      }));
    } catch (error) {
      console.error('SteamGridDB search error:', error);
      return [];
    }
  }

  async getDescription(id: string): Promise<import('./MetadataProvider.js').GameDescription | null> {
    // SteamGridDB doesn't provide descriptions/metadata
    // Return null to indicate this provider doesn't support descriptions
    return null;
  }

  async getArtwork(id: string, steamAppId?: string): Promise<GameArtwork | null> {
    if (!this.steamGridDBService) {
      return null;
    }

    try {
      // Extract SteamGridDB game ID
      const gameId = parseInt(id.replace('steamgriddb-', ''), 10);
      if (isNaN(gameId)) {
        return null;
      }

      // Fetch all artwork types in parallel
      const [verticalGrids, heroes, logos] = await Promise.all([
        this.steamGridDBService.getVerticalGrids(gameId),
        this.steamGridDBService.getHeroes(gameId),
        this.steamGridDBService.getLogos(gameId),
      ]);

      // Filter and sort images by score (highest first), excluding NSFW/humor/epilepsy
      const filterImage = (img: SteamGridDBImage) => !img.nsfw && !img.humor && !img.epilepsy;
      
      const bestVertical = verticalGrids
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];
      
      const bestHero = heroes
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];
      
      const bestLogo = logos
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];

      return {
        boxArtUrl: bestVertical?.url,
        bannerUrl: bestHero?.url,
        logoUrl: bestLogo?.url,
        heroUrl: bestHero?.url,
        boxArtResolution: bestVertical ? { width: bestVertical.width, height: bestVertical.height } : undefined,
        bannerResolution: bestHero ? { width: bestHero.width, height: bestHero.height } : undefined,
        logoResolution: bestLogo ? { width: bestLogo.width, height: bestLogo.height } : undefined,
        heroResolution: bestHero ? { width: bestHero.width, height: bestHero.height } : undefined,
      };
    } catch (error) {
      console.error('SteamGridDB getArtwork error:', error);
      return null;
    }
  }
}
