import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AddGameModal } from './AddGameModal';
import { RemoveDeletedGamesDialog } from './RemoveDeletedGamesDialog';

describe('Modal close buttons accessibility', () => {
  it('AddGameModal has aria-label on close button', () => {
    // Mock the electronAPI for AddGameModal
    (window as any).electronAPI = {
      showOpenDialog: vi.fn(),
      addCustomGame: vi.fn(),
    };

    render(<AddGameModal isOpen={true} onClose={() => {}} onAdd={async () => {}} />);

    // Attempt to find the close button using aria-label
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton.tagName).toBe('BUTTON');
  });

  it('RemoveDeletedGamesDialog has aria-label on close button', () => {
    render(
      <RemoveDeletedGamesDialog
        isOpen={true}
        missingGames={[]}
        isScanning={false}
        onRemove={async () => {}}
        onCancel={() => {}}
      />
    );

    // Attempt to find the close button using aria-label
    const closeButton = screen.getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton.tagName).toBe('BUTTON');
  });
});
