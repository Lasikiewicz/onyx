import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameDetailsPanel } from './GameDetailsPanel';
import type { Game } from '../types/game';

const electronApiMock = {
  getPreferences: vi.fn(async () => ({})),
  savePreferences: vi.fn(async () => undefined),
  launchModManager: vi.fn(async () => ({ success: true })),
};

const baseGame: Game = {
  id: 'game-1',
  title: 'Fallback Title Game',
  platform: 'steam',
  exePath: 'C:\\Games\\Fallback Title Game\\game.exe',
  boxArtUrl: '',
  bannerUrl: '',
  description: '<p>A test description.</p>',
};

describe('GameDetailsPanel rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: electronApiMock,
    });
  });

  it('renders a fallback title when the game has no logo', async () => {
    render(<GameDetailsPanel game={baseGame} viewMode="grid" />);

    const title = await screen.findByText('Fallback Title Game');
    expect(title).toBeTruthy();
  });

  it('does not render Invalid Date for malformed release dates', async () => {
    render(
      <GameDetailsPanel
        game={{ ...baseGame, id: 'game-2', releaseDate: 'not-a-real-date' }}
        viewMode="grid"
      />
    );

    await screen.findByText('Fallback Title Game');
    expect(screen.queryByText('Release Date')).toBeNull();
    expect(screen.queryByText('Invalid Date')).toBeNull();
  });

  it('formats install size from bytes to GB in the details column', async () => {
    render(
      <GameDetailsPanel
        game={{
          ...baseGame,
          id: 'game-3',
          installationDirectory: 'C:\\Games\\Fallback Title Game',
          installSize: 15 * 1024 * 1024 * 1024,
        }}
        viewMode="grid"
      />
    );

    expect(await screen.findByText('Installation Folder')).toBeTruthy();
    expect(screen.getByText('15 GB')).toBeTruthy();
  });
});
