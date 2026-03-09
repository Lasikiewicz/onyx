import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LibraryListView } from '../src/components/LibraryListView';
import type { Game } from '../src/types/game';

const mockGames: Game[] = [
  {
    id: 'game-1',
    title: 'Test Game 1',
    executableName: 'test.exe',
    source: 'steam',
    platform: 'steam',
    playtime: 120,
    releaseDate: '2023-01-01T00:00:00.000Z',
  },
  {
    id: 'game-2',
    title: 'Test Game 2',
    executableName: 'test2.exe',
    source: 'epic',
    platform: 'epic',
    playtime: 60,
    releaseDate: '2024-01-01T00:00:00.000Z',
  }
];

beforeEach(() => {
  (globalThis as any).window = (globalThis as any).window ?? {} as any;
  (window as any).electronAPI = {
    getPreferences: vi.fn().mockResolvedValue({}),
    savePreferences: vi.fn().mockResolvedValue(null),
  };
});

describe('LibraryListView renders and formats', () => {
  it('renders standard attributes securely without crashing', () => {
    const { container } = render(
      <LibraryListView
        games={mockGames}
        listViewOptions={{
            showDescription: true,
            showCategories: false,
            showPlaytime: true,
            showReleaseDate: true,
            showGenres: true,
            showPlatform: true,
            showLauncher: true,
            showLogos: false,
            displayMode: 'title-only'
        }}
      />
    );
    // Check elements
    expect(screen.getByText('Test Game 1')).toBeDefined();
    expect(screen.getByText('Test Game 2')).toBeDefined();
    expect(screen.getByText('2h')).toBeDefined(); // Formatted playtime
    expect(screen.getByText('1h')).toBeDefined();
    expect(screen.getByText('Jan 1, 2023')).toBeDefined(); // Formatted release Date
    expect(screen.getByText('Jan 1, 2024')).toBeDefined();
    expect(container).toBeDefined();
  });
});
