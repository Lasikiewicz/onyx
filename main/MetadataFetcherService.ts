import { MetadataProvider, GameSearchResult, GameDescription, GameArtwork, GameInstallInfo } from "./MetadataProvider.js";
import { IGDBMetadataProvider } from "./IGDBMetadataProvider.js";
import { SteamGridDBMetadataProvider } from "./SteamGridDBMetadataProvider.js";
import { SteamMetadataProvider } from "./SteamMetadataProvider.js";
import { RAWGMetadataProvider } from "./RAWGMetadataProvider.js";
import { IGDBService } from "./IGDBService.js";
import { SteamGridDBService } from "./SteamGridDBService.js";
import { SteamService } from "./SteamService.js";
import { RAWGService } from "./RAWGService.js";
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
 * Aggregates data from multiple sources in parallel
 */
export class MetadataFetcherService {
  private providers: MetadataProvider[] = [];
  private igdbProvider?: IGDBMetadataProvider;
  private steamGridDBProvider?: SteamGridDBMetadataProvider;
  private steamProvider?: SteamMetadataProvider;
  private rawgProvider?: RAWGMetadataProvider;
  private steamGridDBService?: SteamGridDBService | null;

  constructor(
    igdbService?: IGDBService | null,
    steamGridDBService?: SteamGridDBService | null,
    steamService?: SteamService | null,
    rawgService?: RAWGService | null
  ) {
    this.steamGridDBService = steamGridDBService;

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

    if (rawgService) {
      this.rawgProvider = new RAWGMetadataProvider(rawgService);
      this.providers.push(this.rawgProvider);
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
   * Set SteamGridDB service
   */
  setSteamGridDBService(steamGridDBService: SteamGridDBService | null): void {
    this.steamGridDBService = steamGridDBService;
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
   * Merge artwork from multiple sources, prioritizing SteamGridDB (default for images)
   * Falls back to highest resolution from other sources if SteamGridDB doesn't have the image
   */
  private mergeArtwork(artworkArray: Array<{ artwork: GameArtwork | null; source: string }>): GameArtwork {
    const merged: GameArtwork = {};

    const getSourcePriority = (source: string): number => {
      if (source === "steam") return 3;
      if (source === "steamgriddb") return 2;
      if (source === "igdb") return 1;
      return 0;
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
   * Search for games across allowed providers (RAWG only)
   */
  async searchGames(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
    const rateLimiter = getRateLimitCoordinator();
    const allowedSearchProviders = new Set(["rawg"]);

    const providersToUse = this.providers.filter(p => {
      const providerName = (p as any).name?.toLowerCase?.() || "";
      return p.isAvailable() && allowedSearchProviders.has(providerName);
    });

    const searchPromises = providersToUse.map(provider =>
      rateLimiter.queueRequest(provider.name, () =>
        withRetry(() => provider.search(title, steamAppId), { maxRetries: 3, delay: 1000 }).catch(error => {
          console.error(`Error searching ${provider.name}:`, error);
          return [];
        })
      )
    );

    const results = await Promise.all(searchPromises);
    return results.flat();
  }

  /**
   * Match a scanned game against search results
   */
  async searchAndMatchGame(
    scannedGame: ScannedGameResult,
    searchQuery?: string
  ): Promise<{ match: GameSearchResult | null; confidence: number; reasons: string[]; allResults: GameSearchResult[] }> {
    const matcher = getGameMatcher();
    const query = searchQuery || scannedGame.title;

    const searchResults = await this.searchGames(query, scannedGame.appId);
    if (searchResults.length === 0) {
      return { match: null, confidence: 0, reasons: ["no results"], allResults: [] };
    }

    const matchResult = matcher.matchGame(scannedGame, searchResults);
    if (!matchResult) {
      return { match: null, confidence: 0, reasons: ["no match"], allResults: searchResults };
    }

    return {
      match: matchResult.game,
      confidence: matchResult.confidence,
      reasons: matchResult.reasons,
      allResults: searchResults,
    };
  }

  /**
   * Get complete game metadata by aggregating from RAWG
   */
  async searchArtwork(title: string, steamAppId?: string): Promise<GameMetadata> {
    const searchResults = await this.searchGames(title, steamAppId);
    const matched = searchResults[0] || null;
    return this.fetchCompleteMetadata(title, matched, steamAppId);
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
      id: gameTitle,
      title: gameTitle,
      source: "rawg",
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
   * Fetch artwork for a matched game (RAWG only)
   */
  private async fetchArtworkForGame(
    matchedGame: GameSearchResult,
    steamAppId?: string
  ): Promise<GameMetadata> {
    const artworkPromises: Array<{ promise: Promise<GameArtwork | null>; source: string }> = [];

    if (matchedGame.source === "rawg" && this.rawgProvider?.isAvailable()) {
      artworkPromises.push({ promise: this.rawgProvider.getArtwork(matchedGame.id), source: "rawg" });
    } else if (this.rawgProvider?.isAvailable()) {
      const results = await this.rawgProvider.search(matchedGame.title, steamAppId || matchedGame.steamAppId);
      if (results.length > 0) {
        artworkPromises.push({ promise: this.rawgProvider.getArtwork(results[0].id), source: "rawg" });
      }
    }

    // Use SteamGridDB for box art / logos when available
    if (this.steamGridDBProvider?.isAvailable()) {
      try {
        const sgdbResults = await this.steamGridDBProvider.search(matchedGame.title, steamAppId || matchedGame.steamAppId);
        if (sgdbResults.length > 0) {
          artworkPromises.push({
            promise: this.steamGridDBProvider.getArtwork(sgdbResults[0].id, steamAppId || matchedGame.steamAppId),
            source: "steamgriddb",
          });
        }
      } catch (err) {
        console.warn("[MetadataFetcher] SteamGridDB artwork fetch failed:", err);
      }
    }

    if (artworkPromises.length === 0) {
      return this.getEmptyMetadata();
    }

    const artworkResults = await Promise.allSettled(artworkPromises.map(item => item.promise));
    const artworkWithSources = artworkResults
      .map((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          return { artwork: result.value, source: artworkPromises[index]?.source || "unknown" };
        }
        return null;
      })
      .filter((item): item is { artwork: GameArtwork; source: string } => item !== null);

    const mergedArtwork = artworkWithSources.length > 0 ? this.mergeArtwork(artworkWithSources) : ({} as GameArtwork);

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
   * Fetch description for a matched game (RAWG only)
   */
  private async fetchDescriptionForGame(
    matchedGame: GameSearchResult,
    steamAppId?: string
  ): Promise<Partial<GameMetadata>> {
    const steamAppIdToUse = steamAppId || matchedGame.steamAppId;
    const descriptions: (GameDescription | null)[] = [];

    if (this.rawgProvider?.isAvailable()) {
      try {
        let rawgDesc: GameDescription | null = null;

        if (matchedGame.source === "rawg") {
          rawgDesc = await this.rawgProvider.getDescription(matchedGame.id);
        } else {
          const rawgResults = await this.rawgProvider.search(matchedGame.title, steamAppIdToUse);
          if (rawgResults.length > 0) {
            rawgDesc = await this.rawgProvider.getDescription(rawgResults[0].id);
          }
        }

        if (rawgDesc) {
          descriptions.push(rawgDesc);
        }
      } catch (err: any) {
        if (err?.status === 403 || err?.status === 429) {
          console.warn("[MetadataFetcher] RAWG rate limited, skipping");
        } else {
          console.warn("[MetadataFetcher] RAWG error:", err);
        }
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
   */
  async searchMetadataOnly(providerId: string, providerSource: string, steamAppId?: string, gameTitle?: string): Promise<Partial<GameMetadata>> {
    const descriptionPromises: Promise<GameDescription | null>[] = [];

    if (providerSource === "rawg" && this.rawgProvider?.isAvailable()) {
      descriptionPromises.push(this.rawgProvider.getDescription(providerId));
    } else if (gameTitle && this.rawgProvider?.isAvailable()) {
      const rawgResults = await this.rawgProvider.search(gameTitle, steamAppId);
      if (rawgResults.length > 0) {
        descriptionPromises.push(this.rawgProvider.getDescription(rawgResults[0].id));
      }
    }

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

  setSteamGridDBApiKey(_apiKey: string): void {
    console.warn("setSteamGridDBApiKey is deprecated. Use setSteamGridDBService instead.");
  }

  setMockMode(_enabled: boolean): void {
    console.warn("setMockMode is deprecated. Providers handle availability automatically.");
  }
}
