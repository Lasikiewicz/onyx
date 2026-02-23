import { MetadataProvider, GameSearchResult, GameDescription, GameArtwork, GameInstallInfo } from "./MetadataProvider.js";
import { IGDBMetadataProvider } from "./IGDBMetadataProvider.js";
import { SteamMetadataProvider } from "./SteamMetadataProvider.js";
import { RAWGMetadataProvider } from "./RAWGMetadataProvider.js";
import { IGDBService } from "./IGDBService.js";
import { SteamService } from "./SteamService.js";
import { RAWGService } from "./RAWGService.js";
import { SteamGridDBService } from "./SteamGridDBService.js";
import { SteamGridDBMetadataProvider } from "./SteamGridDBMetadataProvider.js";
import { GiantBombService } from "./GiantBombService.js";
import { GiantBombMetadataProvider } from "./GiantBombMetadataProvider.js";
import { getRateLimitCoordinator } from "./RateLimitCoordinator.js";
import { getMetadataCache } from "./MetadataCache.js";
import { getMetadataValidator } from "./MetadataValidator.js";
import { withRetry, withTimeout } from "./RetryUtils.js";
import { ScannedGameResult } from "./ImportService.js";
import { getGameMatcher } from "./GameMatcher.js";

export interface GameMetadata {
  boxArtUrl: string;
  bannerUrl: string;
  alternativeBannerUrl?: string;
  logoUrl?: string;
  heroUrl?: string;
  iconUrl?: string;
  screenshots?: string[];
  title?: string;
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
  links?: Array<{ name: string; url: string }>;
}

export interface IGDBConfig {
  clientId: string;
  accessToken: string;
}

/**
 * MetadataFetcherService using Provider pattern
 * 
 * METADATA STRATEGY - MULTI-PROVIDER APPROACH:
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
 * WHY THIS APPROACH?
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
  private giantBombProvider?: GiantBombMetadataProvider;

  constructor(
    igdbService?: IGDBService | null,
    steamService?: SteamService | null,
    rawgService?: RAWGService | null,
    steamGridDBService?: SteamGridDBService | null,
    giantBombService?: GiantBombService | null
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

    if (giantBombService) {
      this.giantBombProvider = new GiantBombMetadataProvider(giantBombService);
      this.providers.push(this.giantBombProvider);
    }
  }

  /**
   * Validate credentials for all providers that require them
   * @returns Record of provider names and their validation status
   */
  async validateAllProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const validationPromises = this.providers.map(async (provider) => {
      if (provider.validateCredentials) {
        try {
          const isValid = await provider.validateCredentials();
          results[provider.name] = isValid;
        } catch (error) {
          console.error(`[MetadataFetcherService] Validation failed for ${provider.name}:`, error);
          results[provider.name] = false;
        }
      } else {
        // Provider doesn't need credentials or doesn't support validation
        // Steam provider is generally always valid if service is available
        results[provider.name] = provider.isAvailable();
      }
    });

    await Promise.all(validationPromises);
    return results;
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
   * Get RAWG provider for external searches
   */
  getRAWGProvider(): RAWGMetadataProvider | undefined {
    return this.rawgProvider;
  }

  /**
   * Get SteamGridDB provider for external searches
   */
  getSteamGridDBProvider(): SteamGridDBMetadataProvider | undefined {
    return this.steamGridDBProvider;
  }

  /**
   * Get status of all metadata providers (for debugging)
   */
  getProviderStatus(): { name: string; available: boolean }[] {
    return [
      { name: 'Steam', available: this.steamProvider?.isAvailable() ?? false },
      { name: 'IGDB', available: this.igdbProvider?.isAvailable() ?? false },
      { name: 'RAWG', available: this.rawgProvider?.isAvailable() ?? false },
      { name: 'SteamGridDB', available: this.steamGridDBProvider?.isAvailable() ?? false },
      { name: 'GiantBomb', available: this.giantBombProvider?.isAvailable() ?? false },
    ];
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
      if (source === "steam") return 5;
      if (source === "igdb") return 4;
      if (source === "steamgriddb") return 3.5; // SGDB assets are often higher quality than RAWG
      if (source === "rawg") return 3;
      return 1;
    };

    // Special priority for Banners/Heroes - User prefers SGDB
    const getBannerPriority = (source: string): number => {
      if (source === "steamgriddb") return 6; // SGDB top priority for banners/heroes
      return getSourcePriority(source);
    };

    const sortByPriority = (items: Array<{ url: string; resolution?: { width: number; height: number }; source: string }>, customPriorityFn?: (source: string) => number) =>
      items.sort((a, b) => {
        const getPrio = customPriorityFn || getSourcePriority;
        const priorityDiff = getPrio(b.source) - getPrio(a.source);
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
        .map(item => ({ url: item.artwork!.bannerUrl!, resolution: item.artwork!.bannerResolution, source: item.source })),
      getBannerPriority
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
        .map(item => ({ url: item.artwork!.heroUrl!, resolution: item.artwork!.heroResolution, source: item.source })),
      getBannerPriority
    );
    if (heroes.length > 0) {
      merged.heroUrl = heroes[0].url;
      merged.heroResolution = heroes[0].resolution;
    }

    // 1. Primary Priority: Use alternativeBannerUrl supplied directly by providers
    // This correctly captures horizontal graphical grids from SGDB or Steam headers
    const altFromProviders = sortByPriority(
      artworkArray
        .filter(item => item.artwork?.alternativeBannerUrl)
        .map(item => ({ url: item.artwork!.alternativeBannerUrl!, resolution: undefined as undefined, source: item.source })),
      getBannerPriority
    );

    if (altFromProviders.length > 0) {
      const primary = merged.bannerUrl || merged.heroUrl || "";
      // Find the best alternative that isn't the primary banner
      const alt = altFromProviders.find(a => a.url !== primary);
      if (alt) {
        merged.alternativeBannerUrl = alt.url;
      }
    }

    // 2. Fallback: If no provider-supplied alternative banner, try using secondary heroes
    if (!merged.alternativeBannerUrl && heroes.length > 0) {
      const effectivePrimaryUrl = merged.bannerUrl || heroes[0].url;
      const heroCandidates = heroes.filter(h => h.url !== effectivePrimaryUrl);

      if (heroCandidates.length > 0) {
        // Variety Heuristic: Skip the very first candidate if possible
        merged.alternativeBannerUrl = heroCandidates.length > 1 ? heroCandidates[1].url : heroCandidates[0].url;
      }
    }

    // 3. Fallback: Secondary Banners (Steam/IGDB)
    if (!merged.alternativeBannerUrl && banners.length > 1) {
      const effectivePrimaryUrl = merged.bannerUrl || banners[0].url;
      const bannerCandidates = banners.filter(b => b.url !== effectivePrimaryUrl);
      if (bannerCandidates.length > 0) {
        merged.alternativeBannerUrl = bannerCandidates.length > 1 ? bannerCandidates[1].url : bannerCandidates[0].url;
      }
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

    // Prioritize Valve-provided descriptions if it's a Steam game
    const steamDesc = descriptions.find(d => d?.source === "steam");
    if (steamDesc) {
      Object.assign(merged, steamDesc);
    }

    // Helper to normalize URLs for comparison (handle trailing slashes and common prefixes uniformly)
    const normalizeUrl = (u: string) => {
      try {
        const urlObj = new URL(u);
        const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');
        const path = urlObj.pathname.replace(/\/+$/, '');
        return host + path;
      } catch {
        return u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
      }
    };

    // Layer other descriptions for missing fields
    for (const desc of descriptions) {
      if (!desc) continue;

      if (!merged.title) merged.title = desc.title;
      if (!merged.description) merged.description = desc.description;
      if (!merged.summary) merged.summary = desc.summary;
      if (!merged.releaseDate) merged.releaseDate = desc.releaseDate;
      if (!merged.rating) merged.rating = desc.rating;
      if (!merged.ageRating) merged.ageRating = desc.ageRating;

      if (desc.genres && desc.genres.length > 0) {
        merged.genres = Array.from(new Set([...(merged.genres || []), ...desc.genres]));
      }
      if (desc.developers && desc.developers.length > 0) {
        merged.developers = Array.from(new Set([...(merged.developers || []), ...desc.developers]));
      }
      if (desc.publishers && desc.publishers.length > 0) {
        merged.publishers = Array.from(new Set([...(merged.publishers || []), ...desc.publishers]));
      }
      if (desc.platforms && desc.platforms.length > 0) {
        merged.platforms = Array.from(new Set([...(merged.platforms || []), ...desc.platforms]));
      }

      if (desc.categories && desc.categories.length > 0) {
        merged.categories = Array.from(new Set([...(merged.categories || []), ...desc.categories]));
      }

      if (desc.links && desc.links.length > 0) {
        // Merge links, ensuring no duplicate URLs (normalized)
        const existingNormalizedUrls = new Set((merged.links || []).map(l => normalizeUrl(l.url)));
        const newLinks = desc.links.filter(l => !existingNormalizedUrls.has(normalizeUrl(l.url)));
        if (newLinks.length > 0) {
          merged.links = [...(merged.links || []), ...newLinks];
        }
      }
    }

    // Sort links by default order (same as IGDB link order)
    if (merged.links && merged.links.length > 0) {
      const linkOrder = [
        'Official Website', 'YouTube', 'Subreddit', 'Discord', 'Community Wiki', 'Wikipedia',
        'Facebook', 'Twitter', 'Twitch', 'Instagram', 'Steam', 'Epic', 'Xbox', 'PlayStation'
      ];
      const orderIndex = new Map(linkOrder.map((name, i) => [name.toLowerCase(), i]));
      merged.links.sort((a, b) => {
        const ia = orderIndex.get((a.name || '').toLowerCase()) ?? 999;
        const ib = orderIndex.get((b.name || '').toLowerCase()) ?? 999;
        return ia - ib;
      });
    }

    // Clean up age rating to keep only PEGI if present (as per original logic requirement)
    if (merged.ageRating) {
      const ageRatingLower = merged.ageRating.toLowerCase();
      if (!ageRatingLower.includes("pegi")) {
        delete merged.ageRating;
      }
    }

    return merged;
  }

  private mergeInstallInfo(installInfoArray: (GameInstallInfo | null)[]): GameInstallInfo | null {
    return installInfoArray.find(info => info !== null) || null;
  }

  /**
   * Search for games - DISABLED for official-store-only approach
   * Official stores (Steam, Epic, GOG) don't need search - we already have their IDs from game scanning
   * This method returns empty array to prevent any third-party searches
   */
  async searchGames(title: string, steamAppId?: string): Promise<GameSearchResult[]> {
    console.log(`[searchGames] Searching for "${title}" (steamAppId: ${steamAppId})`);

    // Log provider status for debugging
    const providerStatus = this.getProviderStatus();
    const availableProviders = providerStatus.filter(p => p.available).map(p => p.name);
    const unavailableProviders = providerStatus.filter(p => !p.available).map(p => p.name);

    console.log(`[searchGames] Available providers: ${availableProviders.length > 0 ? availableProviders.join(', ') : 'NONE'}`);
    if (unavailableProviders.length > 0) {
      console.log(`[searchGames] Unavailable providers: ${unavailableProviders.join(', ')}`);
    }

    // Warn if no providers are available
    if (availableProviders.length === 0) {
      console.warn('[searchGames] ⚠️  NO METADATA PROVIDERS AVAILABLE! Please configure IGDB credentials in Settings > APIs.');
      return [];
    }

    const matcher = getGameMatcher();
    const query = steamAppId || matcher.normalizeTitle(title);
    const isSteamId = /^\d+$/.test(query);

    const allResults: GameSearchResult[] = [];

    // Add all providers
    const providersToSearch = [...this.providers];

    // Carry out searches across all providers
    const results = await Promise.allSettled(
      providersToSearch.map(provider => provider.search(query))
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        allResults.push(...result.value);
      }
    });

    // Remove duplicates by ID
    const uniqueResults = new Map<string, GameSearchResult>();
    allResults.forEach(r => {
      const id = (r.steamAppId || r.externalId || r.id).toString();
      if (!uniqueResults.has(id)) {
        uniqueResults.set(id, r);
      }
    });

    return Array.from(uniqueResults.values());
  }

  /**
   * Search for games with progressive results callback
   */
  async searchGamesProgressive(
    title: string,
    steamAppId: string | undefined,
    onResult: (results: GameSearchResult[]) => void
  ): Promise<void> {
    console.log(`[searchGamesProgressive] Searching for "${title}" (steamAppId: ${steamAppId})`);

    const providerStatus = this.getProviderStatus();
    const availableProviders = providerStatus.filter(p => p.available).map(p => p.name);

    if (availableProviders.length === 0) {
      console.warn('[searchGamesProgressive] ⚠️  NO METADATA PROVIDERS AVAILABLE!');
      return;
    }

    const query = steamAppId || title;

    // Run searches in parallel and report results as they come in
    const providersToSearch = [...this.providers];

    await Promise.allSettled(
      providersToSearch.map(async (provider) => {
        try {
          // Use timeout for each provider to prevent one slow provider blocking the completion for too long
          // (though checking progressively means we don't block display)
          const results = await provider.search(query);
          if (results && results.length > 0) {
            onResult(results);
          }
        } catch (err) {
          console.warn(`[searchGamesProgressive] Provider search failed:`, err);
        }
      })
    );
  }

  /**
   * Match a scanned game - DISABLED for official-store-only approach
   * Official stores provide accurate data directly via platform IDs (Steam App ID, Epic ID, etc.)
   */
  async searchAndMatchGame(
    scannedGame: ScannedGameResult,
    searchQuery?: string
  ): Promise<{ match: GameSearchResult | null; confidence: number; reasons: string[]; allResults: GameSearchResult[] }> {
    const matcher = getGameMatcher();

    // Strip demo indicators for matching
    const { stripped: searchTitle, isDemo } = matcher.stripDemoIndicator(searchQuery || scannedGame.title);
    const query = searchTitle;

    console.log(`[searchAndMatchGame] Matching for "${scannedGame.title}" with query "${query}" (isDemo: ${isDemo})`);

    const steamAppId = scannedGame.source === 'steam' ? scannedGame.appId : undefined;
    const searchResults = await this.searchGames(query, steamAppId);

    if (searchResults.length === 0) {
      return { match: null, confidence: 0, reasons: ["no results found"], allResults: [] };
    }

    const result = matcher.matchGame({ ...scannedGame, title: query }, searchResults);

    if (!result) {
      return { match: null, confidence: 0, reasons: ["no match found"], allResults: searchResults };
    }

    return {
      match: result.game,
      confidence: result.confidence,
      reasons: result.reasons,
      allResults: searchResults
    };
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
  async searchArtwork(title: string, steamAppId?: string, bypassCache: boolean = false, linksOnly: boolean = false): Promise<GameMetadata> {
    console.log(`[MetadataFetcher.searchArtwork] Starting for "${title}" (steamAppId: ${steamAppId}, bypassCache: ${bypassCache}, linksOnly: ${linksOnly})`);

    // Use Steam App ID if available, otherwise fallback to title-based search across all providers
    const artworkResult = await this.fetchCompleteMetadata(title, null, steamAppId, bypassCache, linksOnly);
    if (linksOnly) {
      console.log(`[MetadataFetcher.searchArtwork] Links search complete for "${title}":`, {
        linksCount: (artworkResult.links || []).length
      });
    } else {
      console.log(`[MetadataFetcher.searchArtwork] Complete metadata result for "${title}":`, {
        boxArtUrl: artworkResult.boxArtUrl ? 'present' : 'missing',
        logoUrl: artworkResult.logoUrl ? 'present' : 'missing',
        bannerUrl: artworkResult.bannerUrl ? 'present' : 'missing',
        linksCount: (artworkResult.links || []).length
      });
    }
    return artworkResult;
  }

  /**
   * Fetch complete metadata (artwork + description) with caching/validation
   */
  async fetchCompleteMetadata(
    gameTitle: string,
    matchedGame?: GameSearchResult | null,
    steamAppId?: string,
    bypassCache: boolean = false,
    linksOnly: boolean = false
  ): Promise<GameMetadata> {
    const rateLimiter = getRateLimitCoordinator();
    const cache = getMetadataCache();
    const validator = getMetadataValidator();

    const matcher = getGameMatcher();
    // Clean title for search/matching if it's a demo
    const { stripped: cleanTitle } = matcher.stripDemoIndicator(gameTitle);

    const effectiveMatch: GameSearchResult = matchedGame || {
      id: steamAppId ? `steam-${steamAppId}` : cleanTitle,
      title: cleanTitle,
      source: steamAppId ? "steam" : "unknown",
      steamAppId,
    };

    // If it's a non-exact match but we have a clean title, override the search title
    if (effectiveMatch.title !== cleanTitle) {
      effectiveMatch.title = cleanTitle;
    }

    const cacheKey = cache.generateKey(gameTitle, steamAppId || effectiveMatch.steamAppId);

    if (!bypassCache) {
      const cachedMetadata = cache.get(cacheKey);
      if (cachedMetadata && validator.validateMetadata(cachedMetadata, effectiveMatch)) {
        console.log(`[MetadataFetcher] Using cached metadata for ${gameTitle}`);
        return cachedMetadata;
      }
    } else {
      console.log(`[MetadataFetcher] Bypassing cache for ${gameTitle}`);
    }

    let artworkMetadata: GameMetadata = this.getEmptyMetadata();
    if (!linksOnly) {
      artworkMetadata = await rateLimiter.queueRequest("artwork", async () =>
        withRetry(() => this.fetchArtworkForGame(effectiveMatch, steamAppId), { maxRetries: 3, delay: 1000 })
      );
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const textMetadata = await rateLimiter.queueRequest("description", async () =>
      withRetry(() => this.fetchDescriptionForGame(effectiveMatch, steamAppId, linksOnly), { maxRetries: 3, delay: 1000 })
    );

    const mergedMetadata: GameMetadata = { ...artworkMetadata, ...textMetadata };

    if (!validator.validateMetadata(mergedMetadata, effectiveMatch, { linksOnly })) {
      console.warn(`[MetadataFetcher] Metadata validation failed for ${gameTitle}`);
    }

    cache.set(cacheKey, mergedMetadata);
    return mergedMetadata;
  }

  /**
   * Fetch artwork for a matched game
   * Priority 1: Official Store API (Steam) - try searching by title for non-Steam games
   * Priority 2: IGDB fallback
   */
  private async fetchArtworkForGame(
    matchedGame: GameSearchResult,
    steamAppId?: string
  ): Promise<GameMetadata> {
    console.log(`[fetchArtworkForGame] Fetching aggregated artwork for "${matchedGame.title}" (source: ${matchedGame.source}, id: ${matchedGame.id}, steamAppId: ${steamAppId})`);
    const artworkPromises: Array<{ promise: Promise<GameArtwork | null>; source: string }> = [];

    // Helper to check if steamAppId is a valid numeric Steam ID (not Epic/Xbox/GOG identifier)
    const isValidSteamAppId = (id?: string): boolean => {
      if (!id) return false;
      return /^\d+$/.test(id);
    };

    let resolvedSteamAppId: string | undefined = steamAppId;

    // 1. Steam Provider - Official Store (Always try if we have an ID or can find one)
    if (this.steamProvider?.isAvailable()) {
      if (isValidSteamAppId(steamAppId)) {
        console.log(`[fetchArtworkForGame] Adding Steam provider for app ${steamAppId}`);
        artworkPromises.push({
          promise: this.steamProvider.getArtwork(`steam-${steamAppId}`, steamAppId),
          source: "steam"
        });
      } else {
        console.log(`[fetchArtworkForGame] Searching Steam by title for "${matchedGame.title}"`);
        try {
          const steamResults = await this.steamProvider.searchGames(matchedGame.title);
          if (steamResults.length > 0) {
            // 1. Try to find an exact title match (case-insensitive)
            let bestMatch = steamResults.find(r => r.title.toLowerCase() === matchedGame.title.toLowerCase());

            // 2. If no exact match, prefer results that don't look like demos
            if (!bestMatch) {
              bestMatch = steamResults.find(r => !/\bdemo\b/i.test(r.title)) || steamResults[0];
            }

            resolvedSteamAppId = bestMatch.steamAppId;
            console.log(`[fetchArtworkForGame] Resolved Steam App ID from search: ${resolvedSteamAppId} ("${bestMatch.title}")`);

            artworkPromises.push({
              promise: this.steamProvider.getArtwork(`steam-${resolvedSteamAppId}`, resolvedSteamAppId),
              source: "steam"
            });
          }
        } catch (e) {
          console.warn(`[fetchArtworkForGame] Steam search failed:`, e);
        }
      }
    }

    // 2. SteamGridDB Provider - High quality artwork
    if (this.steamGridDBProvider?.isAvailable()) {
      console.log(`[fetchArtworkForGame] Adding SteamGridDB provider for "${matchedGame.title}"`);
      if (matchedGame.source === 'steamgriddb') {
        artworkPromises.push({
          promise: withTimeout(
            this.steamGridDBProvider.getArtwork(matchedGame.id, resolvedSteamAppId),
            15000,
            "SteamGridDB Artwork Timeout"
          ).catch((err: any) => {
            console.warn(`[fetchArtworkForGame] SteamGridDB timeout/error: ${err.message}`);
            return null;
          }),
          source: "steamgriddb"
        });
      } else {
        artworkPromises.push({
          promise: withTimeout(
            (async () => {
              const results = await this.steamGridDBProvider!.search(matchedGame.title, resolvedSteamAppId);
              return results.length > 0 ? this.steamGridDBProvider!.getArtwork(results[0].id, resolvedSteamAppId) : null;
            })(),
            15000,
            "SteamGridDB Search/Artwork Timeout"
          ).catch((err: any) => {
            console.warn(`[fetchArtworkForGame] SteamGridDB search timeout/error: ${err.message}`);
            return null;
          }),
          source: "steamgriddb"
        });
      }
    }

    // 3. Giant Bomb Provider - High quality artwork
    if (this.giantBombProvider?.isAvailable()) {
      console.log(`[fetchArtworkForGame] Adding Giant Bomb provider for "${matchedGame.title}"`);
      if (matchedGame.source === 'giantbomb') {
        artworkPromises.push({
          promise: withTimeout(
            this.giantBombProvider.getArtwork(matchedGame.id, resolvedSteamAppId),
            15000,
            "Giant Bomb Artwork Timeout"
          ).catch((err: any) => {
            console.warn(`[fetchArtworkForGame] Giant Bomb timeout/error: ${err.message}`);
            return null;
          }),
          source: "giantbomb"
        });
      } else {
        artworkPromises.push({
          promise: withTimeout(
            (async () => {
              const results = await this.giantBombProvider!.search(matchedGame.title, resolvedSteamAppId);
              return results.length > 0 ? this.giantBombProvider!.getArtwork(results[0].id, resolvedSteamAppId) : null;
            })(),
            15000,
            "Giant Bomb Search/Artwork Timeout"
          ).catch((err: any) => {
            console.warn(`[fetchArtworkForGame] Giant Bomb search timeout/error: ${err.message}`);
            return null;
          }),
          source: "giantbomb"
        });
      }
    }

    // 4. IGDB Provider - Always include for broader coverage
    if (this.igdbProvider?.isAvailable()) {
      console.log(`[fetchArtworkForGame] Adding IGDB provider for "${matchedGame.title}"`);
      if (matchedGame.source === 'igdb') {
        artworkPromises.push({
          promise: withTimeout(
            this.igdbProvider.getArtwork(matchedGame.id, resolvedSteamAppId),
            15000,
            "IGDB Artwork Timeout"
          ).catch((err: any) => {
            console.warn(`[fetchArtworkForGame] IGDB timeout/error: ${err.message}`);
            return null;
          }),
          source: "igdb"
        });
      } else {
        artworkPromises.push({
          promise: withTimeout(
            (async () => {
              const results = await this.igdbProvider!.search(matchedGame.title, resolvedSteamAppId);
              return results.length > 0 ? this.igdbProvider!.getArtwork(results[0].id, resolvedSteamAppId) : null;
            })(),
            15000,
            "IGDB Search/Artwork Timeout"
          ).catch((err: any) => {
            console.warn(`[fetchArtworkForGame] IGDB search timeout/error: ${err.message}`);
            return null;
          }),
          source: "igdb"
        });
      }
    }

    // 4. RAWG Provider - Always include for broader coverage
    if (this.rawgProvider?.isAvailable()) {
      console.log(`[fetchArtworkForGame] Adding RAWG provider for "${matchedGame.title}"`);
      if (matchedGame.source === 'rawg') {
        artworkPromises.push({
          promise: withTimeout(
            this.rawgProvider.getArtwork(matchedGame.id),
            15000,
            "RAWG Artwork Timeout"
          ).catch((err: any) => {
            console.warn(`[fetchArtworkForGame] RAWG timeout/error: ${err.message}`);
            return null;
          }),
          source: "rawg"
        });
      } else {
        artworkPromises.push({
          promise: withTimeout(
            (async () => {
              const results = await this.rawgProvider!.search(matchedGame.title);
              return results.length > 0 ? this.rawgProvider!.getArtwork(results[0].id) : null;
            })(),
            15000,
            "RAWG Search/Artwork Timeout"
          ).catch((err: any) => {
            console.warn(`[fetchArtworkForGame] RAWG search timeout/error: ${err.message}`);
            return null;
          }),
          source: "rawg"
        });
      }
    }


    if (artworkPromises.length === 0) {
      console.warn(`[fetchArtworkForGame] No metadata providers available for "${matchedGame.title}"`);
      return this.getEmptyMetadata();
    }

    // Run all promises and take the best from each
    const artworkResults = await Promise.allSettled(artworkPromises.map(item => item.promise));
    const artworkWithSources = artworkResults
      .map((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          return { artwork: result.value, source: artworkPromises[index].source };
        }
        return null;
      })
      .filter((item): item is { artwork: GameArtwork; source: string } => item !== null);

    const mergedArtwork = artworkWithSources.length > 0 ? this.mergeArtwork(artworkWithSources) : ({} as GameArtwork);

    return {
      boxArtUrl: mergedArtwork.boxArtUrl || "",
      bannerUrl: mergedArtwork.bannerUrl || mergedArtwork.heroUrl || mergedArtwork.boxArtUrl || "",
      alternativeBannerUrl: mergedArtwork.alternativeBannerUrl,
      logoUrl: mergedArtwork.logoUrl,
      heroUrl: mergedArtwork.heroUrl,
      iconUrl: mergedArtwork.iconUrl,
      screenshots: mergedArtwork.screenshots,
    };
  }

  /**
   * Fetch description for a matched game
   * Priority 1: Official Store API (Steam) - try searching by title for non-Steam games
   * Priority 2: IGDB fallback
   */
  private async fetchDescriptionForGame(
    matchedGame: GameSearchResult,
    steamAppId?: string,
    linksOnly: boolean = false
  ): Promise<Partial<GameMetadata>> {
    let steamAppIdToUse = steamAppId || matchedGame.steamAppId;
    const descriptions: (GameDescription | null)[] = [];

    // Helper to check if steamAppId is a valid numeric Steam ID
    const isValidSteamAppId = (id?: string): boolean => {
      if (!id) return false;
      return /^\d+$/.test(id);
    };

    const providersToTry: Array<() => Promise<GameDescription | null>> = [];

    // 1. Steam Provider - Skip if we only want links (user explicitly requested IGDB only)
    if (!linksOnly && this.steamProvider?.isAvailable()) {
      if (isValidSteamAppId(steamAppIdToUse)) {
        providersToTry.push(() => this.steamProvider!.getDescription(`steam-${steamAppIdToUse}`, linksOnly));
      } else {
        providersToTry.push(async () => {
          const results = await this.steamProvider!.searchGames(matchedGame.title);
          if (results.length > 0) {
            steamAppIdToUse = results[0].steamAppId;
            return this.steamProvider!.getDescription(`steam-${steamAppIdToUse}`, linksOnly);
          }
          return null;
        });
      }
    }

    // 2. Fallback Providers (IGDB, RAWG)
    // Always use IGDB for links, even if Steam ID found
    if (this.igdbProvider?.isAvailable()) {
      providersToTry.push(async () => {
        if (matchedGame.source === 'igdb') {
          return this.igdbProvider!.getDescription(matchedGame.id, linksOnly);
        }
        // Pass steamAppIdToUse so the IGDB provider can perform a precise exact-match lookup 
        // to find the exact IGDB item corresponding to this Steam title.
        const results = await this.igdbProvider!.search(matchedGame.title, steamAppIdToUse, linksOnly);
        if (results.length === 0) return null;
        // Prefer exact title match so we get the main game entry (with full links), not a DLC/variant that may have few links
        const searchTitle = (matchedGame.title || '').trim().toLowerCase();
        const exact = results.find((r) => (r.title || '').trim().toLowerCase() === searchTitle);
        const best = exact ?? results[0];
        return this.igdbProvider!.getDescription(best.id, linksOnly);
      });
    }

    // Skip RAWG if linksOnly is requested
    if (!linksOnly && this.rawgProvider?.isAvailable()) {
      providersToTry.push(async () => {
        if (matchedGame.source === 'rawg') {
          return this.rawgProvider!.getDescription(matchedGame.id, linksOnly);
        }
        const results = await this.rawgProvider!.search(matchedGame.title, steamAppIdToUse, linksOnly);
        return results.length > 0 ? this.rawgProvider!.getDescription(results[0].id, linksOnly) : null;
      });
    }

    const results = await Promise.all(providersToTry.map(p => p()));
    for (const res of results) {
      if (res) descriptions.push(res);
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
      links: mergedDescription.links,
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
      title: mergedDescription.title,
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
      links: mergedDescription.links,
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
      iconUrl: "", // Added iconUrl to empty metadata
    };
  }

  // Legacy no-op methods
  setIGDBConfig(_config: IGDBConfig): void {
    console.warn("setIGDBConfig is deprecated. Use setIGDBService instead.");
  }

  // SteamGridDB is disabled project-wide - these methods are kept for API compatibility
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

  setSteamGridDBApiKey(apiKey: string): void {
    if (apiKey) {
      this.setSteamGridDBService(new SteamGridDBService(apiKey));
    } else {
      this.setSteamGridDBService(null);
    }
  }

  /**
   * Set Giant Bomb service
   */
  setGiantBombService(giantBombService: GiantBombService | null): void {
    if (giantBombService) {
      this.giantBombProvider = new GiantBombMetadataProvider(giantBombService);
      if (!this.providers.includes(this.giantBombProvider)) {
        this.providers.push(this.giantBombProvider);
      }
    } else if (this.giantBombProvider) {
      this.providers = this.providers.filter(p => p !== this.giantBombProvider);
      this.giantBombProvider = undefined;
    }
  }

  setGiantBombApiKey(apiKey: string): void {
    if (apiKey) {
      this.setGiantBombService(new GiantBombService(apiKey));
    } else {
      this.setGiantBombService(null);
    }
  }

  setMockMode(_enabled: boolean): void {
    console.warn("setMockMode is deprecated. Providers handle availability automatically.");
  }
}
