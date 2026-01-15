import { MetadataProvider, GameSearchResult, GameDescription, GameArtwork, GameInstallInfo } from "./MetadataProvider.js";
import { IGDBMetadataProvider } from "./IGDBMetadataProvider.js";
import { SteamMetadataProvider } from "./SteamMetadataProvider.js";
import { RAWGMetadataProvider } from "./RAWGMetadataProvider.js";
import { SteamGridDBMetadataProvider } from "./SteamGridDBMetadataProvider.js";
import { IGDBService } from "./IGDBService.js";
import { SteamService } from "./SteamService.js";
import { RAWGService } from "./RAWGService.js";
import { SteamGridDBService } from "./SteamGridDBService.js";
import { getRateLimitCoordinator } from "./RateLimitCoordinator.js";
import { getMetadataCache } from "./MetadataCache.js";
import { getMetadataValidator } from "./MetadataValidator.js";
import { withRetry } from "./RetryUtils.js";
import { ScannedGameResult } from "./ImportService.js";
import { getGameMatcher } from "./GameMatcher.js";

export interface GameMetadata {
  boxArtUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  heroUrl?: string;
  iconUrl?: string;
  screenshots?: string[];
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
  installPath?: string;
  installSize?: number;
  executablePath?: string;
  boxArtResolution?: { width: number; height: number };
  bannerResolution?: { width: number; height: number };
  logoResolution?: { width: number; height: number };
  heroResolution?: { width: number; height: number };
  iconResolution?: { width: number; height: number };
}

export interface IGDBConfig {
  clientId: string;
  accessToken: string;
}

/**
 * MetadataFetcherService using Provider pattern
 * 
 * METADATA STRATEGY - PLAYNITE APPROACH:
 * ========================================
 * Priority 1: Official Store APIs
 * - Steam Store API for Steam games
 * 
 * Priority 2: IGDB fallback for everything else
 * - Epic Games Store (no public API → use IGDB)
 * - GOG (no official API → use IGDB)
 * - Xbox/Microsoft Store (complex API → use IGDB)
 * - Ubisoft Connect (no public API → use IGDB)
 * - Other platforms (use IGDB)
 * 
 * WHY THIS APPROACH (like Playnite)?
 * - Official stores provide best data when available (Steam)
 * - IGDB covers ALL platforms when official APIs don't exist
 * - Avoids complex authentication/API implementations
 * - IGDB is free, well-documented, and comprehensive
 * - Most game launchers use this exact strategy
 */
export class MetadataFetcherService {
  private providers: MetadataProvider[] = [];
  private igdbProvider?: IGDBMetadataProvider;
  private steamProvider?: SteamMetadataProvider;
  private rawgProvider?: RAWGMetadataProvider;
  private steamGridDBProvider?: SteamGridDBMetadataProvider;

  constructor(
    igdbService?: IGDBService | null,
    steamService?: SteamService | null,
    rawgService?: RAWGService | null,
    steamGridDBService?: SteamGridDBService | null
  ) {
    if (igdbService) {
      this.igdbProvider = new IGDBMetadataProvider(igdbService);
      this.providers.push(this.igdbProvider);
    }

    if (steamService) {
      this.steamProvider = new SteamMetadataProvider(steamService);
      this.providers.push(this.steamProvider);
    }

    if (rawgService) {
      this.rawgProvider = new RAWGMetadataProvider(rawgService);
      this.providers.push(this.rawgProvider);
    }

    if (steamGridDBService) {
      this.steamGridDBProvider = new SteamGridDBMetadataProvider(steamGridDBService);
      this.providers.push(this.steamGridDBProvider);
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
    } else if (this.igdbProvider) {
      this.providers = this.providers.filter(p => p !== this.igdbProvider);
      this.igdbProvider = undefined;
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
    } else if (this.steamProvider) {
      this.providers = this.providers.filter(p => p !== this.steamProvider);
      this.steamProvider = undefined;
    }
  }

  /**
   * Set RAWG service
   */
  setRAWGService(rawgService: RAWGService | null): void {
    if (rawgService) {
      this.rawgProvider = new RAWGMetadataProvider(rawgService);
      if (!this.providers.includes(this.rawgProvider)) {
        this.providers.push(this.rawgProvider);
      }
    } else if (this.rawgProvider) {
      this.providers = this.providers.filter(p => p !== this.rawgProvider);
      this.rawgProvider = undefined;
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
   * Merge artwork from multiple sources, prioritizing Official Store → IGDB → RAWG
   */
  private mergeArtwork(artworkArray: Array<{ artwork: GameArtwork | null; source: string }>): GameArtwork {
    const merged: GameArtwork = {};

    const getSourcePriority = (source: string): number => {
      // Priority 1: Official stores (when available)
      if (source === "steam") return 4;
      // Priority 2: IGDB (fallback for all non-Steam platforms)
      if (source === "igdb") return 3;
      // Priority 3: RAWG (additional fallback)
      if (source === "rawg") return 2;
      // Other sources
      return 1;
    };

    const sortByPriority = (items: Array<{ url: string; resolution?: { width: number; height: number }; source: string }>) =>
      items.sort((a, b) => {
        const priorityDiff = getSourcePriority(b.source) - getSourcePriority(a.source);
        if (priorityDiff !== 0) return priorityDiff;
        return this.getResolutionScore(b.resolution) - this.getResolutionScore(a.resolution);
      });

    const boxArts = sortByPriority(
      artworkArray
        .filter(item => item.artwork?.boxArtUrl)
        .map(item => ({ url: item.artwork!.boxArtUrl!, resolution: item.artwork!.boxArtResolution, source: item.source }))
    );
    if (boxArts.length > 0) {
      merged.boxArtUrl = boxArts[0].url;
      merged.boxArtResolution = boxArts[0].resolution;
    }

    const banners = sortByPriority(
      artworkArray
        .filter(item => item.artwork?.bannerUrl)
        .map(item => ({ url: item.artwork!.bannerUrl!, resolution: item.artwork!.bannerResolution, source: item.source }))
    );
    if (banners.length > 0) {
      merged.bannerUrl = banners[0].url;
      merged.bannerResolution = banners[0].resolution;
    }

    const logos = sortByPriority(
      artworkArray
        .filter(item => item.artwork?.logoUrl)
        .map(item => ({ url: item.artwork!.logoUrl!, resolution: item.artwork!.logoResolution, source: item.source }))
    );
    if (logos.length > 0) {
      merged.logoUrl = logos[0].url;
      merged.logoResolution = logos[0].resolution;
    }

    const icons = sortByPriority(
      artworkArray
        .filter(item => item.artwork?.iconUrl)
        .map(item => ({ url: item.artwork!.iconUrl!, resolution: item.artwork!.iconResolution, source: item.source }))
    );
    if (icons.length > 0) {
      merged.iconUrl = icons[0].url;
      merged.iconResolution = icons[0].resolution;
    }

    const heroes = sortByPriority(
      artworkArray
        .filter(item => item.artwork?.heroUrl)
        .map(item => ({ url: item.artwork!.heroUrl!, resolution: item.artwork!.heroResolution, source: item.source }))
    );
    if (heroes.length > 0) {
      merged.heroUrl = heroes[0].url;
      merged.heroResolution = heroes[0].resolution;
    }

    const allScreenshots = artworkArray
      .filter(item => item.artwork?.screenshots && item.artwork.screenshots.length > 0)
      .map(item => ({ screenshots: item.artwork!.screenshots!, source: item.source }))
      .sort((a, b) => getSourcePriority(b.source) - getSourcePriority(a.source));

    if (allScreenshots.length > 0) {
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
   * Merge descriptions from multiple sources (PEGI-only age ratings)
   */
  private mergeDescriptions(descriptions: (GameDescription | null)[], steamAppId?: string): GameDescription {
    const merged: GameDescription = {};

    const firstDesc = descriptions.find(d => d !== null);
    if (firstDesc) {
      Object.assign(merged, firstDesc);
      if (merged.ageRating) {
        const ageRatingLower = merged.ageRating.toLowerCase();
        if (!ageRatingLower.includes("pegi")) {
          delete merged.ageRating;
        }
      }
    }

    return merged;
  }

  /**
   * Merge install info from multiple sources
   */
  private mergeInstallInfo(installInfoArray: (GameInstallInfo | null)[]): GameInstallInfo | null {
    return installInfoArray.find(info => info !== null) || null;
  }

  /**
   * Search for games - DISABLED for official-store-only approach
   * Official stores (Steam, Epic, GOG) don't need search - we already have their IDs from game scanning
   * This method returns empty array to prevent any third-party searches
   */
  async searchGames(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
    // Official stores only - no search needed
    // We already have Steam App IDs, Epic IDs, GOG IDs, etc. from game scanning
    console.log(`[searchGames] Search disabled - official stores only (title: "${title}", steamAppId: ${steamAppId})`);
    return [];
  }

  /**
   * Match a scanned game - DISABLED for official-store-only approach
   * Official stores provide accurate data directly via platform IDs (Steam App ID, Epic ID, etc.)
   */
  async searchAndMatchGame(
    scannedGame: ScannedGameResult,
    searchQuery?: string
  ): Promise<{ match: GameSearchResult | null; confidence: number; reasons: string[]; allResults: GameSearchResult[] }> {
    // Official stores only - no matching needed
    // We use platform IDs directly (Steam App ID, Epic ID, GOG ID, etc.)
    console.log(`[searchAndMatchGame] Matching disabled - using official store ID for "${scannedGame.title}"`);
    return { match: null, confidence: 0, reasons: ["official-store-only"], allResults: [] };
  }

  /**
   * Strip demo-related suffixes from game title for better metadata matching
   */
  private stripDemoSuffix(title: string): string {
    // Common demo suffixes to remove (case-insensitive)
    const demoPatterns = [
      /\s+demo$/i,
      /\s+\(demo\)$/i,
      /\s+\[demo\]$/i,
      /\s+-\s+demo$/i,
      /\s+prologue\s+demo$/i,
      /\s+demo\s+version$/i,
      /\s+trial$/i,
      /\s+\(trial\)$/i,
      /\s+beta$/i,
      /\s+\(beta\)$/i,
      /\s+playtest$/i,
      /\s+\(playtest\)$/i,
    ];

    let cleanedTitle = title;
    for (const pattern of demoPatterns) {
      cleanedTitle = cleanedTitle.replace(pattern, '');
    }

    return cleanedTitle.trim();
  }

  /**
   * Get complete game metadata from official store ONLY (Steam, Epic, GOG, etc.)
   * No search needed - we already have platform IDs from game scanning
   */
  async searchArtwork(title: string, steamAppId?: string): Promise<GameMetadata> {
    console.log(`[MetadataFetcher.searchArtwork] Starting for "${title}" (steamAppId: ${steamAppId})`);
    
    // Official stores only - no search needed
    if (!steamAppId) {
      console.log(`[MetadataFetcher.searchArtwork] No official store ID available for "${title}" - skipping metadata`);
      return this.getEmptyMetadata();
    }

    // Use Steam App ID directly - no search needed
    const result = await this.fetchCompleteMetadata(title, null, steamAppId);
    console.log(`[MetadataFetcher.searchArtwork] Complete metadata result for "${title}":`, {
      boxArtUrl: result.boxArtUrl ? 'present' : 'missing',
      logoUrl: result.logoUrl ? 'present' : 'missing',
      bannerUrl: result.bannerUrl ? 'present' : 'missing',
    });
    return result;
  }

  /**
   * Fetch complete metadata (artwork + description) with caching/validation
   */
  async fetchCompleteMetadata(
    gameTitle: string,
    matchedGame?: GameSearchResult | null,
    steamAppId?: string
  ): Promise<GameMetadata> {
    const rateLimiter = getRateLimitCoordinator();
    const cache = getMetadataCache();
    const validator = getMetadataValidator();

    const effectiveMatch: GameSearchResult = matchedGame || {
      id: steamAppId ? `steam-${steamAppId}` : gameTitle,
      title: gameTitle,
      source: steamAppId ? "steam" : "unknown",
      steamAppId,
    };

    const cacheKey = cache.generateKey(gameTitle, steamAppId || effectiveMatch.steamAppId);
    const cachedMetadata = cache.get(cacheKey);
    if (cachedMetadata && validator.validateMetadata(cachedMetadata, effectiveMatch)) {
      console.log(`[MetadataFetcher] Using cached metadata for ${gameTitle}`);
      return cachedMetadata;
    }

    const artworkMetadata = await rateLimiter.queueRequest("artwork", async () =>
      withRetry(() => this.fetchArtworkForGame(effectiveMatch, steamAppId), { maxRetries: 3, delay: 1000 })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    const textMetadata = await rateLimiter.queueRequest("description", async () =>
      withRetry(() => this.fetchDescriptionForGame(effectiveMatch, steamAppId), { maxRetries: 3, delay: 1000 })
    );

    const mergedMetadata: GameMetadata = { ...artworkMetadata, ...textMetadata };

    if (!validator.validateMetadata(mergedMetadata, effectiveMatch)) {
      console.warn(`[MetadataFetcher] Metadata validation failed for ${gameTitle}`);
    }

    cache.set(cacheKey, mergedMetadata);
    return mergedMetadata;
  }

  /**
   * Fetch artwork for a matched game (Playnite-style)
   * Priority 1: Official Store API (Steam) - try searching by title for non-Steam games
   * Priority 2: IGDB fallback
   */
  private async fetchArtworkForGame(
    matchedGame: GameSearchResult,
    steamAppId?: string
  ): Promise<GameMetadata> {
    console.log(`[fetchArtworkForGame] Fetching artwork for "${matchedGame.title}" (source: ${matchedGame.source}, id: ${matchedGame.id}, steamAppId: ${steamAppId})`);
    const artworkPromises: Array<{ promise: Promise<GameArtwork | null>; source: string }> = [];

    // Helper to check if steamAppId is a valid numeric Steam ID (not Epic/Xbox/GOG identifier)
    const isValidSteamAppId = (id?: string): boolean => {
      if (!id) return false;
      // Valid Steam IDs are numeric strings
      return /^\d+$/.test(id);
    };

    let resolvedSteamAppId: string | undefined = steamAppId;

    // PRIORITY 1: Official Store - Steam for Steam games
    if (isValidSteamAppId(steamAppId) && this.steamProvider?.isAvailable()) {
      console.log(`[fetchArtworkForGame] PRIORITY 1: Fetching from Official Store (Steam) for app ${steamAppId}`);
      artworkPromises.push({ 
        promise: this.steamProvider.getArtwork(`steam-${steamAppId}`, steamAppId), 
        source: "steam" 
      });
    }
    // For non-Steam games, try searching Steam by title first
    else if (!isValidSteamAppId(steamAppId) && this.steamProvider?.isAvailable()) {
      console.log(`[fetchArtworkForGame] PRIORITY 1B: Non-Steam game, searching Steam by title for "${matchedGame.title}"`);
      try {
        const steamResults = await this.steamProvider.searchGames(matchedGame.title);
        if (steamResults.length > 0) {
          const bestSteamMatch = steamResults[0];
          resolvedSteamAppId = bestSteamMatch.steamAppId;
          console.log(`[fetchArtworkForGame] Found on Steam! App ID: ${resolvedSteamAppId}, Title: ${bestSteamMatch.title}`);
          artworkPromises.push({
            promise: this.steamProvider.getArtwork(`steam-${resolvedSteamAppId}`, resolvedSteamAppId),
            source: "steam"
          });
        } else {
          console.log(`[fetchArtworkForGame] Not found on Steam, will try IGDB fallback`);
        }
      } catch (error) {
        console.warn(`[fetchArtworkForGame] Steam search failed for "${matchedGame.title}":`, error);
      }
    }

    // PRIORITY 2: IGDB fallback for games not found on Steam
    if (artworkPromises.length === 0 && this.igdbProvider?.isAvailable()) {
      console.log(`[fetchArtworkForGame] PRIORITY 2: Using IGDB fallback for "${matchedGame.title}"`);
      // Try to find the game in IGDB by searching
      try {
        const igdbResults = await this.igdbProvider.search(matchedGame.title);
        if (igdbResults.length > 0) {
          const bestMatch = igdbResults[0]; // Use first result
          artworkPromises.push({
            promise: this.igdbProvider.getArtwork(bestMatch.id),
            source: "igdb"
          });
        }
      } catch (error) {
        console.warn(`[fetchArtworkForGame] IGDB search failed for "${matchedGame.title}":`, error);
      }
    }

    if (artworkPromises.length === 0) {
      console.warn(`[fetchArtworkForGame] No metadata provider available for "${matchedGame.title}"`);
      return this.getEmptyMetadata();
    }

    const artworkResults = await Promise.allSettled(artworkPromises.map(item => item.promise));
    const artworkWithSources = artworkResults
      .map((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          console.log(`[fetchArtworkForGame] Got artwork from ${artworkPromises[index]?.source}: ${result.value.boxArtUrl ? 'boxart' : 'no boxart'}, full result: ${JSON.stringify(result.value)}`);
          return { artwork: result.value, source: artworkPromises[index]?.source || "unknown" };
        } else if (result.status === "fulfilled") {
          console.log(`[fetchArtworkForGame] Artwork source ${artworkPromises[index]?.source} returned null`);
        } else {
          console.log(`[fetchArtworkForGame] Artwork source ${artworkPromises[index]?.source} failed:`, result.reason);
        }
        return null;
      })
      .filter((item): item is { artwork: GameArtwork; source: string } => item !== null);

    const mergedArtwork = artworkWithSources.length > 0 ? this.mergeArtwork(artworkWithSources) : ({} as GameArtwork);

    console.log(`[fetchArtworkForGame] Final artwork for "${matchedGame.title}": boxArtUrl=${mergedArtwork.boxArtUrl ? 'present' : 'missing'}, logoUrl=${mergedArtwork.logoUrl ? 'present' : 'missing'}`);

    return {
      boxArtUrl: mergedArtwork.boxArtUrl || "",
      bannerUrl: mergedArtwork.bannerUrl || mergedArtwork.heroUrl || mergedArtwork.boxArtUrl || "",
      logoUrl: mergedArtwork.logoUrl,
      heroUrl: mergedArtwork.heroUrl,
      iconUrl: mergedArtwork.iconUrl,
      screenshots: mergedArtwork.screenshots,
    };
  }

  /**
   * Fetch description for a matched game (Playnite-style)
   * Priority 1: Official Store API (Steam) - try searching by title for non-Steam games
   * Priority 2: IGDB fallback
   */
  private async fetchDescriptionForGame(
    matchedGame: GameSearchResult,
    steamAppId?: string
  ): Promise<Partial<GameMetadata>> {
    let steamAppIdToUse = steamAppId || matchedGame.steamAppId;
    const descriptions: (GameDescription | null)[] = [];

    // Helper to check if steamAppId is a valid numeric Steam ID (not Epic/Xbox/GOG identifier)
    const isValidSteamAppId = (id?: string): boolean => {
      if (!id) return false;
      // Valid Steam IDs are numeric strings
      return /^\d+$/.test(id);
    };

    // PRIORITY 1: Official Store - Steam for Steam games
    if (isValidSteamAppId(steamAppIdToUse) && this.steamProvider?.isAvailable()) {
      try {
        console.log(`[fetchDescriptionForGame] PRIORITY 1: Fetching from Official Store (Steam) for app ${steamAppIdToUse}`);
        const steamDesc = await this.steamProvider.getDescription(`steam-${steamAppIdToUse}`);
        if (steamDesc) {
          descriptions.push(steamDesc);
        }
      } catch (err: any) {
        if (err?.status === 403 || err?.status === 429) {
          console.warn("[MetadataFetcher] Steam rate limited, metadata unavailable");
        } else {
          console.warn("[MetadataFetcher] Steam error:", err);
        }
      }
    }
    // For non-Steam games, try searching Steam by title first
    else if (!isValidSteamAppId(steamAppIdToUse) && this.steamProvider?.isAvailable()) {
      console.log(`[fetchDescriptionForGame] PRIORITY 1B: Non-Steam game, searching Steam by title for "${matchedGame.title}"`);
      try {
        const steamResults = await this.steamProvider.searchGames(matchedGame.title);
        if (steamResults.length > 0) {
          const bestSteamMatch = steamResults[0];
          steamAppIdToUse = bestSteamMatch.steamAppId;
          console.log(`[fetchDescriptionForGame] Found on Steam! App ID: ${steamAppIdToUse}, Title: ${bestSteamMatch.title}`);
          const steamDesc = await this.steamProvider.getDescription(`steam-${steamAppIdToUse}`);
          if (steamDesc) {
            descriptions.push(steamDesc);
          }
        } else {
          console.log(`[fetchDescriptionForGame] Not found on Steam, will try IGDB fallback`);
        }
      } catch (error) {
        console.warn(`[fetchDescriptionForGame] Steam search failed for "${matchedGame.title}":`, error);
      }
    }

    // PRIORITY 2: IGDB fallback for games not found on Steam
    if (descriptions.length === 0 && this.igdbProvider?.isAvailable()) {
      try {
        console.log(`[fetchDescriptionForGame] PRIORITY 2: Using IGDB fallback for "${matchedGame.title}"`);
        const igdbResults = await this.igdbProvider.search(matchedGame.title);
        if (igdbResults.length > 0) {
          const bestMatch = igdbResults[0];
          const igdbDesc = await this.igdbProvider.getDescription(bestMatch.id);
          if (igdbDesc) {
            descriptions.push(igdbDesc);
          }
        }
      } catch (error) {
        console.warn(`[fetchDescriptionForGame] IGDB search failed for "${matchedGame.title}":`, error);
      }
    }

    const mergedDescription = this.mergeDescriptions(descriptions, steamAppIdToUse);
    return {
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
    };
  }

  /**
   * Get metadata only (descriptions, genres, etc.) without fetching artwork/images
   * Uses Official Store ONLY (Steam for Steam games, etc.)
   */
  async searchMetadataOnly(providerId: string, providerSource: string, steamAppId?: string, gameTitle?: string): Promise<Partial<GameMetadata>> {
    const descriptionPromises: Promise<GameDescription | null>[] = [];

    // OFFICIAL STORE ONLY - Steam for Steam games
    if (steamAppId && this.steamProvider?.isAvailable()) {
      console.log(`[searchMetadataOnly] Fetching from Steam for app ${steamAppId}`);
      descriptionPromises.push(this.steamProvider.getDescription(`steam-${steamAppId}`));
    }
    // TODO: Add Epic, GOG, Xbox providers here when implemented
    // if (epicGameId && this.epicProvider?.isAvailable()) { ... }
    // if (gogGameId && this.gogProvider?.isAvailable()) { ... }

    const descriptionResults = await Promise.all(descriptionPromises);
    const mergedDescription = this.mergeDescriptions(descriptionResults, steamAppId);

    return {
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
    };
  }

  /**
   * Get empty metadata structure
   */
  private getEmptyMetadata(): GameMetadata {
    return {
      boxArtUrl: "",
      bannerUrl: "",
      logoUrl: "",
      heroUrl: "",
    };
  }

  // Legacy no-op methods
  setIGDBConfig(_config: IGDBConfig): void {
    console.warn("setIGDBConfig is deprecated. Use setIGDBService instead.");
  }

  setSteamGridDBService(steamGridDBService: SteamGridDBService | null): void {
    if (steamGridDBService) {
      this.steamGridDBProvider = new SteamGridDBMetadataProvider(steamGridDBService);
      if (!this.providers.includes(this.steamGridDBProvider)) {
        this.providers.push(this.steamGridDBProvider);
      }
    } else if (this.steamGridDBProvider) {
      this.providers = this.providers.filter(p => p !== this.steamGridDBProvider);
      this.steamGridDBProvider = undefined;
    }
  }

  setSteamGridDBApiKey(_apiKey: string): void {
    console.warn("setSteamGridDBApiKey is deprecated. Use setSteamGridDBService instead.");
  }

  setMockMode(_enabled: boolean): void {
    console.warn("setMockMode is deprecated. Providers handle availability automatically.");
  }
}
