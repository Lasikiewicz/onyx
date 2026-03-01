import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GameManager } from '../src/components/GameManager';

// Mock electron API
(window as any).electronAPI = {
  getPreferences: vi.fn().mockResolvedValue({}),
  savePreferences: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

test('GameManager renders view toggle buttons with aria-labels', () => {
  render(
    <GameManager
      isOpen={true}
      onClose={() => {}}
      games={[]}
      onSaveGame={async () => {}}
    />
  );

  // The buttons should be rendered with the new aria-labels
  expect(screen.getByRole('button', { name: 'Boxart View' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Icon View' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Text Only View' })).toBeInTheDocument();
});
