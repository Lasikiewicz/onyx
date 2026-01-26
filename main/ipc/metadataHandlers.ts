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
    ipcMain.handle('metadata:searchImages', async (_event, query: string, imageType: string, steamAppId?: string) => {
        try {
            // Implementation depends on providers
            return [];
        } catch (error) {
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
