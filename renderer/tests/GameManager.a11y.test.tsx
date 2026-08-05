import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameManager } from '../src/components/GameManager';
import type { Game } from '../src/types/game';

const baseGame: Game = {
  id: 'game-1',
  title: 'Test Game',
  exePath: 'C:/Games/Test/test.exe',
  boxArtUrl: '',
  bannerUrl: '',
  source: 'manual',
  platform: 'steam',
  installSize: 0,
  favorite: false,
  pinned: false,
  hidden: false,
};

beforeEach(() => {
  (globalThis as any).window = (globalThis as any).window ?? {} as any;
  (window as any).electronAPI = {
    optimization: {
      getStatus: () => Promise.resolve({ hasActivity: false, jobs: [] }),
      onStatus: () => () => {},
    },
    getPreferences: () => Promise.resolve({ listViewOptions: {} }),
    savePreferences: () => Promise.resolve(),
  };
});

describe('GameManager accessibility', () => {
  it('renders accessible labels for game list view toggle buttons', async () => {
    render(
      <GameManager
        isOpen={true}
        onClose={() => {}}
        games={[baseGame]}
        onSaveGame={async () => {}}
      />
    );

    expect(await screen.findByRole('button', { name: /boxart view/i })).toBeDefined();
    expect(await screen.findByRole('button', { name: /icon view/i })).toBeDefined();
    expect(await screen.findByRole('button', { name: /text-only view/i })).toBeDefined();
  });
});

