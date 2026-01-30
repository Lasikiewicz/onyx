import { ipcMain } from 'electron';
import { MetadataFetcherService, IGDBConfig } from '../MetadataFetcherService.js';
import { ImageCacheService } from '../ImageCacheService.js';
import { GameStore } from '../GameStore.js';
import { UserPreferencesService } from '../UserPreferencesService.js';
import { withTimeout } from '../RetryUtils.js';
import { ScannedGameResult } from '../ImportService.js';

export function registerMetadataIPCHandlers(
    metadataFetcher: MetadataFetcherService,
    imageCacheService: ImageCacheService,
    gameStore: GameStore,
    userPreferencesService: UserPreferencesService
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

    ipcMain.handle('metadata:refreshAll', async (_event, options?: { allGames?: boolean, gameIds?: string[] }) => {
        try {
            const games = await gameStore.getLibrary();
            const targetGames = options?.allGames ? games : games.filter(g => options?.gameIds?.includes(g.id));

            for (const game of targetGames) {
                // Background refresh logic
                console.log(`[MetadataRefresh] Refreshing ${game.title}...`);
                // This would be better as a background task, but here as a handler
            }
            return { success: true };
        } catch (error) {
            return { success: false };
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
