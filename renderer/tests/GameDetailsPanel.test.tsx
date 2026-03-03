import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameDetailsPanel } from '../src/components/GameDetailsPanel';
import { Game } from '../src/types/game';

describe('GameDetailsPanel', () => {
  beforeAll(() => {
    // Mock electronAPI globally
    (window as any).electronAPI = {
      getPreferences: vi.fn().mockResolvedValue({}),
      savePreferences: vi.fn(),
      launchGame: vi.fn(),
    };
  });

  it('renders game details correctly', () => {
    const game: Game = {
      id: 'test-game',
      title: 'Test Game',
      releaseDate: '2023-01-01',
      platform: 'steam',
      description: 'A test game description',
    };

    const { getByText } = render(
      <GameDetailsPanel
        game={game}
        viewMode="grid"
      />
    );

  });
});
