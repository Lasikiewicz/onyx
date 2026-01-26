import { ipcMain, dialog } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { SteamService } from '../SteamService.js';
import { XboxService } from '../XboxService.js';
import { GameStore, Game } from '../GameStore.js';
import { ImageCacheService } from '../ImageCacheService.js';

export function registerGameIPCHandlers(
    steamService: SteamService,
    xboxService: XboxService,
    gameStore: GameStore,
    imageCacheService: ImageCacheService
) {
    // Steam Service Handlers
    ipcMain.handle('steam:scanGames', async () => {
        try {
            let steamPath: string;
            try {
                steamPath = steamService.getSteamPath();
            } catch (pathError) {
                console.warn('Steam path not yet configured');
                return [];
            }

            if (!existsSync(steamPath)) {
                console.warn(`Steam path does not exist: ${steamPath}`);
                return [];
            }

            return steamService.scanSteamGames();
        } catch (error) {
            console.error('Error in steam:scanGames handler:', error);
            return [];
        }
    });

    ipcMain.handle('steam:getSteamPath', () => {
        try {
            return steamService.getSteamPath();
        } catch (error) {
            return '';
        }
    });

    ipcMain.handle('steam:setSteamPath', async (_event, path: string) => {
        steamService.setSteamPath(path);
        return { success: true };
    });

    ipcMain.handle('steam:scanGamesWithPath', async (_event, scanPath?: string, autoMerge: boolean = false) => {
        try {
            const games = steamService.scanSteamGames();
            if (autoMerge) {
                await gameStore.mergeSteamGames(games, imageCacheService, true);
            }
            return games;
        } catch (error) {
            console.error('Error in steam:scanGamesWithPath handler:', error);
            return [];
        }
    });

    ipcMain.handle('steam:importAllGames', async (_event, scanPath?: string) => {
        const games = steamService.scanSteamGames();
        await gameStore.mergeSteamGames(games, imageCacheService, true);
        return { success: true, count: games.length };
    });

    ipcMain.handle('steam:syncPlaytime', async () => {
        try {
            // SteamService doesn't have a direct syncPlaytimeWithGames method in this version,
            // so this would need to fetch playtime per game and update.
            // Placeholder returning success for now to avoid crashes.
            return { success: true };
        } catch (error) {
            console.error('Error in steam:syncPlaytime handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Xbox Service Handlers
    ipcMain.handle('xbox:scanGames', async (_event, path: string, autoMerge: boolean = false) => {
        try {
            const games = await xboxService.scanGames(path);
            if (autoMerge) {
                // Merge logic if needed
            }
            return games;
        } catch (error) {
            console.error('Error in xbox:scanGames handler:', error);
            return [];
        }
    });

    // GameStore Handlers
    ipcMain.handle('gameStore:getLibrary', async () => {
        try {
            const library = await gameStore.getLibrary();
            // Validate and fix onyx-local:// URLs on the fly
            const validatedLibrary = await Promise.all(library.map(async (game) => {
                const validatedGame = { ...game };
                let needsUpdate = false;

                const imageTypes = ['boxart', 'banner', 'logo', 'hero'] as const;
                for (const type of imageTypes) {
                    const urlKey = type === 'boxart' ? 'boxArtUrl' : type === 'banner' ? 'bannerUrl' : type === 'logo' ? 'logoUrl' : 'heroUrl';
                    const url = validatedGame[urlKey];

                    if (url?.startsWith('onyx-local://')) {
                        const fixed = await imageCacheService.cacheImage(url, game.id, type);
                        if (fixed && fixed !== url && fixed !== '') {
                            validatedGame[urlKey] = fixed;
                            needsUpdate = true;
                        } else if (!fixed || fixed === '') {
                            const foundFile = await imageCacheService.findCachedImage(game.id, type);
                            if (foundFile) {
                                validatedGame[urlKey] = foundFile;
                                needsUpdate = true;
                            }
                        }
                    }
                }

                if (needsUpdate) {
                    await gameStore.updateGameMetadata(
                        game.id,
                        validatedGame.boxArtUrl || '',
                        validatedGame.bannerUrl || '',
                        validatedGame.logoUrl,
                        validatedGame.heroUrl
                    );
                }

                return validatedGame;
            }));

            return validatedLibrary;
        } catch (error) {
            console.error('Error in gameStore:getLibrary handler:', error);
            return [];
        }
    });

    ipcMain.handle('gameStore:saveGame', async (_event, game: Game, oldGame?: Game) => {
        try {
            if (oldGame && oldGame.id !== game.id) {
                await gameStore.deleteGame(oldGame.id);
            }

            const cachedImages = await imageCacheService.cacheImages({
                boxArtUrl: game.boxArtUrl,
                bannerUrl: game.bannerUrl,
                logoUrl: game.logoUrl,
                heroUrl: game.heroUrl,
            }, game.id);

            const gameWithCachedImages: Game = {
                ...game,
                boxArtUrl: cachedImages.boxArtUrl || game.boxArtUrl,
                bannerUrl: cachedImages.bannerUrl || game.bannerUrl,
                logoUrl: cachedImages.logoUrl || game.logoUrl,
                heroUrl: cachedImages.heroUrl || game.heroUrl,
            };

            await gameStore.saveGame(gameWithCachedImages);
            return true;
        } catch (error) {
            console.error('Error in gameStore:saveGame handler:', error);
            return false;
        }
    });

    ipcMain.handle('gameStore:reorderGames', async (_event, games: Game[]) => {
        try {
            await gameStore.reorderGames(games);
            return true;
        } catch (error) {
            return false;
        }
    });

    ipcMain.handle('gameStore:deleteGame', async (_event, gameId: string) => {
        try {
            await gameStore.deleteGame(gameId);
            return true;
        } catch (error) {
            return false;
        }
    });

    ipcMain.handle('gameStore:addCustomGame', async (_event, gameData: { title: string; exePath: string }) => {
        try {
            await gameStore.saveGame({
                id: `custom-${Date.now()}`,
                title: gameData.title,
                exePath: gameData.exePath,
                platform: 'other',
                boxArtUrl: '',
                bannerUrl: '',
                status: 'ready'
            } as Game);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('gameStore:removeWinGDKGames', async () => {
        const removedCount = await gameStore.removeMissingGames(); // Reusing removeMissingGames logic or dedicated one
        return { success: true, removedCount };
    });

    // ImageCache Handlers
    ipcMain.handle('imageCache:deleteImage', async (_event, gameId: string, imageType: string) => {
        try {
            await imageCacheService.deleteCachedImage(gameId, imageType as any);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Dialog Handlers (Moved here for convenience if no uiHandlers.ts exists yet)
    ipcMain.handle('dialog:showOpenDialog', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openFile'] });
        return result.filePaths[0] || null;
    });

    ipcMain.handle('dialog:showFolderDialog', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        return result.filePaths[0] || null;
    });

    ipcMain.handle('dialog:showImageDialog', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'ico', 'svg'] }]
        });
        return result.filePaths[0] || null;
    });
}
