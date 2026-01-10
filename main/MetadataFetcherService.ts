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
  private steamGridDBService?: SteamGridDBService | null;

  constructor(
    igdbService?: IGDBService | null,
    steamGridDBService?: SteamGridDBService | null,
    steamService?: SteamService | null
  ) {
    this.steamGridDBService = steamGridDBService;
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
   * If null is passed, IGDB provider will be completely removed and won't be used at all
   */
  setIGDBService(igdbService: IGDBService | null): void {
    if (igdbService) {
      this.igdbProvider = new IGDBMetadataProvider(igdbService);
      if (!this.providers.includes(this.igdbProvider)) {
        this.providers.push(this.igdbProvider);
      }
    } else {
      // Completely remove IGDB provider when service is not available
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
    this.steamGridDBService = steamGridDBService;
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
   * Get IGDB provider for external searches
   */
  getIGDBProvider(): IGDBMetadataProvider | undefined {
    return this.igdbProvider;
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

    // Helper to get priority score (Steam CDN = highest priority, then SteamGridDB, then IGDB)
    const getSourcePriority = (source: string): number => {
      if (source === 'steam') return 3;      // Steam CDN - highest priority
      if (source === 'steamgriddb') return 2; // SteamGridDB - second priority
      if (source === 'igdb') return 1;       // IGDB - lowest priority
      return 0;
    };

    // Merge box art - prioritize Steam CDN, then SteamGridDB, then IGDB, then highest resolution
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

    // Merge banner - prioritize Steam CDN, then SteamGridDB, then IGDB, then highest resolution
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
   * Merge descriptions from multiple sources (Steam takes priority when available, then IGDB)
   */
  private mergeDescriptions(descriptions: (GameDescription | null)[], steamAppId?: string): GameDescription {
    const merged: GameDescription = {};

    // When we have a Steam App ID, prioritize Steam Store API description
    // Steam descriptions are usually more accurate and up-to-date for Steam games
    // Otherwise, use the first available description (typically IGDB)
    const firstDesc = descriptions.find(d => d !== null);
    if (firstDesc) {
      Object.assign(merged, firstDesc);
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
    let searchResults = await this.searchGames(title, steamAppId);

    // For non-Steam games, if no results found, try searching IGDB directly
    if (!steamAppId && searchResults.length === 0 && this.igdbProvider?.isAvailable()) {
      console.log(`[MetadataFetcher] No results from initial search, trying IGDB directly for: ${title}`);
      try {
        const igdbResults = await this.igdbProvider.search(title, undefined);
        if (igdbResults.length > 0) {
          searchResults = igdbResults;
          console.log(`[MetadataFetcher] Found ${igdbResults.length} IGDB result(s) for: ${title}`);
        }
      } catch (error) {
        console.error(`[MetadataFetcher] Error searching IGDB directly:`, error);
      }
    }

    // Step 2: Find best matching game ID for each provider
    // Priority: SteamGridDB > IGDB > Steam
    let steamGridDBResult = searchResults.find(r => r.source === 'steamgriddb');
    let igdbResult = searchResults.find(r => r.source === 'igdb');
    const steamResult = searchResults.find(r => r.source === 'steam' && r.steamAppId === steamAppId) 
      || searchResults.find(r => r.source === 'steam');
    
    // IMPORTANT: If SteamGridDB result has a steamAppId, extract and use it
    // This allows games found via SteamGridDB to be treated as Steam games
    if (steamGridDBResult && steamGridDBResult.steamAppId && !steamAppId) {
      steamAppId = steamGridDBResult.steamAppId;
      console.log(`[MetadataFetcher] Extracted Steam App ID ${steamAppId} from SteamGridDB result for: ${title}`);
    }
    
    // FALLBACK: If no SteamGridDB result found but we have SteamGridDB service, try direct search
    // This handles cases where the game title doesn't match exactly in searchGames but exists in SteamGridDB
    if (!steamGridDBResult && this.steamGridDBProvider?.isAvailable() && this.steamGridDBService) {
      try {
        console.log(`[MetadataFetcher] No SteamGridDB match in search results, trying direct search for: ${title}`);
        const directSearchResults = await this.steamGridDBService.searchGame(title);
        if (directSearchResults.length > 0) {
          // Use the first/best match (usually sorted by relevance)
          const bestMatch = directSearchResults[0];
          steamGridDBResult = {
            id: `steamgriddb-${bestMatch.id}`,
            title: bestMatch.name,
            source: 'steamgriddb',
            externalId: bestMatch.id,
            steamAppId: bestMatch.steam_app_id?.toString(),
          };
          // Extract Steam App ID if available
          if (bestMatch.steam_app_id && !steamAppId) {
            steamAppId = bestMatch.steam_app_id.toString();
            console.log(`[MetadataFetcher] Extracted Steam App ID ${steamAppId} from SteamGridDB direct search for: ${title}`);
          }
          console.log(`[MetadataFetcher] Found SteamGridDB game via direct search: ${bestMatch.name} (ID: ${bestMatch.id})`);
        }
      } catch (error) {
        console.warn(`[MetadataFetcher] Direct SteamGridDB search failed for ${title}:`, error);
      }
    }
    
    // If still no results from any provider, return empty
    if (!steamGridDBResult && !igdbResult && !steamResult) {
      console.warn(`[MetadataFetcher] No search results found for: ${title}`);
      return this.getEmptyMetadata();
    }

    // Log what we found
    console.log(`[MetadataFetcher] Searching for: ${title}${steamAppId ? ` (Steam AppID: ${steamAppId})` : ''}`);
    console.log(`[MetadataFetcher] Results - SteamGridDB: ${steamGridDBResult ? `found (${steamGridDBResult.id})` : 'not found'}, IGDB: ${igdbResult ? `found (${igdbResult.id})` : 'not found'}, Steam: ${steamResult ? 'found' : 'not found'}`);

    // Step 3: Fetch data from providers in parallel
    const artworkPromises: Array<{ promise: Promise<GameArtwork | null>; source: string }> = [];
    const descriptionPromises: Promise<GameDescription | null>[] = [];
    const installInfoPromises: Promise<GameInstallInfo | null>[] = [];

    // Fetch artwork: Try multiple providers in parallel to ensure we get boxart
    // When steamAppId is available, prioritize Steam CDN first (official images)
    // Otherwise: SteamGridDB > IGDB > Steam
    const artworkPromisesOrdered: Array<{ promise: Promise<GameArtwork | null>; source: string }> = [];
    
    // PRIORITY 1: If we have a Steam App ID, fetch Steam CDN FIRST (official images)
    if (steamAppId && this.steamProvider?.isAvailable()) {
      // Construct a Steam game ID from the App ID
      const steamGameId = `steam-${steamAppId}`;
      console.log(`[MetadataFetcher] Trying Steam CDN provider FIRST for: ${title} (AppID: ${steamAppId})`);
      artworkPromisesOrdered.push({
        promise: this.steamProvider.getArtwork(steamGameId, steamAppId),
        source: 'steam',
      });
    }
    
    // PRIORITY 2: Try SteamGridDB (community images)
    if (steamGridDBResult && this.steamGridDBProvider?.isAvailable()) {
      console.log(`[MetadataFetcher] Trying SteamGridDB provider for: ${title} (ID: ${steamGridDBResult.id})`);
      artworkPromisesOrdered.push({
        promise: this.steamGridDBProvider.getArtwork(steamGridDBResult.id, steamAppId),
        source: 'steamgriddb',
      });
    }
    
    // PRIORITY 3: Always try IGDB as fallback for boxart (especially if SteamGridDB has no boxart)
    if (igdbResult && this.igdbProvider?.isAvailable()) {
      console.log(`[MetadataFetcher] Trying IGDB provider for: ${title} (ID: ${igdbResult.id})`);
      artworkPromisesOrdered.push({
        promise: this.igdbProvider.getArtwork(igdbResult.id, steamAppId),
        source: 'igdb',
      });
    }
    
    // For Steam games without steamAppId in search results, also try Steam CDN as fallback
    // Steam CDN works for ALL Steam games (by App ID), not just installed ones
    if (!steamAppId && steamResult && this.steamProvider?.isAvailable()) {
      console.log(`[MetadataFetcher] Trying Steam CDN provider (from search result) for: ${title}`);
      artworkPromisesOrdered.push({
        promise: this.steamProvider.getArtwork(steamResult.id, steamResult.steamAppId),
        source: 'steam',
      });
    }
    
    // Use the ordered promises
    artworkPromises.push(...artworkPromisesOrdered);
    
    if (artworkPromises.length === 0) {
      console.warn(`[MetadataFetcher] Cannot fetch images for: ${title}`);
      if (!steamGridDBResult && !igdbResult) {
        console.warn(`[MetadataFetcher] - No search results found in SteamGridDB or IGDB`);
      }
      if (!this.steamGridDBProvider?.isAvailable() && !this.igdbProvider?.isAvailable()) {
        console.warn(`[MetadataFetcher] - No image providers available. Please configure SteamGridDB or IGDB credentials.`);
      }
    }

    // Fetch descriptions: Prioritize Steam Store API when we have a Steam App ID, then IGDB
    // Add Steam first (using unshift) so it's prioritized during merge
    if (steamAppId && this.steamProvider?.isAvailable()) {
      const steamGameId = `steam-${steamAppId}`;
      descriptionPromises.unshift(
        this.steamProvider.getDescription(steamGameId)
      );
    }
    
    // Also try IGDB as fallback or for non-Steam games
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
    
    // For single source (Steam or IGDB), use directly without merging
    let mergedArtwork: GameArtwork;
    if (artworkWithSources.length === 1 && artworkWithSources[0].artwork) {
      mergedArtwork = artworkWithSources[0].artwork;
      console.log(`[MetadataFetcher] Single source artwork for ${title}:`, {
        boxArtUrl: mergedArtwork.boxArtUrl ? 'present' : 'missing',
        bannerUrl: mergedArtwork.bannerUrl ? 'present' : 'missing',
        source: artworkWithSources[0].source,
      });
    } else if (artworkWithSources.length > 0) {
      mergedArtwork = this.mergeArtwork(artworkWithSources);
      console.log(`[MetadataFetcher] Merged artwork for ${title}:`, {
        boxArtUrl: mergedArtwork.boxArtUrl ? 'present' : 'missing',
        bannerUrl: mergedArtwork.bannerUrl ? 'present' : 'missing',
        sources: artworkWithSources.map(a => a.source),
      });
    } else {
      mergedArtwork = {};
      console.warn(`[MetadataFetcher] No artwork sources for ${title}`);
    }
    
    const mergedDescription = this.mergeDescriptions(descriptionResults, steamAppId);
    const mergedInstallInfo = this.mergeInstallInfo(installInfoResults);

    // Step 5: Combine into final metadata
    // Only include URLs if they're actually present (not empty strings)
    // Log the actual URLs for debugging
    if (mergedArtwork.boxArtUrl) {
      console.log(`[MetadataFetcher] boxArtUrl for ${title}: ${mergedArtwork.boxArtUrl.substring(0, 100)}...`);
    } else {
      console.warn(`[MetadataFetcher] No boxArtUrl for ${title}`);
    }
    
    return {
      boxArtUrl: mergedArtwork.boxArtUrl && mergedArtwork.boxArtUrl.trim() !== '' ? mergedArtwork.boxArtUrl : '',
      bannerUrl: (mergedArtwork.bannerUrl && mergedArtwork.bannerUrl.trim() !== '') 
        ? mergedArtwork.bannerUrl 
        : (mergedArtwork.heroUrl && mergedArtwork.heroUrl.trim() !== '')
          ? mergedArtwork.heroUrl
          : (mergedArtwork.boxArtUrl && mergedArtwork.boxArtUrl.trim() !== '')
            ? mergedArtwork.boxArtUrl
            : '',
      logoUrl: mergedArtwork.logoUrl && mergedArtwork.logoUrl.trim() !== '' ? mergedArtwork.logoUrl : undefined,
      heroUrl: mergedArtwork.heroUrl && mergedArtwork.heroUrl.trim() !== '' ? mergedArtwork.heroUrl : undefined,
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
