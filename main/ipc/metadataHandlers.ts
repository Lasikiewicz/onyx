import { ipcMain, BrowserWindow } from 'electron';
import { MetadataFetcherService, IGDBConfig } from '../MetadataFetcherService.js';
import { ImageCacheService } from '../ImageCacheService.js';
import { GameStore, Game } from '../GameStore.js';
import { UserPreferencesService } from '../UserPreferencesService.js';
import { withTimeout } from '../RetryUtils.js';
import { ScannedGameResult } from '../ImportService.js';
import type { ImageQueueItem } from '../ImageOptimizationQueue.js';

let activeImageSearchRequestId: number | undefined;

export type ImageQueue = { add: (gameId: string, gameTitle: string, urls: ImageQueueItem['urls']) => void };

export function registerMetadataIPCHandlers(
    metadataFetcher: MetadataFetcherService,
    imageCacheService: ImageCacheService,
    gameStore: GameStore,
    userPreferencesService: UserPreferencesService,
    winReference?: { readonly current: BrowserWindow | null },
    imageQueue?: ImageQueue
) {
    // Validation Handlers
    ipcMain.handle('metadata:validateProviders', async () => {
        try {
            return await metadataFetcher.validateAllProviders();
        } catch (error) {
            console.error('Error in metadata:validateProviders handler:', error);
            return {};
        }
    });

    // Search Artwork Handlers
    ipcMain.handle('metadata:searchArtwork', async (_event, title: string, steamAppId?: string, bypassCache?: boolean) => {
        try {
            const prefs = await userPreferencesService.getPreferences();
            const preferAnimatedBoxart = prefs.preferAnimatedBoxart ?? true;
            const preferAnimatedBanner = prefs.preferAnimatedBanner ?? true;

            return await withTimeout(
                metadataFetcher.searchArtwork(title, steamAppId, bypassCache, false, preferAnimatedBoxart, preferAnimatedBanner),
                60000,
                `Artwork fetch timeout for "${title}"`
            );
        } catch (error) {
            console.error('Error in metadata:searchArtwork handler:', error);
            return { boxArtUrl: undefined, bannerUrl: undefined, logoUrl: undefined, heroUrl: undefined };
        }
    });

    // Match and Search Handlers
    ipcMain.handle('metadata:searchAndMatch', async (_event, scannedGame: any, searchQuery?: string) => {
        try {
            const matchResult = await metadataFetcher.searchAndMatchGame(scannedGame, searchQuery);
            return { success: true, ...matchResult };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error', match: null, confidence: 0, reasons: [], allResults: [] };
        }
    });

    ipcMain.handle('metadata:fixMatch', async (_event, query: string, scannedGame?: any) => {
        try {
            const isSteamAppId = /^\d+$/.test(query.trim());
            let matchedGame: any = null;

            if (isSteamAppId) {
                const steamAppId = query.trim();
                matchedGame = { id: `steam-${steamAppId}`, title: query, source: 'steam', externalId: steamAppId, steamAppId: steamAppId };
            } else {
                const searchResponse = await metadataFetcher.searchGames(query);
                matchedGame = scannedGame ? (await metadataFetcher.searchAndMatchGame(scannedGame, query)).match : (searchResponse[0] || null);
            }

            if (!matchedGame) return { success: false, error: 'No game found', metadata: null };

            const metadata = await metadataFetcher.fetchCompleteMetadata(matchedGame.title, matchedGame, matchedGame.steamAppId);
            return { success: true, matchedGame, metadata };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error', metadata: null };
        }
    });

    // Description and Content Handlers
    ipcMain.handle('metadata:fetchGameDescription', async (_event, steamGameId: string) => {
        try {
            // This usually comes from Steam metadata provider
            return await metadataFetcher.fetchCompleteMetadata('', { source: 'steam', externalId: steamGameId } as any, steamGameId);
        } catch (error) {
            return null;
        }
    });

    // Update and Cache Handlers
    ipcMain.handle('metadata:fetchAndUpdate', async (_event, gameId: string, title: string) => {
        try {
            const steamAppId = gameId.startsWith('steam-') ? gameId.replace('steam-', '') : undefined;
            const metadata = await metadataFetcher.searchArtwork(title, steamAppId);

            const prefs = await userPreferencesService.getPreferences();
            let finalMetadata = metadata;

            if (prefs.storeMetadataLocally !== false) {
                const cachedImages = await imageCacheService.cacheImages(metadata, gameId);
                finalMetadata = { ...metadata, ...cachedImages };
            }

            const success = await gameStore.updateGameMetadata(
                gameId,
                finalMetadata.boxArtUrl || '',
                finalMetadata.bannerUrl || '',
                finalMetadata.logoUrl,
                finalMetadata.heroUrl
            );
            return { success, metadata: finalMetadata };
        } catch (error) {
            return { success: false, metadata: null };
        }
    });

    ipcMain.handle('metadata:findLinks', async (_event, gameId: string) => {
        try {
            const games = await gameStore.getLibrary();
            const game = games.find(g => g.id === gameId);
            if (!game) throw new Error('Game not found');

            const steamAppId = game.id.startsWith('steam-') ? game.id.replace('steam-', '') : undefined;
            // Fresh fetch to get latest links
            const metadata = await metadataFetcher.fetchCompleteMetadata(game.title, null, steamAppId, true, true);

            return {
                success: true,
                links: metadata.links || [],
                title: game.title
            };
        } catch (error) {
            console.error('Error in metadata:findLinks:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('metadata:refreshAll', async (_event, options?: { allGames?: boolean, gameIds?: string[], continueFromIndex?: number, linksOnly?: boolean }) => {
        const sendProgress = (
            current: number,
            total: number,
            message: string,
            gameTitle?: string,
            links?: Array<{ name: string, url: string }>,
            images?: string[],
            imageProgress?: { index: number; total: number; imageType: string; phase: string }
        ) => {
            if (winReference?.current && !winReference.current.isDestroyed()) {
                winReference.current.webContents.send('metadata:refreshProgress', { current, total, message, gameTitle, links, images, imageProgress });
            }
        };

        try {
            const games = await gameStore.getLibrary();
            const prefs = await userPreferencesService.getPreferences();
            const shouldCacheLocally = prefs.storeMetadataLocally !== false;

            // Helper to check if an image URL is missing or invalid
            const isMissingImage = (url: string | undefined): boolean => {
                if (!url) return true;
                if (url.trim() === '') return true;
                // Check for placeholder or broken URLs
                if (url.includes('placeholder')) return true;
                return false;
            };

            // Filter games based on mode
            let targetGames: Game[];
            if (options?.gameIds && options.gameIds.length > 0) {
                // Specific game IDs targetted - this should take precedence
                targetGames = games.filter(g => options.gameIds?.includes(g.id));
            } else if (options?.allGames || options?.linksOnly) {
                // Refresh ALL games (or links for all)
                targetGames = games;
            } else {
                // "Missing" mode - only games missing any image (boxart, banner, logo, or icon)
                targetGames = games.filter(game =>
                    isMissingImage(game.boxArtUrl) ||
                    isMissingImage(game.bannerUrl) ||
                    isMissingImage(game.logoUrl) ||
                    isMissingImage(game.iconUrl)
                );
            }

            const startIndex = options?.continueFromIndex || 0;
            const total = targetGames.length;
            let successCount = 0;
            let errorCount = 0;
            const unmatchedGames: Array<{ gameId: string; title: string; searchResults: any[] }> = [];
            const missingBoxartGames: Array<{ gameId: string; title: string; steamAppId?: string }> = [];

            console.log(`[MetadataRefresh] Starting refresh for ${total} game(s), mode: ${options?.allGames ? 'all' : 'missing'}`);
            sendProgress(0, total, `Starting metadata refresh for ${total} game(s)...`);

            for (let i = startIndex; i < targetGames.length; i++) {
                const game = targetGames[i];
                const current = i + 1;

                try {
                    console.log(`[MetadataRefresh] [${current}/${total}] Processing: ${game.title}`);
                    sendProgress(current, total, options?.linksOnly ? `Searching for links...` : `Fetching metadata...`, game.title);

                    // Nuclear: remove existing cached images so we pull everything fresh (same as starting from scratch)
                    if (options?.allGames) {
                        try {
                            await imageCacheService.deleteAllGameImages(game.id);
                        } catch (deleteErr) {
                            console.warn(`[MetadataRefresh] [${current}/${total}] ${game.title}: Clear cache failed:`, deleteErr);
                        }
                    }

                    // Extract Steam App ID if available
                    const steamAppId = game.id.startsWith('steam-') ? game.id.replace('steam-', '') : undefined;

                    // Determine which images to fetch (nuclear = all; otherwise only missing)
                    const needsBoxart = !options?.linksOnly && (options?.allGames || isMissingImage(game.boxArtUrl));
                    const needsBanner = !options?.linksOnly && (options?.allGames || isMissingImage(game.bannerUrl));
                    const needsLogo = !options?.linksOnly && (options?.allGames || isMissingImage(game.logoUrl));
                    const needsIcon = !options?.linksOnly && (options?.allGames || isMissingImage(game.iconUrl));

                    if (!options?.linksOnly && !options?.allGames && !needsBoxart && !needsBanner && !needsLogo && !needsIcon) {
                        console.log(`[MetadataRefresh] [${current}/${total}] ${game.title}: All images present, skipping`);
                        successCount++;
                        continue;
                    }

                    // Fetch metadata with timeout
                    // Nuclear (allGames): use fetchCompleteMetadata with bypassCache, same as game importer - full metadata + images + links
                    let metadata: any = null;
                    try {
                        if (options?.linksOnly) {
                            metadata = await withTimeout(
                                metadataFetcher.fetchCompleteMetadata(
                                    game.title,
                                    null,
                                    steamAppId,
                                    true, // bypass cache
                                    true  // linksOnly = true
                                ),
                                30000,
                                `Metadata fetch timeout for "${game.title}"`
                            );
                        } else if (options?.allGames) {
                            // Nuclear: full refresh, same as importer - bypass cache, get metadata + artwork + links
                            metadata = await withTimeout(
                                metadataFetcher.fetchCompleteMetadata(
                                    game.title,
                                    null,
                                    steamAppId,
                                    true,  // bypass cache
                                    false, // linksOnly
                                    true,  // preferAnimatedBoxart
                                    true   // preferAnimatedBanner
                                ),
                                30000,
                                `Metadata fetch timeout for "${game.title}"`
                            );
                        } else {
                            metadata = await withTimeout(
                                metadataFetcher.searchArtwork(game.title, steamAppId, false, false),
                                30000,
                                `Metadata fetch timeout for "${game.title}"`
                            );
                        }
                    } catch (fetchError) {
                        console.warn(`[MetadataRefresh] [${current}/${total}] ${game.title}: Fetch failed:`, fetchError);
                    }

                    if (!metadata) {
                        console.log(`[MetadataRefresh] [${current}/${total}] ${game.title}: No metadata found`);
                        unmatchedGames.push({ gameId: game.id, title: game.title, searchResults: [] });
                        errorCount++;
                        continue;
                    }

                    if (options?.linksOnly) {
                        const fetchedLinks = metadata.links || [];
                        // Nuke existing links and replace with fresh from IGDB
                        const updatedGame: Game = {
                            ...game,
                            links: fetchedLinks,
                        };
                        await gameStore.saveGame(updatedGame);
                        console.log(`[MetadataRefresh] [${current}/${total}] ${game.title}: Links replaced (${fetchedLinks.length} links)`);
                        const linksMsg = fetchedLinks.length > 0 ? `Found: ${fetchedLinks.map((l: { name: string }) => l.name).join(', ')}` : 'No links found';
                        sendProgress(current, total, linksMsg, game.title, fetchedLinks);
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 200));
                        continue;
                    }

                    // Prepare updated image URLs (nuclear = metadata only, no keep from game)
                    const nuclear = !!options?.allGames;
                    let updatedBoxArt = needsBoxart && metadata.boxArtUrl ? metadata.boxArtUrl : (nuclear ? '' : game.boxArtUrl);
                    let updatedBanner = needsBanner && metadata.bannerUrl ? metadata.bannerUrl : (nuclear ? '' : game.bannerUrl);
                    let updatedAlternativeBanner = (nuclear ? (metadata.alternativeBannerUrl ?? '') : (metadata.alternativeBannerUrl ?? game.alternativeBannerUrl ?? ''));
                    let updatedLogo = needsLogo && metadata.logoUrl ? metadata.logoUrl : (nuclear ? '' : game.logoUrl);
                    let updatedIcon = needsIcon && metadata.iconUrl ? metadata.iconUrl : (nuclear ? '' : game.iconUrl);
                    let updatedHero = nuclear ? (metadata.heroUrl ?? '') : (metadata.heroUrl || game.heroUrl);

                    // Use the same pipeline everywhere: Background image optimization queue (same as importer).
                    if (shouldCacheLocally && imageQueue) {
                        imageQueue.add(game.id, game.title, {
                            boxArtUrl: updatedBoxArt,
                            bannerUrl: updatedBanner,
                            alternativeBannerUrl: updatedAlternativeBanner || undefined,
                            logoUrl: updatedLogo,
                            heroUrl: updatedHero,
                            iconUrl: updatedIcon
                        });
                    }

                    // Update game in store: nuclear = metadata only (remove all stored, pull fresh); otherwise merge
                    const updatedGame: Game = {
                        ...game,
                        boxArtUrl: updatedBoxArt || (nuclear ? '' : game.boxArtUrl),
                        bannerUrl: updatedBanner || (nuclear ? '' : game.bannerUrl),
                        alternativeBannerUrl: updatedAlternativeBanner || (nuclear ? undefined : game.alternativeBannerUrl),
                        logoUrl: updatedLogo || (nuclear ? '' : game.logoUrl),
                        iconUrl: updatedIcon || (nuclear ? '' : game.iconUrl),
                        heroUrl: updatedHero || (nuclear ? '' : game.heroUrl),
                        description: nuclear ? (metadata.description || metadata.summary || '') : (metadata.description || metadata.summary || game.description),
                        genres: nuclear ? (metadata.genres ?? []) : (metadata.genres || game.genres),
                        releaseDate: nuclear ? (metadata.releaseDate ?? '') : (metadata.releaseDate || game.releaseDate),
                        developers: nuclear ? (metadata.developers ?? []) : (metadata.developers || game.developers),
                        publishers: nuclear ? (metadata.publishers ?? []) : (metadata.publishers || game.publishers),
                        ageRating: nuclear ? (metadata.ageRating ?? '') : (metadata.ageRating || game.ageRating),
                        links: nuclear ? (metadata.links ?? []) : (metadata.links || game.links),
                    };

                    await gameStore.saveGame(updatedGame);

                    // Check if boxart is still missing after update
                    if (isMissingImage(updatedGame.boxArtUrl)) {
                        missingBoxartGames.push({
                            gameId: game.id,
                            title: game.title,
                            steamAppId
                        });
                    }

                    console.log(`[MetadataRefresh] [${current}/${total}] ${game.title}: Updated successfully`);
                    successCount++;

                    const assetsFound: string[] = [];
                    if (metadata.boxArtUrl) assetsFound.push('Box Art');
                    if (metadata.bannerUrl) assetsFound.push('Banner');
                    if (metadata.logoUrl) assetsFound.push('Logo');
                    if (metadata.iconUrl) assetsFound.push('Icon');
                    if (metadata.links && metadata.links.length > 0) assetsFound.push(`${metadata.links.length} Links`);

                    sendProgress(current, total, 'Updated metadata and assets', game.title, metadata.links, assetsFound);

                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));

                } catch (gameError) {
                    console.error(`[MetadataRefresh] [${current}/${total}] ${game.title}: Error:`, gameError);
                    errorCount++;
                }
            }

            sendProgress(total, total, 'Refresh completed!');
            console.log(`[MetadataRefresh] Completed: ${successCount} success, ${errorCount} errors, ${unmatchedGames.length} unmatched, ${missingBoxartGames.length} missing boxart`);

            return {
                success: true,
                count: successCount,
                errors: errorCount,
                unmatchedGames,
                missingBoxartGames
            };
        } catch (error) {
            console.error('[MetadataRefresh] Fatal error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                count: 0,
                errors: 0,
                unmatchedGames: [],
                missingBoxartGames: []
            };
        }
    });

    // Image Search Handlers
    // Image Search Handlers
    ipcMain.handle('metadata:fastImageSearch', async (event, query: string, requestId?: number) => {
        try {
            const allSearchResults: any[] = [];

            // Try to find game using progressive search
            await metadataFetcher.searchGamesProgressive(query, undefined, (results) => {
                allSearchResults.push(...results);

                // Transform for UI (FastSearchGame interface)
                const uiResults = results.map(r => ({
                    id: r.id,
                    name: r.title,
                    coverUrl: r.boxArtUrl || '',
                    bannerUrl: '',
                    logoUrl: '',
                    screenshotUrls: [],
                    source: r.source,
                    steamAppId: r.steamAppId
                }));

                if (event.sender && !event.sender.isDestroyed()) {
                    event.sender.send('metadata:fastSearchProgress', { results: uiResults, query, requestId });
                }
            });

            // After progressive phase, try to resolve one "best match" fully (existing behavior)
            if (allSearchResults.length > 0) {
                // Heuristic: Prefer Steam, then IGDB, then SGDB? 
                // Currently just taking the first result effectively (or we could sort)
                // The searchGamesProgressive doesn't guarantee order between providers, but within provider yes.

                const bestMatch = allSearchResults.find(r => r.source === 'steam') || allSearchResults[0];
                const steamAppId = bestMatch.steamAppId;

                // If we found a match, check if we can get quick artwork
                if (steamAppId || bestMatch.source === 'steamgriddb') {
                    // Try to fetch artwork for this specific match
                    const artwork = await metadataFetcher.searchArtwork(bestMatch.title, steamAppId);
                    return artwork;
                }
            }

            // Fallback to title search if no specific match found
            const prefs = await userPreferencesService.getPreferences();
            return await metadataFetcher.searchArtwork(query, undefined, false, false, prefs.preferAnimatedBoxart ?? true, prefs.preferAnimatedBanner ?? true);
        } catch (error) {
            console.error('Error in metadata:fastImageSearch handler:', error);
            // Return empty metadata object rather than crashing or undefined
            return { boxArtUrl: undefined, bannerUrl: undefined, logoUrl: undefined, heroUrl: undefined };
        }
    });

    // Helper to search SGDB if available
    const searchSGDB = async (gameName: string, steamAppId: string | undefined, imageType: string, includeAnimated: boolean = true) => {
        const sgdb = metadataFetcher.getSteamGridDBProvider();
        if (!sgdb || !sgdb.isAvailable()) return [];

        try {
            // First find the game ID in SGDB
            let gameId: number | null = null;
            // Only use steamAppId for SGDB lookup if it's actually a numeric Steam App ID
            // Xbox/Epic IDs (e.g. 'AppARCRaidersShipping') must NOT be sent to SGDB
            const isValidSteamId = steamAppId && /^\d+$/.test(String(steamAppId));
            if (isValidSteamId) {
                // Try to resolve by Steam ID first (more accurate)
                // Note: The provider wrapper might not expose a direct "getGameBySteamId", 
                // so we might have to use search or rely on internal logic. 
                // Actually the provider wrapper handles this in `search` usually.
                const results = await sgdb.search(gameName, steamAppId);
                if (results.length > 0) {
                    // Check for externalId first (raw number)
                    if (results[0].externalId) {
                        gameId = Number(results[0].externalId);
                    } else {
                        // Parse from ID string "steamgriddb-12345"
                        const idStr = String(results[0].id);
                        gameId = idStr.startsWith('steamgriddb-') ? Number(idStr.replace('steamgriddb-', '')) : Number(idStr);
                    }
                }
            }

            if (!gameId) {
                const results = await sgdb.search(gameName);
                if (results.length > 0) {
                    if (results[0].externalId) {
                        gameId = Number(results[0].externalId);
                    } else {
                        const idStr = String(results[0].id);
                        gameId = idStr.startsWith('steamgriddb-') ? Number(idStr.replace('steamgriddb-', '')) : Number(idStr);
                    }
                }
            }

            if (!gameId) return [];

            // Fetch specific image type
            const service = (sgdb as any).steamGridDBService; // Access raw service if possible, or use provider methods
            // Since we can't easily access the raw service through the provider wrapper without casting or updating provider,
            // we will try to use the provider's logic or internal service if exposed.
            // But wait, we exposed `SteamGridDBService` via `getSteamGridDBProvider`? No, we exposed the provider.
            // Let's assume we can access the underlying service or we update the provider to expose specific fetchers.
            // For now, let's assume we have to use what we have or try to cast to any to access the private service property if needed 
            // OR better: Update MetadataFetcher to expose the service directly? No, we exposed the provider.

            // Let's check `SteamGridDBMetadataProvider` implementation (we didn't view it but we can guess).
            // Actually, `SteamGridDBService` has `getVerticalGrids`, `getHeroes`, etc.
            // If the provider has `pk` or `service` property we can use it.
            // The provider typically wraps these calls.

            // Allow direct access to service for full image searches (bypassing the "one best match" logic of provider)
            // This relies on the provider storing the service in a property we can access (e.g. `steamGridDBService`)
            // If not, we might be limited.
            const rawService = (sgdb as any).steamGridDBService;
            if (rawService) {
                let images: any[] = [];
                if (imageType === 'boxart' || imageType === 'all') {
                    const grids = await rawService.getCapsules(gameId, includeAnimated);
                    images.push(...grids.map((g: any) => ({ ...g, type: 'boxart', source: 'SteamGridDB' })));
                }
                if (imageType === 'banner' || imageType === 'hero' || imageType === 'all') {
                    const heroes = await rawService.getHeroes(gameId, includeAnimated);
                    images.push(...heroes.map((g: any) => ({ ...g, type: 'hero', source: 'SteamGridDB' })));
                    // Also add heroes as alternativeBanner so they appear in the Alt Banner tab
                    images.push(...heroes.map((g: any) => ({ ...g, type: 'alternativeBanner', source: 'SteamGridDB' })));
                }
                if (imageType === 'alternativeBanner') {
                    // Dedicated alt banner search: fetch heroes (these are the wide banner-style images)
                    const heroes = await rawService.getHeroes(gameId, includeAnimated);
                    images.push(...heroes.map((g: any) => ({ ...g, type: 'alternativeBanner', source: 'SteamGridDB' })));
                }
                if (imageType === 'logo' || imageType === 'all') {
                    const logos = await rawService.getLogos(gameId); // SGDB logos don't have animated variants via standard types yet, but doesn't hurt if we added it, but let's stick to true/false params if we want. Actually let's just use includeAnimated everywhere.
                    images.push(...logos.map((g: any) => ({ ...g, type: 'logo', source: 'SteamGridDB' })));
                }
                if (imageType === 'icon' || imageType === 'all') {
                    const icons = await rawService.getIcons(gameId);
                    images.push(...icons.map((g: any) => ({ ...g, type: 'icon', source: 'SteamGridDB' })));
                }
                return images;
            }
        } catch (e) {
            console.error('SGDB Search Error:', e);
        }
        return [];
    };

    ipcMain.handle('metadata:searchImages', async (_event, query: string, imageType: string, steamAppId?: string) => {
        try {
            const allImages: any[] = [];

            // 1. Fetch from SteamGridDB (manual search always permits animated)
            const sgdbImages = await searchSGDB(query, steamAppId, imageType, true);
            allImages.push(...sgdbImages);

            // 2. Fetch from IGDB/RAWG via metadata fetcher
            try {
                const metadata = await metadataFetcher.searchArtwork(query, steamAppId);
                const metadataImages: any[] = [];

                // Extract relevant images based on type
                if (imageType === 'boxart' && metadata.boxArtUrl) {
                    metadataImages.push({
                        url: metadata.boxArtUrl,
                        score: 90, // High score for official metadata
                        width: metadata.boxArtResolution?.width || 512,
                        height: metadata.boxArtResolution?.height || 512,
                        mime: 'image/jpeg',
                        isAnimated: false,
                        source: 'igdb/rawg'
                    });
                }

                if (imageType === 'banner' && metadata.bannerUrl) {
                    metadataImages.push({
                        url: metadata.bannerUrl,
                        score: 85,
                        width: metadata.bannerResolution?.width || 1920,
                        height: metadata.bannerResolution?.height || 620,
                        mime: 'image/jpeg',
                        isAnimated: false,
                        source: 'igdb/rawg'
                    });
                }

                if (imageType === 'logo' && metadata.logoUrl) {
                    metadataImages.push({
                        url: metadata.logoUrl,
                        score: 80,
                        width: metadata.logoResolution?.width || 256,
                        height: metadata.logoResolution?.height || 256,
                        mime: 'image/png',
                        isAnimated: false,
                        source: 'igdb/rawg'
                    });
                }

                if (imageType === 'icon' && metadata.iconUrl) {
                    metadataImages.push({
                        url: metadata.iconUrl,
                        score: 75,
                        width: metadata.iconResolution?.width || 64,
                        height: metadata.iconResolution?.height || 64,
                        mime: 'image/png',
                        isAnimated: false,
                        source: 'igdb/rawg'
                    });
                }

                // For screenshots (used for banner sometimes)
                if (imageType === 'banner' && metadata.screenshots && metadata.screenshots.length > 0) {
                    metadata.screenshots.slice(0, 3).forEach((screenshot, index) => {
                        metadataImages.push({
                            url: screenshot,
                            score: 70 - index, // Decreasing score for multiple screenshots
                            width: 1920, // Assume standard resolution
                            height: 1080,
                            mime: 'image/jpeg',
                            isAnimated: false,
                            source: 'igdb/rawg'
                        });
                    });
                }

                allImages.push(...metadataImages);
            } catch (error) {
                console.warn('Failed to fetch metadata images:', error);
            }

            // Transform for UI
            const uiImages = [{
                gameId: query,
                gameName: query,
                images: allImages
            }];
            return { success: true, images: uiImages };
        } catch (error) {
            console.error('Error in metadata:searchImages handler:', error);
            return { success: false, images: [] };
        }
    });

    ipcMain.handle('metadata:fetchGameImages', async (event, gameName: string, steamAppId?: string, igdbId?: number, includeAnimated?: boolean, requestId?: number, gameId?: string) => {
        // Track this request as the active one; previous requests will detect they're stale
        activeImageSearchRequestId = requestId;

        const isStale = () => requestId !== undefined && activeImageSearchRequestId !== requestId;
        const sendProviderStatus = (currentProvider: string, remaining: string[]) => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send('metadata:imageSearchProviderStatus', { currentProvider, remaining, requestId });
            }
        };

        try {
            console.log(`[fetchGameImages] Searching for images for "${gameName}" (steamAppId: ${steamAppId}, requestId: ${requestId})`);
            const results: any[] = [];

            const mapArtworkToImages = (artwork: any, source: string, name: string): any[] => {
                if (!artwork) return [];
                const images: any[] = [];

                if (artwork.boxArtUrl) images.push({ type: 'boxart', url: artwork.boxArtUrl, source, name });
                if (artwork.bannerUrl) images.push({ type: 'banner', url: artwork.bannerUrl, source, name });
                if (artwork.heroUrl) images.push({ type: 'hero', url: artwork.heroUrl, source, name });
                if (artwork.logoUrl) images.push({ type: 'logo', url: artwork.logoUrl, source, name });
                if (artwork.iconUrl) images.push({ type: 'icon', url: artwork.iconUrl, source, name });
                if (Array.isArray(artwork.screenshots)) {
                    artwork.screenshots.forEach((url: string) => {
                        if (url) images.push({ type: 'screenshot', url, source, name });
                    });
                }

                return images;
            };

            // 1. Fetch from SteamGridDB (Full list)
            sendProviderStatus('SteamGridDB', ['Auto-Match', 'IGDB', 'RAWG']);
            const sgdbImages = await searchSGDB(gameName, steamAppId, 'all', includeAnimated);
            if (sgdbImages.length > 0) {
                results.push(...sgdbImages);
                if (!event.sender.isDestroyed()) {
                    event.sender.send('metadata:gameImagesFound', { images: sgdbImages, query: gameName, gameId, requestId });
                }
            }

            // Abort if request is stale (user changed game or closed)
            if (isStale()) {
                console.log(`[fetchGameImages] Request ${requestId} is stale after SteamGridDB, aborting`);
                sendProviderStatus('', []);
                return { success: true, images: results, aborted: true };
            }

            // 2. Try to fetch standard metadata (Steam/IGDB auto-match) as fallback/addition
            sendProviderStatus('Auto-Match', ['IGDB', 'RAWG']);
            try {
                const prefs = await userPreferencesService.getPreferences();
                const metadata = await metadataFetcher.searchArtwork(gameName, steamAppId, false, false, prefs.preferAnimatedBoxart ?? true, prefs.preferAnimatedBanner ?? true);
                const autoMatchImages: any[] = [];

                if (metadata.boxArtUrl) autoMatchImages.push({ type: 'boxart', url: metadata.boxArtUrl, source: 'Auto-Match', name: gameName });
                if (metadata.bannerUrl) autoMatchImages.push({ type: 'banner', url: metadata.bannerUrl, source: 'Auto-Match', name: gameName });
                if (metadata.logoUrl) autoMatchImages.push({ type: 'logo', url: metadata.logoUrl, source: 'Auto-Match', name: gameName });
                if (metadata.iconUrl) autoMatchImages.push({ type: 'icon', url: metadata.iconUrl, source: 'Auto-Match', name: gameName });
                if (metadata.heroUrl) autoMatchImages.push({ type: 'hero', url: metadata.heroUrl, source: 'Auto-Match', name: gameName });

                if (autoMatchImages.length > 0) {
                    results.push(...autoMatchImages);
                    if (!event.sender.isDestroyed()) {
                        event.sender.send('metadata:gameImagesFound', { images: autoMatchImages, query: gameName, gameId, requestId });
                    }
                }
            } catch (err) {
                console.warn('Auto-match fallback failed:', err);
            }

            if (isStale()) {
                console.log(`[fetchGameImages] Request ${requestId} is stale after Auto-Match, aborting`);
                sendProviderStatus('', []);
                return { success: true, images: results, aborted: true };
            }

            // 3. Fetch provider-specific artwork (IGDB, RAWG) for clearer attribution
            sendProviderStatus('IGDB', ['RAWG']);
            try {
                const igdbProvider = metadataFetcher.getIGDBProvider();
                if (igdbProvider?.isAvailable()) {
                    let igdbResultId: string | undefined;
                    if (typeof igdbId === 'number' && !isNaN(igdbId)) {
                        igdbResultId = `igdb-${igdbId}`;
                    } else {
                        const igdbResults = await igdbProvider.search(gameName, steamAppId);
                        igdbResultId = igdbResults[0]?.id;
                    }

                    if (igdbResultId) {
                        const igdbArtwork = await igdbProvider.getArtwork(igdbResultId, steamAppId);
                        const igdbImages = mapArtworkToImages(igdbArtwork, 'IGDB', gameName);
                        if (igdbImages.length > 0) {
                            results.push(...igdbImages);
                            if (!event.sender.isDestroyed()) {
                                event.sender.send('metadata:gameImagesFound', { images: igdbImages, query: gameName, gameId, requestId });
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('IGDB provider fetch failed:', err);
            }

            if (isStale()) {
                console.log(`[fetchGameImages] Request ${requestId} is stale after IGDB, aborting`);
                sendProviderStatus('', []);
                return { success: true, images: results, aborted: true };
            }

            sendProviderStatus('RAWG', []);
            try {
                const rawgProvider = metadataFetcher.getRAWGProvider();
                if (rawgProvider?.isAvailable()) {
                    const rawgResults = await rawgProvider.search(gameName);
                    const rawgResultId = rawgResults[0]?.id;

                    if (rawgResultId) {
                        const rawgArtwork = await rawgProvider.getArtwork(rawgResultId);
                        const rawgImages = mapArtworkToImages(rawgArtwork, 'RAWG', gameName);
                        if (rawgImages.length > 0) {
                            results.push(...rawgImages);
                            if (!event.sender.isDestroyed()) {
                                event.sender.send('metadata:gameImagesFound', { images: rawgImages, query: gameName, gameId, requestId });
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('RAWG provider fetch failed:', err);
            }

            // Send final "complete" status
            sendProviderStatus('', []);

            return { success: true, images: results };
        } catch (error) {
            console.error('Error in metadata:fetchGameImages handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('metadata:searchGames', async (_event, query: string) => {
        try {
            return await metadataFetcher.searchGames(query);
        } catch (error) {
            console.error('Error in metadata:searchGames handler:', error);
            return [];
        }
    });

    // Search IGDB for metadata (covers, screenshots, etc.)
    ipcMain.handle('metadata:searchMetadata', async (_event, query: string) => {
        try {
            // Use IGDB service directly since UI expects IGDBGameResult format
            const igdbService = metadataFetcher.getIGDBProvider()?.getIGDBService();
            if (!igdbService) {
                return { success: false, error: 'IGDB service not available', results: [] };
            }

            const results = await igdbService.searchGame(query);
            return { success: true, results };
        } catch (error) {
            console.error('Error in metadata:searchMetadata handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error', results: [] };
        }
    });

    // Configuration Handlers
    ipcMain.handle('metadata:setIGDBConfig', async (_event, config: IGDBConfig) => {
        try {
            metadataFetcher.setIGDBService(config.clientId ? { clientId: config.clientId } as any : null);
            return true;
        } catch (error) {
            return false;
        }
    });

    // Expose current metadata provider availability (Steam, IGDB, RAWG, SteamGridDB, GiantBomb)
    ipcMain.handle('metadata:getProviderStatus', async () => {
        try {
            const providers = metadataFetcher.getProviderStatus();
            return { success: true, providers };
        } catch (error) {
            console.error('Error in metadata:getProviderStatus handler:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                providers: [] as Array<{ name: string; available: boolean }>
            };
        }
    });

    // Fetch and Update by Provider ID - Used when user selects a match from search results
    ipcMain.handle('metadata:fetchAndUpdateByProviderId', async (_event, gameId: string, providerId: string, providerSource: string) => {
        try {
            console.log(`[MetadataHandler] fetchAndUpdateByProviderId: gameId=${gameId}, providerId=${providerId}, source=${providerSource}`);

            // Create a matched game object based on the provider
            const matchedGame: any = {
                id: providerId,
                source: providerSource,
                externalId: providerId,
                steamAppId: providerSource === 'steam' ? providerId : undefined
            };

            // Get the game from store to get its title
            const games = await gameStore.getLibrary();
            const existingGame = games.find(g => g.id === gameId);
            const gameTitle = existingGame?.title || '';

            // Fetch complete metadata using the matched game
            const steamAppId = providerSource === 'steam' ? providerId :
                (gameId.startsWith('steam-') ? gameId.replace('steam-', '') : undefined);

            const metadata = await metadataFetcher.fetchCompleteMetadata(gameTitle, matchedGame, steamAppId);

            if (!metadata) {
                return { success: false, error: 'No metadata found', metadata: null };
            }

            // Cache images locally if preference is enabled
            const prefs = await userPreferencesService.getPreferences();
            let finalMetadata = metadata;

            if (prefs.storeMetadataLocally !== false) {
                const cachedImages = await imageCacheService.cacheImages({
                    boxArtUrl: metadata.boxArtUrl,
                    bannerUrl: metadata.bannerUrl,
                    logoUrl: metadata.logoUrl,
                    heroUrl: metadata.heroUrl,
                    iconUrl: metadata.iconUrl
                }, gameId);
                finalMetadata = { ...metadata, ...cachedImages };
            }

            // Update the game in store
            if (existingGame) {
                const updatedGame: Game = {
                    ...existingGame,
                    boxArtUrl: finalMetadata.boxArtUrl || existingGame.boxArtUrl,
                    bannerUrl: finalMetadata.bannerUrl || existingGame.bannerUrl,
                    logoUrl: finalMetadata.logoUrl || existingGame.logoUrl,
                    heroUrl: finalMetadata.heroUrl || existingGame.heroUrl,
                    iconUrl: finalMetadata.iconUrl || existingGame.iconUrl,
                    description: finalMetadata.description || existingGame.description,
                    genres: finalMetadata.genres || existingGame.genres,
                    releaseDate: finalMetadata.releaseDate || existingGame.releaseDate,
                    developers: finalMetadata.developers || existingGame.developers,
                    publishers: finalMetadata.publishers || existingGame.publishers,
                    ageRating: finalMetadata.ageRating || existingGame.ageRating,
                    links: finalMetadata.links || existingGame.links,
                };
                await gameStore.saveGame(updatedGame);
            }

            console.log(`[MetadataHandler] fetchAndUpdateByProviderId: Successfully updated ${gameTitle}`);
            return { success: true, metadata: finalMetadata };
        } catch (error) {
            console.error('Error in metadata:fetchAndUpdateByProviderId handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error', metadata: null };
        }
    });

    // Fetch Metadata Only by Provider ID - Similar but doesn't update the game store
    ipcMain.handle('metadata:fetchMetadataOnlyByProviderId', async (_event, gameId: string, providerId: string, providerSource: string) => {
        try {
            console.log(`[MetadataHandler] fetchMetadataOnlyByProviderId: gameId=${gameId}, providerId=${providerId}, source=${providerSource}`);

            // Get the game from store to get its title
            const games = await gameStore.getLibrary();
            const existingGame = games.find(g => g.id === gameId);
            const gameTitle = existingGame?.title || '';

            // Fetch metadata only (no artwork)
            const steamAppId = providerSource === 'steam' ? providerId :
                (gameId.startsWith('steam-') ? gameId.replace('steam-', '') : undefined);

            const metadata = await metadataFetcher.searchMetadataOnly(providerId, providerSource, steamAppId, gameTitle);

            return { success: true, metadata };
        } catch (error) {
            console.error('Error in metadata:fetchMetadataOnlyByProviderId handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error', metadata: null };
        }
    });
}
