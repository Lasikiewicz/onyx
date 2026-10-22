import { BrowserWindow, globalShortcut, ipcMain, Notification } from 'electron';
import { ProcessSuspendService } from '../ProcessSuspendService.js';
import { UserPreferencesService } from '../UserPreferencesService.js';
import { GameStore } from '../GameStore.js';
import { pickShortcutTarget } from '../suspendTargets.js';

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

        // Nyrna's hotkey toggles the foreground window. Do that before any process-list
        // scan so the suspend is not delayed by a full CIM query. Fall back to a tracked
        // library game only when no foreground process can be read.
        const foreground = await processSuspendService.toggleForeground(() => {
            for (const win of BrowserWindow.getAllWindows()) {
                if (!win.isDestroyed()) win.minimize();
            }
        });
        if (foreground.error !== 'Could not find a foreground window to suspend.') {
            if (foreground.success) {
                const verb = foreground.action === 'resume' ? 'Resumed' : 'Suspended';
                notifySuspend(`${verb} ${foreground.title || 'the foreground window'}.`);
            } else {
                notifySuspend(foreground.error || 'Suspend/resume failed.');
            }
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

        const target = pickShortcutTarget(runningGames);
        if (!target) {
            console.log('[Suspend] Shortcut pressed but no running, discoverable games were found.');
            notifySuspend('No foreground window or tracked game is available to suspend.');
            return;
        }

        const result = target.action === 'resume'
            ? await processSuspendService.resumeGame(target.game.gameId)
            : await processSuspendService.suspendGame(target.game.gameId);
        if (result.success) {
            const verb = target.action === 'resume' ? 'Resumed' : 'Suspended';
            notifySuspend(`${verb} ${target.game.title}.`);
            return;
        }
        notifySuspend(result.error || `Could not ${target.action} ${target.game.title}.`);
    };

    const notifySuspend = (body: string) => {
        try {
            if (!Notification.isSupported()) return;
            new Notification({ title: 'Onyx', body }).show();
        } catch (error) {
            console.error('[Suspend] Notification failed:', error);
        }
    };

    const normalizeGameId = (gameId: unknown): string | null => {
        if (typeof gameId !== 'string') return null;
        const trimmed = gameId.trim();
        if (!trimmed || trimmed.length > 256) return null;
        return trimmed;
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

    ipcMain.handle('suspend:suspendGame', async (_event, gameId: unknown) => {
        const processSuspendService = getProcessSuspendService();
        if (!processSuspendService) {
            return { success: false, error: 'Suspend service unavailable' };
        }

        const enabled = await isFeatureEnabled();
        if (!enabled) {
            return { success: false, error: 'Suspend feature is disabled' };
        }

        const normalizedGameId = normalizeGameId(gameId);
        if (!normalizedGameId) {
            return { success: false, error: 'Invalid game id' };
        }

        return processSuspendService.suspendGame(normalizedGameId);
    });

    ipcMain.handle('suspend:resumeGame', async (_event, gameId: unknown) => {
        const processSuspendService = getProcessSuspendService();
        if (!processSuspendService) {
            return { success: false, error: 'Suspend service unavailable' };
        }

        const enabled = await isFeatureEnabled();
        if (!enabled) {
            return { success: false, error: 'Suspend feature is disabled' };
        }

        const normalizedGameId = normalizeGameId(gameId);
        if (!normalizedGameId) {
            return { success: false, error: 'Invalid game id' };
        }

        return processSuspendService.resumeGame(normalizedGameId);
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
