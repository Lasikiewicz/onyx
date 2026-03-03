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

  async validateCredentials(): Promise<boolean> {
    if (!this.steamGridDBService) return false;
    return this.steamGridDBService.validateCredentials();
  }

  async search(title: string, steamAppId?: string, linksOnly: boolean = false): Promise<GameSearchResult[]> {
    if (!this.steamGridDBService) {
      return [];
    }

    try {
      const games = await this.steamGridDBService.searchGame(title, steamAppId);
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

  async getDescription(id: string, linksOnly: boolean = false): Promise<import('./MetadataProvider.js').GameDescription | null> {
    // SteamGridDB doesn't provide descriptions/metadata
    // Return null to indicate this provider doesn't support descriptions
    return null;
  }

  async getArtwork(id: string, steamAppId?: string, preferAnimatedBoxart: boolean = true, preferAnimatedBanner: boolean = true): Promise<GameArtwork | null> {
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
      const [capsules, heroes, logos, icons] = await Promise.all([
        this.steamGridDBService.getCapsules(gameId),
        this.steamGridDBService.getHeroes(gameId),
        this.steamGridDBService.getLogos(gameId),
        this.steamGridDBService.getIcons(gameId),
      ]);

      console.log(`[SteamGridDB] Fetched artwork for game ${gameId}:`, {
        capsules: capsules.length,
        heroes: heroes.length,
        logos: logos.length,
      });

      // Filter and sort images by score (highest first), excluding NSFW/humor/epilepsy
      // and globally excluding WEBP assets.
      const isWebp = (img: SteamGridDBImage) => img.mime === 'image/webp' || /\.webp(\?|$)/i.test(img.url || '');
      const filterImage = (img: SteamGridDBImage) => !img.nsfw && !img.humor && !img.epilepsy && !isWebp(img);

      const validGrids = capsules.filter(filterImage).sort((a, b) => b.score - a.score);

      // Vertical grids (boxart) are typically 600x900 or 342x482 (width < height)
      const verticalGrids = validGrids.filter(img => img.width < img.height)
        .sort((a, b) => {
          if (preferAnimatedBoxart) {
            const aAnimated = a.mime === 'image/gif' ? 1 : 0;
            const bAnimated = b.mime === 'image/gif' ? 1 : 0;
            if (aAnimated !== bAnimated) return bAnimated - aAnimated; // animated first
          } else {
            const aAnimated = a.mime === 'image/gif' ? 1 : 0;
            const bAnimated = b.mime === 'image/gif' ? 1 : 0;
            if (aAnimated !== bAnimated) return aAnimated - bAnimated; // static first
          }
          return b.score - a.score;
        });

      // Horizontal grids (alternative banners) are typically 460x215 or 920x430 (width > height)
      // Prefer banners without text overlaid (alternate/no_logo styles) — they look cleaner as backgrounds
      const horizontalGrids = validGrids.filter(img => img.width > img.height)
        .sort((a, b) => {
          const noTextStyles = ['alternate', 'no_logo'];
          const aNoText = a.style && noTextStyles.includes(a.style) ? 1 : 0;
          const bNoText = b.style && noTextStyles.includes(b.style) ? 1 : 0;
          if (aNoText !== bNoText) return bNoText - aNoText; // no-text first
          return b.score - a.score; // then by score
        });

      const bestCapsule = verticalGrids[0] || validGrids[0];
      const bestAlternativeBanner = horizontalGrids[0]; // Kept just in case we still want horizontal grids somewhere, but we won't use it for alternativeBannerUrl

      // Heroes: prefer animated (if option active), then no text/logo overlaid (alternate style = no text for heroes)
      const sortedHeroes = heroes
        .filter(filterImage)
        .sort((a, b) => {
          if (preferAnimatedBanner) {
            const aAnimated = a.mime === 'image/gif' ? 1 : 0;
            const bAnimated = b.mime === 'image/gif' ? 1 : 0;
            if (aAnimated !== bAnimated) return bAnimated - aAnimated; // animated first
          } else {
            const aAnimated = a.mime === 'image/gif' ? 1 : 0;
            const bAnimated = b.mime === 'image/gif' ? 1 : 0;
            if (aAnimated !== bAnimated) return aAnimated - bAnimated; // static first
          }

          const noTextStyles = ['alternate', 'blurred'];
          const aNoText = a.style && noTextStyles.includes(a.style) ? 1 : 0;
          const bNoText = b.style && noTextStyles.includes(b.style) ? 1 : 0;
          if (aNoText !== bNoText) return bNoText - aNoText;

          return b.score - a.score;
        });

      const bestHero = sortedHeroes[0];

      const bestLogo = logos
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];

      const bestIcon = icons
        .filter(filterImage)
        .sort((a, b) => b.score - a.score)[0];

      const result = {
        boxArtUrl: bestCapsule?.url,
        bannerUrl: bestHero?.url,
        alternativeBannerUrl: sortedHeroes.length > 1 ? sortedHeroes[1].url : bestHero?.url,
        logoUrl: bestLogo?.url,
        heroUrl: bestHero?.url,
        iconUrl: bestIcon?.url,
        boxArtResolution: bestCapsule ? { width: bestCapsule.width, height: bestCapsule.height } : undefined,
        bannerResolution: bestHero ? { width: bestHero.width, height: bestHero.height } : undefined,
        logoResolution: bestLogo ? { width: bestLogo.width, height: bestLogo.height } : undefined,
        heroResolution: bestHero ? { width: bestHero.width, height: bestHero.height } : undefined,
        iconResolution: bestIcon ? { width: bestIcon.width, height: bestIcon.height } : undefined,
      };

      console.log(`[SteamGridDB] Returning artwork for game ${gameId}:`, {
        boxArtUrl: result.boxArtUrl ? 'present' : 'missing',
        bannerUrl: result.bannerUrl ? 'present' : 'missing',
        logoUrl: result.logoUrl ? 'present' : 'missing',
      });

      return result;
    } catch (error) {
      // Don't log as error - 404s are expected for games without artwork
      // Return empty artwork object instead of null so other providers can still be tried
      console.warn(`[SteamGridDB] getArtwork error for game ${id}:`, error instanceof Error ? error.message : error);
      return {
        boxArtUrl: undefined,
        bannerUrl: undefined,
        logoUrl: undefined,
        heroUrl: undefined,
      };
    }
  }
}
