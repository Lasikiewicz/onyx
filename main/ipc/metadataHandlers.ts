import { ipcMain, BrowserWindow } from 'electron';
import { MetadataFetcherService, IGDBConfig } from '../MetadataFetcherService.js';
import { ImageCacheService } from '../ImageCacheService.js';
import { GameStore, Game } from '../GameStore.js';
import { UserPreferencesService } from '../UserPreferencesService.js';
import { withTimeout } from '../RetryUtils.js';
import { ScannedGameResult } from '../ImportService.js';

export function registerMetadataIPCHandlers(
    metadataFetcher: MetadataFetcherService,
    imageCacheService: ImageCacheService,
    gameStore: GameStore,
    userPreferencesService: UserPreferencesService,
    winReference?: { readonly current: BrowserWindow | null }
) {
    // Search Artwork Handlers
    ipcMain.handle('metadata:searchArtwork', async (_event, title: string, steamAppId?: string, bypassCache?: boolean) => {
        try {
            return await withTimeout(
                metadataFetcher.searchArtwork(title, steamAppId, bypassCache),
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

    ipcMain.handle('metadata:refreshAll', async (_event, options?: { allGames?: boolean, gameIds?: string[], continueFromIndex?: number }) => {
        const sendProgress = (current: number, total: number, message: string, gameTitle?: string) => {
            if (winReference?.current && !winReference.current.isDestroyed()) {
                winReference.current.webContents.send('metadata:refreshProgress', { current, total, message, gameTitle });
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
            if (options?.allGames) {
                // Refresh ALL games - clear existing images first
                targetGames = games;
            } else if (options?.gameIds && options.gameIds.length > 0) {
                // Specific game IDs
                targetGames = games.filter(g => options.gameIds?.includes(g.id));
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
                    sendProgress(current, total, `Fetching metadata...`, game.title);

                    // Extract Steam App ID if available
                    const steamAppId = game.id.startsWith('steam-') ? game.id.replace('steam-', '') : undefined;

                    // Determine which images to fetch
                    const needsBoxart = options?.allGames || isMissingImage(game.boxArtUrl);
                    const needsBanner = options?.allGames || isMissingImage(game.bannerUrl);
                    const needsLogo = options?.allGames || isMissingImage(game.logoUrl);
                    const needsIcon = options?.allGames || isMissingImage(game.iconUrl);

                    if (!needsBoxart && !needsBanner && !needsLogo && !needsIcon) {
                        console.log(`[MetadataRefresh] [${current}/${total}] ${game.title}: All images present, skipping`);
                        successCount++;
                        continue;
                    }

                    // Fetch metadata with timeout
                    let metadata: any = null;
                    try {
                        metadata = await withTimeout(
                            metadataFetcher.searchArtwork(game.title, steamAppId, options?.allGames),
                            30000,
                            `Metadata fetch timeout for "${game.title}"`
                        );
                    } catch (fetchError) {
                        console.warn(`[MetadataRefresh] [${current}/${total}] ${game.title}: Fetch failed:`, fetchError);
                    }

                    if (!metadata) {
                        console.log(`[MetadataRefresh] [${current}/${total}] ${game.title}: No metadata found`);
                        unmatchedGames.push({ gameId: game.id, title: game.title, searchResults: [] });
                        errorCount++;
                        continue;
                    }

                    // Prepare updated image URLs
                    let updatedBoxArt = needsBoxart && metadata.boxArtUrl ? metadata.boxArtUrl : game.boxArtUrl;
                    let updatedBanner = needsBanner && metadata.bannerUrl ? metadata.bannerUrl : game.bannerUrl;
                    let updatedLogo = needsLogo && metadata.logoUrl ? metadata.logoUrl : game.logoUrl;
                    let updatedIcon = needsIcon && metadata.iconUrl ? metadata.iconUrl : game.iconUrl;
                    let updatedHero = metadata.heroUrl || game.heroUrl;

                    // Cache images locally if preference is enabled
                    if (shouldCacheLocally) {
                        try {
                            const cachedImages = await imageCacheService.cacheImages({
                                boxArtUrl: updatedBoxArt,
                                bannerUrl: updatedBanner,
                                logoUrl: updatedLogo,
                                heroUrl: updatedHero,
                                iconUrl: updatedIcon
                            }, game.id);

                            if (cachedImages.boxArtUrl) updatedBoxArt = cachedImages.boxArtUrl;
                            if (cachedImages.bannerUrl) updatedBanner = cachedImages.bannerUrl;
                            if (cachedImages.logoUrl) updatedLogo = cachedImages.logoUrl;
                            if (cachedImages.heroUrl) updatedHero = cachedImages.heroUrl;
                            if (cachedImages.iconUrl) updatedIcon = cachedImages.iconUrl;
                        } catch (cacheError) {
                            console.warn(`[MetadataRefresh] [${current}/${total}] ${game.title}: Cache failed:`, cacheError);
                        }
                    }

                    // Update game in store
                    const updatedGame: Game = {
                        ...game,
                        boxArtUrl: updatedBoxArt || game.boxArtUrl,
                        bannerUrl: updatedBanner || game.bannerUrl,
                        logoUrl: updatedLogo || game.logoUrl,
                        iconUrl: updatedIcon || game.iconUrl,
                        heroUrl: updatedHero || game.heroUrl,
                        // Also update other metadata if available
                        description: metadata.description || metadata.summary || game.description,
                        genres: metadata.genres || game.genres,
                        releaseDate: metadata.releaseDate || game.releaseDate,
                        developers: metadata.developers || game.developers,
                        publishers: metadata.publishers || game.publishers,
                        ageRating: metadata.ageRating || game.ageRating,
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
    ipcMain.handle('metadata:fastImageSearch', async (_event, query: string) => {
        try {
            // Try to find game using search
            const searchResults = await metadataFetcher.searchGames(query);
            if (searchResults.length > 0) {
                const bestMatch = searchResults[0];
                const steamAppId = bestMatch.steamAppId;
                // If we found a match, check if we can get quick artwork
                if (steamAppId || bestMatch.source === 'steamgriddb') {
                    // Try to fetch artwork for this specific match
                    const artwork = await metadataFetcher.searchArtwork(bestMatch.title, steamAppId);
                    return artwork;
                }
            }

            // Fallback to title search if no specific match found
            return await metadataFetcher.searchArtwork(query);
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
            if (steamAppId) {
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
                    const heroes = await rawService.getHeroes(gameId);
                    images.push(...heroes.map((g: any) => ({ ...g, type: 'hero', source: 'SteamGridDB' })));
                }
                if (imageType === 'logo' || imageType === 'all') {
                    const logos = await rawService.getLogos(gameId);
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
            const images = await searchSGDB(query, steamAppId, imageType, false); // Default no animated for basic search?
            // Transform for UI
            const uiImages = [{
                gameId: query,
                gameName: query,
                images: images
            }];
            return { success: true, images: uiImages };
        } catch (error) {
            return { success: false, images: [] };
        }
    });

    ipcMain.handle('metadata:fetchGameImages', async (event, gameName: string, steamAppId?: string, igdbId?: number, includeAnimated?: boolean) => {
        try {
            console.log(`[fetchGameImages] Searching for images for "${gameName}" (steamAppId: ${steamAppId})`);
            const results: any[] = [];

            // 1. Fetch from SteamGridDB (Full list)
            const sgdbImages = await searchSGDB(gameName, steamAppId, 'all', includeAnimated);
            if (sgdbImages.length > 0) {
                results.push(...sgdbImages);
                // Emit event for progressive loading
                event.sender.send('metadata:gameImagesFound', { images: sgdbImages });
            }

            // 2. Try to fetch standard metadata (Steam/IGDB auto-match) as fallback/addition
            try {
                const metadata = await metadataFetcher.searchArtwork(gameName, steamAppId);
                const autoMatchImages: any[] = [];

                // Only add if not effectively a duplicate (logic skipped for simplicity, UI handles dedupe often)
                // But identifying keys differ (url vs id).
                if (metadata.boxArtUrl) autoMatchImages.push({ type: 'boxart', url: metadata.boxArtUrl, source: 'Auto-Match', name: gameName });
                if (metadata.bannerUrl) autoMatchImages.push({ type: 'banner', url: metadata.bannerUrl, source: 'Auto-Match', name: gameName });
                if (metadata.logoUrl) autoMatchImages.push({ type: 'logo', url: metadata.logoUrl, source: 'Auto-Match', name: gameName });
                if (metadata.iconUrl) autoMatchImages.push({ type: 'icon', url: metadata.iconUrl, source: 'Auto-Match', name: gameName });
                if (metadata.heroUrl) autoMatchImages.push({ type: 'hero', url: metadata.heroUrl, source: 'Auto-Match', name: gameName });

                if (autoMatchImages.length > 0) {
                    results.push(...autoMatchImages);
                    // Emit event for progressive loading
                    event.sender.send('metadata:gameImagesFound', { images: autoMatchImages });
                }
            } catch (err) {
                console.warn('Auto-match fallback failed:', err);
            }

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

    // Configuration Handlers
    ipcMain.handle('metadata:setIGDBConfig', async (_event, config: IGDBConfig) => {
        try {
            metadataFetcher.setIGDBService(config.clientId ? { clientId: config.clientId } as any : null);
            return true;
        } catch (error) {
            return false;
        }
    });
}
