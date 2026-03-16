import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

const baseGame = {
  id: 'steam-1',
  title: 'Smoke Game',
  platform: 'steam',
  exePath: 'C:\\Games\\Smoke Game\\game.exe',
  boxArtUrl: '',
  bannerUrl: '',
};

function createElectronApi() {
  const asyncNoop = vi.fn(async () => undefined);
  return {
    notifyAppReady: vi.fn(),
    onMenuEvent: vi.fn(() => () => {}),
    on: vi.fn(() => () => {}),
    off: vi.fn(),
    getPreferences: vi.fn(async () => ({
      currentResolution: '1080p',
      isFirstLaunch: false,
      hasSeenPostImportTutorial: true,
      perGameViewSizeOverridesMigrated: true,
      linkDisplayOrder: [],
      visibleLinkTypes: {},
      topBarPositions: {},
      panelWidthByView: {},
      fanartHeightByView: {},
      descriptionWidthByView: {},
      backgroundBrightnessByView: {},
      isViewFlippedByView: {},
    })),
    getLibrary: vi.fn(async () => [baseGame]),
    getVersion: vi.fn(async () => '0.7.28'),
    getName: vi.fn(async () => 'Onyx'),
    getAppProfile: vi.fn(async () => 'production'),
    isPackaged: vi.fn(async () => false),
    getBaselineDefaults: vi.fn(async () => null),
    savePreferences: vi.fn(async () => ({ success: true })),
    saveGame: vi.fn(async () => true),
    reorderGames: vi.fn(async () => true),
    deleteGame: vi.fn(async () => true),
    addCustomGame: vi.fn(async () => null),
    migratePerGameViewSizeOverrides: vi.fn(async () => ({ success: false, overrides: {} })),
    requestExit: vi.fn(async () => ({ shouldMinimizeToTray: false, canMinimizeToTray: false })),
    checkProcessExists: vi.fn(async () => false),
    minimizeWindow: asyncNoop,
    restoreWindow: asyncNoop,
    exit: asyncNoop,
    minimizeToTray: asyncNoop,
    clearLibrary: vi.fn(async () => ({ success: true })),
    clearAllImages: vi.fn(async () => ({ success: true })),
    clearAllLinks: vi.fn(async () => ({ success: true })),
    removeMissingGames: vi.fn(async () => ({ success: true, removedCount: 0 })),
    showWindow: vi.fn(),
    cancelStartupScan: vi.fn(async () => ({ success: true })),
    searchArtwork: vi.fn(async () => null),
    searchImages: vi.fn(async () => ({ success: true, images: [] })),
    getAPICredentials: vi.fn(async () => ({})),
    openExternal: asyncNoop,
    toggleDevTools: asyncNoop,
    pauseBackgroundScan: asyncNoop,
    resumeBackgroundScan: asyncNoop,
    fullscreen: {
      getState: vi.fn(async () => ({ isFullscreen: false })),
      isMinimized: vi.fn(async () => ({ isMinimized: false })),
      onChanged: vi.fn(() => () => {}),
      toggle: asyncNoop,
      enter: asyncNoop,
      exit: asyncNoop,
    },
    scanning: {
      gameStarted: asyncNoop,
      gameStopped: asyncNoop,
    },
    suspend: {
      getFeatureEnabled: vi.fn(async () => false),
      getRunningGames: vi.fn(async () => []),
      resumeGame: vi.fn(async () => ({ success: true })),
    },
    optimization: {
      getStatus: vi.fn(async () => ({ hasActivity: false, jobs: [] })),
      getDiagnostics: vi.fn(async () => undefined),
      onStatus: vi.fn(() => () => {}),
    },
  };
}

describe('App shell smoke', () => {
  beforeEach(() => {
    vi.stubGlobal('__BUILD_PROFILE__', 'production');
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: createElectronApi(),
    });
  });

  it('signals readiness and renders the initial library shell', async () => {
    render(<App />);

    await screen.findByText('Smoke Game');
    expect(window.electronAPI.notifyAppReady).toHaveBeenCalled();
  });
});
