import { globalShortcut, ipcMain } from 'electron';
import { ProcessSuspendService } from '../ProcessSuspendService.js';
import { UserPreferencesService } from '../UserPreferencesService.js';
import { GameStore } from '../GameStore.js';

let isSuspendShortcutRegistered = false;
let currentSuspendShortcut: string | null = null;

export function registerSuspendHandlers(
    getProcessSuspendService: () => ProcessSuspendService | null,
    userPreferencesService: UserPreferencesService,
    gameStore: GameStore,
) {
    const getShortcutFromPrefs = async (): Promise<string> => {
        const prefs = await userPreferencesService.getPreferences();
        return prefs.suspendShortcut?.trim() || 'Ctrl+Shift+S';
    };

    const isFeatureEnabled = async (): Promise<boolean> => {
        const prefs = await userPreferencesService.getPreferences();
        return prefs.enableSuspendFeature ?? false;
    };

    const persistFeatureEnabled = async (enabled: boolean): Promise<void> => {
        const prefs = await userPreferencesService.getPreferences();
        await userPreferencesService.savePreferences({
            ...prefs,
            enableSuspendFeature: enabled,
        });
    };

    const persistShortcut = async (shortcut: string): Promise<void> => {
        const prefs = await userPreferencesService.getPreferences();
        await userPreferencesService.savePreferences({
            ...prefs,
            suspendShortcut: shortcut,
        });
    };

    const unregisterSuspendShortcut = () => {
        if (isSuspendShortcutRegistered && currentSuspendShortcut) {
            globalShortcut.unregister(currentSuspendShortcut);
            console.log(`[Suspend] Unregistered shortcut: ${currentSuspendShortcut}`);
        }
        currentSuspendShortcut = null;
        isSuspendShortcutRegistered = false;
    };

    const toggleByShortcut = async () => {
        const processSuspendService = getProcessSuspendService();
        if (!processSuspendService) {
            return;
        }

        let runningGames = await processSuspendService.getRunningGames();
        if (runningGames.length === 0) {
            try {
                const library = await gameStore.getLibrary();
                await processSuspendService.discoverRunningGamesFromLibrary(
                    library.map((game) => ({
                        id: game.id,
                        title: game.title,
                        exePath: game.exePath,
                        installationDirectory: game.installationDirectory,
                    }))
                );
                runningGames = await processSuspendService.getRunningGames();
            } catch (error) {
                console.error('[Suspend] Failed to discover running games from library:', error);
            }
        }

        if (runningGames.length === 0) {
            console.log('[Suspend] Shortcut pressed but no running, discoverable games were found.');
            return;
        }

        const suspendedGame = runningGames.find(game => game.status === 'suspended');
        if (suspendedGame) {
            await processSuspendService.resumeGame(suspendedGame.gameId);
            return;
        }

        const runningGame = runningGames.find(game => game.status === 'running');
        if (runningGame) {
            await processSuspendService.suspendGame(runningGame.gameId);
        }
    };

    const registerSuspendShortcut = async () => {
        const processSuspendService = getProcessSuspendService();
        if (!processSuspendService) return;

        const enabled = await isFeatureEnabled();
        if (!enabled) {
            unregisterSuspendShortcut();
            return;
        }

        const shortcut = await getShortcutFromPrefs();
        if (isSuspendShortcutRegistered && currentSuspendShortcut === shortcut) {
            return;
        }

        unregisterSuspendShortcut();

        try {
            const success = globalShortcut.register(shortcut, () => {
                toggleByShortcut().catch((error) => {
                    console.error('[Suspend] Shortcut toggle failed:', error);
                });
            });

            if (!success) {
                throw new Error('Shortcut registration failed (already in use or invalid).');
            }

            isSuspendShortcutRegistered = true;
            currentSuspendShortcut = shortcut;
            console.log(`[Suspend] Registered shortcut: ${shortcut}`);
        } catch (error) {
            isSuspendShortcutRegistered = false;
            currentSuspendShortcut = null;
            throw error;
        }
    };

    const syncSuspendShortcutState = async () => {
        const processSuspendService = getProcessSuspendService();
        if (!processSuspendService) {
            unregisterSuspendShortcut();
            return;
        }

        if (!processSuspendService.isEnabled()) {
            unregisterSuspendShortcut();
            return;
        }

        await registerSuspendShortcut();
    };

    ipcMain.handle('suspend:getRunningGames', async () => {
        const processSuspendService = getProcessSuspendService();
        if (!processSuspendService) {
            return [];
        }
        return processSuspendService.getRunningGames();
    });

    ipcMain.handle('suspend:suspendGame', async (_event, gameId: string) => {
        const processSuspendService = getProcessSuspendService();
        if (!processSuspendService) {
            return { success: false, error: 'Suspend service unavailable' };
        }

        const enabled = await isFeatureEnabled();
        if (!enabled) {
            return { success: false, error: 'Suspend feature is disabled' };
        }

        return processSuspendService.suspendGame(gameId);
    });

    ipcMain.handle('suspend:resumeGame', async (_event, gameId: string) => {
        const processSuspendService = getProcessSuspendService();
        if (!processSuspendService) {
            return { success: false, error: 'Suspend service unavailable' };
        }

        const enabled = await isFeatureEnabled();
        if (!enabled) {
            return { success: false, error: 'Suspend feature is disabled' };
        }

        return processSuspendService.resumeGame(gameId);
    });

    ipcMain.handle('suspend:getFeatureEnabled', async () => {
        return isFeatureEnabled();
    });

    ipcMain.handle('suspend:setFeatureEnabled', async (_event, enabled: boolean) => {
        await persistFeatureEnabled(Boolean(enabled));
        await syncSuspendShortcutState();
        return { success: true };
    });

    ipcMain.handle('suspend:getShortcut', async () => {
        return await getShortcutFromPrefs();
    });

    ipcMain.handle('suspend:setShortcut', async (_event, shortcut: string) => {
        const normalizedShortcut = String(shortcut || '').trim();
        if (!normalizedShortcut) {
            return { success: false, error: 'Shortcut cannot be empty' };
        }

        await persistShortcut(normalizedShortcut);
        await syncSuspendShortcutState();
        return { success: true };
    });

    ipcMain.handle('suspend:registerShortcut', async () => {
        await registerSuspendShortcut();
        return { success: true };
    });

    ipcMain.handle('suspend:unregisterShortcut', async () => {
        unregisterSuspendShortcut();
        return { success: true };
    });

    return { registerSuspendShortcut, unregisterSuspendShortcut, syncSuspendShortcutState };
}
