import { test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LibraryListView } from '../src/components/LibraryListView';
import { Game } from '../src/types/game';

test('LibraryListView images should have loading="lazy"', () => {
  const games: Game[] = [
    {
      id: '1',
      title: 'Test Game 1',
      platform: 'pc',
      boxArtUrl: 'http://test.com/boxart.jpg',
      logoUrl: 'http://test.com/logo.png',
      iconUrl: 'http://test.com/icon.png'
    }
  ];

  const { container, rerender } = render(
    <LibraryListView
      games={games}
      listViewOptions={{
        displayMode: 'boxart-title',
        showDescription: true,
        showCategories: false,
        showPlaytime: true,
        showReleaseDate: true,
        showGenres: true,
        showPlatform: false,
      }}
    />
  );

  let img = container.querySelector('img');
  expect(img).not.toBeNull();
  expect(img?.getAttribute('loading')).toBe('lazy');

  rerender(
    <LibraryListView
      games={games}
      listViewOptions={{
        displayMode: 'logo-title',
        showDescription: true,
        showCategories: false,
        showPlaytime: true,
        showReleaseDate: true,
        showGenres: true,
        showPlatform: false,
      }}
    />
  );

  img = container.querySelector('img');
  expect(img).not.toBeNull();
  expect(img?.getAttribute('loading')).toBe('lazy');
});
