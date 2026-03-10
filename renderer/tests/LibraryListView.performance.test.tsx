import React from 'react';
import { render } from '@testing-library/react';
import { LibraryListView } from '../src/components/LibraryListView';
import { describe, it, expect } from 'vitest';

const mockGames = [
  { id: '1', title: 'Test Game 1', platform: 'steam', playtime: 120, releaseDate: '2023-01-01', genres: ['Action'], categories: ['Single-player'], description: 'A great test game', logoUrl: 'https://via.placeholder.com/150' },
  { id: '2', title: 'Test Game 2', platform: 'epic', playtime: 60, releaseDate: '2023-02-01', genres: ['Adventure'], categories: ['Multiplayer'], description: 'Another great test game', logoUrl: 'https://via.placeholder.com/150' },
  { id: '3', title: 'Test Game 3', platform: 'gog', playtime: 30, releaseDate: '2023-03-01', genres: ['RPG'], categories: ['Co-op'], description: 'Yet another great test game', logoUrl: 'https://via.placeholder.com/150' }
];

describe('LibraryListView Performance verification', () => {
  it('renders list items with correct contentVisibility and containIntrinsicSize for performance', () => {
    const { container } = render(
      <LibraryListView
        games={mockGames}
        listViewOptions={{
          displayMode: 'logo-only',
          showDescription: true,
          showCategories: false,
          showPlaytime: true,
          showReleaseDate: true,
          showGenres: true,
          showPlatform: false,
          showLauncher: true,
          showLogos: false,
          titleTextSize: 18,
          tileHeight: 128,
          boxartSize: 96,
        }}
      />
    );

    const gameCards = container.querySelectorAll('[data-game-card="true"]');
    expect(gameCards.length).toBe(3);

    gameCards.forEach(card => {
      // Validate that contentVisibility and containIntrinsicSize are applied correctly on each container wrapper
      expect((card as HTMLElement).style.contentVisibility).toBe('auto');
      expect((card as HTMLElement).style.containIntrinsicSize).toContain('px'); // Check it's correctly calculated
    });
  });
});