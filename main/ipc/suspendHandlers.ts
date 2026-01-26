import { globalShortcut, ipcMain } from 'electron';
import { ProcessSuspendService } from '../ProcessSuspendService.js';

let isSuspendShortcutRegistered = false;

export function registerSuspendHandlers(processSuspendService: ProcessSuspendService | null) {
    const registerSuspendShortcut = async () => {
        if (!processSuspendService || isSuspendShortcutRegistered) return;

        try {
            const shortcut = 'Ctrl+Alt+S'; // Example shortcut
            const success = globalShortcut.register(shortcut, () => {
                console.log('[Suspend] Shortcut pressed!');
                // Logic to suspend active game
            });

            if (success) {
                isSuspendShortcutRegistered = true;
                console.log(`[Suspend] Registered shortcut: ${shortcut}`);
            } else {
                console.error(`[Suspend] Failed to register shortcut: ${shortcut}`);
            }
        } catch (error) {
            console.error('[Suspend] Error registering shortcut:', error);
        }
    };

    const unregisterSuspendShortcut = () => {
        if (isSuspendShortcutRegistered) {
            globalShortcut.unregisterAll();
            isSuspendShortcutRegistered = false;
            console.log('[Suspend] Unregistered all global shortcuts');
        }
    };

    ipcMain.handle('suspend:registerShortcut', async () => {
        await registerSuspendShortcut();
        return { success: true };
    });

    ipcMain.handle('suspend:unregisterShortcut', async () => {
        unregisterSuspendShortcut();
        return { success: true };
    });

    return { registerSuspendShortcut, unregisterSuspendShortcut };
}
