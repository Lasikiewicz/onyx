import { globalShortcut, type BrowserWindow } from 'electron';
import { decideWakeShortcut } from './acceleratorConflict';
import { focusOnyxWindow } from './bigScreenWindow';
import { startXInputGuideWatch } from './xinputGuidePoller';
import type { UserPreferencesService } from './UserPreferencesService';

interface BringToFrontDeps {
  getWindow: () => BrowserWindow | null;
  userPreferencesService: UserPreferencesService;
}

export interface BringToFrontSyncResult {
  shortcutRequested: boolean;
  shortcutRegistered: boolean;
  shortcut?: string;
  reason?: string;
  guideEnabled: boolean;
}

let registeredShortcut: string | null = null;
let guideWatch: { stop: () => void } | null = null;
let lastGuideAt = 0;

function unregisterShortcut(): void {
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut);
    registeredShortcut = null;
  }
}

function stopGuideWatch(): void {
  guideWatch?.stop();
  guideWatch = null;
}

function raiseWindow(getWindow: () => BrowserWindow | null): void {
  const now = Date.now();
  if (now - lastGuideAt < 800) return;
  lastGuideAt = now;
  focusOnyxWindow(getWindow());
}

export async function syncBringToFront(deps: BringToFrontDeps): Promise<BringToFrontSyncResult> {
  const prefs = await deps.userPreferencesService.getPreferences();
  unregisterShortcut();
  stopGuideWatch();

  const requested = prefs.bringToFrontShortcut?.trim() || 'Ctrl+Shift+G';
  const decision = decideWakeShortcut({
    enabled: prefs.enableBringToFrontShortcut !== false,
    requested,
    suspendShortcut: prefs.suspendShortcut?.trim() || 'Ctrl+Shift+S',
    suspendEnabled: prefs.enableSuspendFeature === true,
  });

  let shortcutRegistered = false;
  let reason = decision.reason;
  if (decision.register) {
    try {
      shortcutRegistered = globalShortcut.register(decision.register, () => {
        focusOnyxWindow(deps.getWindow());
      });
      if (shortcutRegistered) {
        registeredShortcut = decision.register;
      } else {
        reason = `Could not register ${decision.register}. Another application is already using it.`;
      }
    } catch (error) {
      shortcutRegistered = false;
      reason = error instanceof Error ? error.message : 'Could not register the bring-to-front shortcut.';
    }
  }

  const guideEnabled = prefs.enableGuideButtonWake !== false && process.platform === 'win32';
  if (guideEnabled) {
    guideWatch = startXInputGuideWatch(() => raiseWindow(deps.getWindow));
  }

  if (reason) {
    console.warn(`[Gamepad] ${reason}`);
  }

  return {
    shortcutRequested: prefs.enableBringToFrontShortcut !== false,
    shortcutRegistered,
    shortcut: decision.register ?? undefined,
    reason,
    guideEnabled: guideEnabled && guideWatch !== null,
  };
}

export function stopBringToFront(): void {
  unregisterShortcut();
  stopGuideWatch();
}
