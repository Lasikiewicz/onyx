import React from 'react';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameManager } from '../src/components/GameManager';
import type { Game } from '../src/types/game';

const baseGame: Game = {
  id: 'game-1',
  title: 'Test Game',
  executableName: 'test.exe',
  source: 'manual',
  platform: 'steam',
  installSize: 0,
  favorite: false,
  pinned: false,
  hidden: false,
};

declare global {
  interface Window {
    electronAPI: any;
  }
}

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
  it('renders accessible labels for game list view toggle buttons', () => {
    render(
      <GameManager
        isOpen={true}
        onClose={() => {}}
        games={[baseGame]}
        onSaveGame={async () => {}}
      />
    );

    expect(screen.getByRole('button', { name: /boxart view/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /icon view/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /text-only view/i })).toBeDefined();
  });
});

