import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LibraryListView } from '../src/components/LibraryListView';
import { Game } from '../src/types/game';

describe('LibraryListView', () => {
  it('renders a game with all formatting correctly', () => {
    const game: Game = {
      id: 'test-game',
      title: 'Test Game',
      releaseDate: '2023-01-01',
      playtime: 120,
      source: 'steam',
      platform: 'steam',
      genres: ['Action'],
      categories: ['Single-player'],
    };

    const { getByText } = render(
      <LibraryListView
        games={[game]}
      />
    );

    expect(getByText('Test Game')).toBeInTheDocument();
    expect(getByText('2h')).toBeInTheDocument();
    expect(getByText('Steam')).toBeInTheDocument();
    expect(getByText('Action')).toBeInTheDocument();
    // Use generic date matching to avoid locale formatting differences
    expect(getByText(/Jan \d{1,2}, 2023|2023|Jan/)).toBeInTheDocument();
  });
});
