import { MetadataProvider, GameSearchResult, GameDescription, GameArtwork, GameInstallInfo } from './MetadataProvider.js';
import { IGDBMetadataProvider } from './IGDBMetadataProvider.js';
import { SteamGridDBMetadataProvider } from './SteamGridDBMetadataProvider.js';
import { SteamMetadataProvider } from './SteamMetadataProvider.js';
import { IGDBService } from './IGDBService.js';
import { SteamGridDBService } from './SteamGridDBService.js';
import { SteamService } from './SteamService.js';

export interface GameMetadata {
  boxArtUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  heroUrl?: string;
  screenshots?: string[];
  // Text metadata
  description?: string;
  summary?: string;
  releaseDate?: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  ageRating?: string;
  rating?: number;
  platforms?: string[];
  categories?: string[];
  // Install info
  installPath?: string;
  installSize?: number;
  executablePath?: string;
}

export interface IGDBConfig {
  clientId: string;
  accessToken: string;
}

/**
 * MetadataFetcherService using Provider pattern
 * Aggregates data from multiple sources in parallel
 */
export class MetadataFetcherService {
  private providers: MetadataProvider[] = [];
  private igdbProvider?: IGDBMetadataProvider;
  private steamGridDBProvider?: SteamGridDBMetadataProvider;
  private steamProvider?: SteamMetadataProvider;

  constructor(
    igdbService?: IGDBService | null,
    steamGridDBService?: SteamGridDBService | null,
    steamService?: SteamService | null
  ) {
    // Initialize providers
    if (igdbService) {
      this.igdbProvider = new IGDBMetadataProvider(igdbService);
      this.providers.push(this.igdbProvider);
    }

    if (steamGridDBService) {
      this.steamGridDBProvider = new SteamGridDBMetadataProvider(steamGridDBService);
      this.providers.push(this.steamGridDBProvider);
    }

    if (steamService) {
      this.steamProvider = new SteamMetadataProvider(steamService);
      this.providers.push(this.steamProvider);
    }
  }

  /**
   * Set IGDB service
   */
  setIGDBService(igdbService: IGDBService | null): void {
    if (igdbService) {
      this.igdbProvider = new IGDBMetadataProvider(igdbService);
      if (!this.providers.includes(this.igdbProvider)) {
        this.providers.push(this.igdbProvider);
      }
    } else {
      if (this.igdbProvider) {
        this.providers = this.providers.filter(p => p !== this.igdbProvider);
        this.igdbProvider = undefined;
      }
    }
  }

  /**
   * Set SteamGridDB service
   */
  setSteamGridDBService(steamGridDBService: SteamGridDBService | null): void {
    if (steamGridDBService) {
      this.steamGridDBProvider = new SteamGridDBMetadataProvider(steamGridDBService);
      if (!this.providers.includes(this.steamGridDBProvider)) {
        this.providers.push(this.steamGridDBProvider);
      }
    } else {
      if (this.steamGridDBProvider) {
        this.providers = this.providers.filter(p => p !== this.steamGridDBProvider);
        this.steamGridDBProvider = undefined;
      }
    }
  }

  /**
   * Set Steam service
   */
  setSteamService(steamService: SteamService | null): void {
    if (steamService) {
      this.steamProvider = new SteamMetadataProvider(steamService);
      if (!this.providers.includes(this.steamProvider)) {
        this.providers.push(this.steamProvider);
      }
    } else {
      if (this.steamProvider) {
        this.providers = this.providers.filter(p => p !== this.steamProvider);
        this.steamProvider = undefined;
      }
    }
  }

  /**
   * Calculate resolution score (width * height) for comparison
   */
  private getResolutionScore(resolution?: { width: number; height: number }): number {
    if (!resolution) return 0;
    return resolution.width * resolution.height;
  }

  /**
   * Merge artwork from multiple sources, prioritizing SteamGridDB (default for images)
   * Falls back to highest resolution from other sources if SteamGridDB doesn't have the image
   */
  private mergeArtwork(artworkArray: Array<{ artwork: GameArtwork | null; source: string }>): GameArtwork {
    const merged: GameArtwork = {};

    // Helper to get priority score (SteamGridDB = highest priority)
    const getSourcePriority = (source: string): number => {
      if (source === 'steamgriddb') return 3;
      if (source === 'steam') return 2;
      if (source === 'igdb') return 1;
      return 0;
    };

    // Merge box art - prioritize SteamGridDB, then highest resolution
    const boxArts = artworkArray
      .filter(item => item.artwork?.boxArtUrl)
      .map(item => ({
        url: item.artwork!.boxArtUrl!,
        resolution: item.artwork!.boxArtResolution,
        source: item.source,
      }))
      .sort((a, b) => {
        const priorityDiff = getSourcePriority(b.source) - getSourcePriority(a.source);
        if (priorityDiff !== 0) return priorityDiff;
        // If same priority, use resolution
        return this.getResolutionScore(b.resolution) - this.getResolutionScore(a.resolution);
      });

    if (boxArts.length > 0) {
      merged.boxArtUrl = boxArts[0].url;
      merged.boxArtResolution = boxArts[0].resolution;
    }

    // Merge banner - prioritize SteamGridDB, then highest resolution
    const banners = artworkArray
      .filter(item => item.artwork?.bannerUrl)
      .map(item => ({
        url: item.artwork!.bannerUrl!,
        resolution: item.artwork!.bannerResolution,
        source: item.source,
      }))
      .sort((a, b) => {
        const priorityDiff = getSourcePriority(b.source) - getSourcePriority(a.source);
        if (priorityDiff !== 0) return priorityDiff;
        return this.getResolutionScore(b.resolution) - this.getResolutionScore(a.resolution);
      });

    if (banners.length > 0) {
      merged.bannerUrl = banners[0].url;
      merged.bannerResolution = banners[0].resolution;
    }

    // Merge logo - prioritize SteamGridDB, then highest resolution
    const logos = artworkArray
      .filter(item => item.artwork?.logoUrl)
      .map(item => ({
        url: item.artwork!.logoUrl!,
        resolution: item.artwork!.logoResolution,
        source: item.source,
      }))
      .sort((a, b) => {
        const priorityDiff = getSourcePriority(b.source) - getSourcePriority(a.source);
        if (priorityDiff !== 0) return priorityDiff;
        return this.getResolutionScore(b.resolution) - this.getResolutionScore(a.resolution);
      });

    if (logos.length > 0) {
      merged.logoUrl = logos[0].url;
      merged.logoResolution = logos[0].resolution;
    }

    // Merge hero - prioritize SteamGridDB, then highest resolution
    const heroes = artworkArray
      .filter(item => item.artwork?.heroUrl)
      .map(item => ({
        url: item.artwork!.heroUrl!,
        resolution: item.artwork!.heroResolution,
        source: item.source,
      }))
      .sort((a, b) => {
        const priorityDiff = getSourcePriority(b.source) - getSourcePriority(a.source);
        if (priorityDiff !== 0) return priorityDiff;
        return this.getResolutionScore(b.resolution) - this.getResolutionScore(a.resolution);
      });

    if (heroes.length > 0) {
      merged.heroUrl = heroes[0].url;
      merged.heroResolution = heroes[0].resolution;
    }

    // Merge screenshots (combine all, remove duplicates, prioritize SteamGridDB)
    const allScreenshots = artworkArray
      .filter(item => item.artwork?.screenshots && item.artwork.screenshots.length > 0)
      .map(item => ({
        screenshots: item.artwork!.screenshots!,
        source: item.source,
      }))
      .sort((a, b) => getSourcePriority(b.source) - getSourcePriority(a.source));
    
    if (allScreenshots.length > 0) {
      // Combine screenshots, prioritizing SteamGridDB first
      const uniqueScreenshots = new Set<string>();
      for (const item of allScreenshots) {
        for (const screenshot of item.screenshots) {
          uniqueScreenshots.add(screenshot);
        }
      }
      merged.screenshots = Array.from(uniqueScreenshots);
    }

    return merged;
  }

  /**
   * Merge descriptions from multiple sources (IGDB takes priority)
   */
  private mergeDescriptions(descriptions: (GameDescription | null)[]): GameDescription {
    const merged: GameDescription = {};

    // Find first non-null description (prioritize IGDB)
    const igdbDesc = descriptions.find(d => d !== null);
    if (igdbDesc) {
      Object.assign(merged, igdbDesc);
    }

    return merged;
  }

  /**
   * Merge install info from multiple sources
   */
  private mergeInstallInfo(installInfoArray: (GameInstallInfo | null)[]): GameInstallInfo | null {
    // Find first non-null install info
    return installInfoArray.find(info => info !== null) || null;
  }

  /**
   * Search for games across all providers in parallel
   */
  async searchGames(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
    const searchPromises = this.providers
      .filter(p => p.isAvailable())
      .map(provider => provider.search(title, steamAppId).catch(error => {
        console.error(`Error searching ${provider.name}:`, error);
        return [];
      }));

    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  /**
   * Get complete game metadata by aggregating from multiple providers
   * Merging strategy:
   * - Descriptions/Metadata: IGDB (primary)
   * - Artwork: SteamGridDB (default/primary), fallback to Steam/IGDB by resolution
   * - Install Info: Steam (primary)
   */
  async searchArtwork(title: string, steamAppId?: string): Promise<GameMetadata> {
    // Step 1: Search across all providers in parallel
    const searchResults = await this.searchGames(title, steamAppId);

    if (searchResults.length === 0) {
      return this.getEmptyMetadata();
    }

    // Step 2: Find best matching game ID for each provider
    // Prioritize SteamGridDB for artwork, IGDB for descriptions, Steam for install info
    const steamGridDBResult = searchResults.find(r => r.source === 'steamgriddb');
    const igdbResult = searchResults.find(r => r.source === 'igdb');
    const steamResult = searchResults.find(r => r.source === 'steam' && r.steamAppId === steamAppId) 
      || searchResults.find(r => r.source === 'steam');

    // Step 3: Fetch data from providers in parallel
    const artworkPromises: Array<{ promise: Promise<GameArtwork | null>; source: string }> = [];
    const descriptionPromises: Promise<GameDescription | null>[] = [];
    const installInfoPromises: Promise<GameInstallInfo | null>[] = [];

    // Fetch artwork from all available providers
    // Prioritize SteamGridDB first (default for images)
    if (steamGridDBResult && this.steamGridDBProvider?.isAvailable()) {
      artworkPromises.push({
        promise: this.steamGridDBProvider.getArtwork(steamGridDBResult.id, steamAppId),
        source: 'steamgriddb',
      });
    }
    if (steamResult && this.steamProvider?.isAvailable()) {
      artworkPromises.push({
        promise: this.steamProvider.getArtwork(steamResult.id, steamAppId),
        source: 'steam',
      });
    }
    if (igdbResult && this.igdbProvider?.isAvailable()) {
      artworkPromises.push({
        promise: this.igdbProvider.getArtwork(igdbResult.id, steamAppId),
        source: 'igdb',
      });
    }

    // Fetch descriptions from IGDB (primary source)
    if (igdbResult && this.igdbProvider?.isAvailable()) {
      descriptionPromises.push(
        this.igdbProvider.getDescription(igdbResult.id)
      );
    }

    // Fetch install info from Steam
    if (steamResult && this.steamProvider?.isAvailable() && this.steamProvider.getInstallInfo) {
      installInfoPromises.push(
        this.steamProvider.getInstallInfo(steamResult.id)
      );
    }

    // Execute all queries in parallel
    const [artworkResults, descriptionResults, installInfoResults] = await Promise.all([
      Promise.all(artworkPromises.map(item => item.promise)),
      Promise.all(descriptionPromises),
      Promise.all(installInfoPromises),
    ]);

    // Step 4: Merge results (with source tracking for prioritization)
    const artworkWithSources = artworkResults.map((artwork, index) => ({
      artwork,
      source: artworkPromises[index]?.source || 'unknown',
    }));
    const mergedArtwork = this.mergeArtwork(artworkWithSources);
    const mergedDescription = this.mergeDescriptions(descriptionResults);
    const mergedInstallInfo = this.mergeInstallInfo(installInfoResults);

    // Step 5: Combine into final metadata
    return {
      boxArtUrl: mergedArtwork.boxArtUrl || '',
      bannerUrl: mergedArtwork.bannerUrl || mergedArtwork.heroUrl || mergedArtwork.boxArtUrl || '',
      logoUrl: mergedArtwork.logoUrl,
      heroUrl: mergedArtwork.heroUrl || mergedArtwork.bannerUrl,
      screenshots: mergedArtwork.screenshots,
      // Text metadata from IGDB
      description: mergedDescription.description,
      summary: mergedDescription.summary,
      releaseDate: mergedDescription.releaseDate,
      genres: mergedDescription.genres,
      developers: mergedDescription.developers,
      publishers: mergedDescription.publishers,
      ageRating: mergedDescription.ageRating,
      rating: mergedDescription.rating,
      platforms: mergedDescription.platforms,
      categories: mergedDescription.categories,
      // Install info from Steam
      installPath: mergedInstallInfo?.installPath,
      installSize: mergedInstallInfo?.installSize,
      executablePath: mergedInstallInfo?.executablePath,
    };
  }

  /**
   * Get empty metadata structure
   */
  private getEmptyMetadata(): GameMetadata {
    return {
      boxArtUrl: '',
      bannerUrl: '',
      logoUrl: '',
      heroUrl: '',
    };
  }

  // Legacy methods for backward compatibility
  setIGDBConfig(config: IGDBConfig): void {
    // This method is kept for backward compatibility but doesn't do anything
    // IGDB service should be set via setIGDBService
    console.warn('setIGDBConfig is deprecated. Use setIGDBService instead.');
  }

  setSteamGridDBApiKey(apiKey: string): void {
    // This method is kept for backward compatibility but doesn't do anything
    // SteamGridDB service should be set via setSteamGridDBService
    console.warn('setSteamGridDBApiKey is deprecated. Use setSteamGridDBService instead.');
  }

  setMockMode(enabled: boolean): void {
    // This method is kept for backward compatibility but doesn't do anything
    console.warn('setMockMode is deprecated. Providers handle availability automatically.');
  }
}
