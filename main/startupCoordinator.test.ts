import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStartupCoordinator } from './startupCoordinator.js';

const listeners = new Map<string, (...args: any[]) => void>();
const handlers = new Map<string, (...args: any[]) => any>();
const addUpdateStatusListenerMock = vi.fn<(listener: (payload: any) => void) => void>();

vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn((channel: string, listener: (...args: any[]) => void) => {
      listeners.set(channel, listener);
    }),
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      handlers.set(channel, handler);
    }),
    removeListener: vi.fn((channel: string) => {
      listeners.delete(channel);
    }),
    removeHandler: vi.fn((channel: string) => {
      handlers.delete(channel);
    }),
  },
}));

describe('registerStartupCoordinator', () => {
  beforeEach(() => {
    listeners.clear();
    handlers.clear();
    addUpdateStatusListenerMock.mockReset();
  });

  it('starts the startup scan when the renderer sends app:ready', async () => {
    const performBackgroundScan = vi.fn(async () => {});
    const userPreferencesService = {
      getPreferences: vi.fn(async () => ({
        checkForUpdatesOnStartup: true,
        updateLibrariesOnStartup: true,
      })),
    };

    registerStartupCoordinator({
      appIsPackaged: false,
      userPreferencesService: userPreferencesService as any,
      winReference: { current: null },
      performBackgroundScan,
      onShowWindow: vi.fn(),
      addUpdateStatusListener: addUpdateStatusListenerMock,
      fallbackDelayMs: 60_000,
    });

    listeners.get('app:ready')?.();
    await vi.waitFor(() => {
      expect(performBackgroundScan).toHaveBeenCalledWith(true, true);
    });
  });

  it('waits for update dismissal before running the startup scan when an update is found', async () => {
    let updateListener: ((payload: { status: string }) => void) | undefined;
    addUpdateStatusListenerMock.mockImplementation((listener) => {
      updateListener = listener;
    });

    const performBackgroundScan = vi.fn(async () => {});

    registerStartupCoordinator({
      appIsPackaged: true,
      userPreferencesService: {
        getPreferences: vi.fn(async () => ({
          checkForUpdatesOnStartup: true,
          updateLibrariesOnStartup: true,
        })),
      } as any,
      winReference: { current: null },
      performBackgroundScan,
      onShowWindow: vi.fn(),
      addUpdateStatusListener: addUpdateStatusListenerMock,
      checkForUpdates: vi.fn(() => {
        updateListener?.({ status: 'available' });
      }),
      fallbackDelayMs: 60_000,
    });

    listeners.get('app:ready')?.();
    await vi.waitFor(() => {
      expect(performBackgroundScan).not.toHaveBeenCalled();
    });

    listeners.get('app:update-dismissed')?.();
    await vi.waitFor(() => {
      expect(performBackgroundScan).toHaveBeenCalledTimes(1);
    });
  });

  it('cancels the startup scan when the cancel handler is invoked', async () => {
    let resolveScan: (() => void) | null = null;
    const performBackgroundScan = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveScan = resolve;
        }),
    );

    registerStartupCoordinator({
      appIsPackaged: false,
      userPreferencesService: {
        getPreferences: vi.fn(async () => ({
          checkForUpdatesOnStartup: false,
          updateLibrariesOnStartup: true,
        })),
      } as any,
      winReference: { current: null },
      performBackgroundScan,
      onShowWindow: vi.fn(),
      addUpdateStatusListener: addUpdateStatusListenerMock,
      fallbackDelayMs: 60_000,
    });

    listeners.get('app:ready')?.();
    await vi.waitFor(() => {
      expect(performBackgroundScan).toHaveBeenCalledTimes(1);
    });

    await handlers.get('startup:cancel-scan')?.();
    resolveScan?.();
    await vi.waitFor(() => {
      expect(handlers.has('startup:cancel-scan')).toBe(true);
    });
  });
});
