import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { GameDetailsPanel } from '../src/components/GameDetailsPanel';
import type { Game } from '../src/types/game';

beforeAll(() => {
    (window as any).electronAPI = {
        getPreferences: vi.fn().mockResolvedValue({}),
        savePreferences: vi.fn().mockResolvedValue({}),
    };
});

describe('GameDetailsPanel accessibility', () => {
    it('renders accessible label for favorite button', async () => {
        const mockGame: Game = {
            id: 'test-1',
            title: 'Test Game',
            favorite: false,
        };

        render(<GameDetailsPanel game={mockGame} onFavorite={vi.fn()} viewMode="grid" />);

        const favButton = await screen.findByRole('button', { name: /add to favorites/i });
        expect(favButton).toBeInTheDocument();
        expect(favButton).toHaveAttribute('aria-pressed', 'false');

        // Check SVG
        const svg = favButton.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg).toHaveAttribute('focusable', 'false');
    });

    it('renders accessible label for favorited game', async () => {
        const mockGame: Game = {
            id: 'test-1',
            title: 'Test Game',
            favorite: true,
        };

        render(<GameDetailsPanel game={mockGame} onFavorite={vi.fn()} viewMode="grid" />);

        const favButton = await screen.findByRole('button', { name: /remove from favorites/i });
        expect(favButton).toBeInTheDocument();
        expect(favButton).toHaveAttribute('aria-pressed', 'true');
    });
});
