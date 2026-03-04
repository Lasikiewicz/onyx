import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BottomBar } from '../src/components/BottomBar';
import type { Game } from '../src/types/game';

describe('BottomBar accessibility', () => {
    it('renders accessible label for favorite button', () => {
        const mockGame: Game = {
            id: 'test-1',
            title: 'Test Game',
            favorite: false,
        };

        render(<BottomBar game={mockGame} onFavorite={vi.fn()} />);

        const favButton = screen.getByRole('button', { name: /add to favorites/i });
        expect(favButton).toBeInTheDocument();
        expect(favButton).toHaveAttribute('aria-pressed', 'false');

        // Check SVG
        const svg = favButton.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg).toHaveAttribute('focusable', 'false');
    });

    it('renders accessible label for favorited game', () => {
        const mockGame: Game = {
            id: 'test-1',
            title: 'Test Game',
            favorite: true,
        };

        render(<BottomBar game={mockGame} onFavorite={vi.fn()} />);

        const favButton = screen.getByRole('button', { name: /remove from favorites/i });
        expect(favButton).toBeInTheDocument();
        expect(favButton).toHaveAttribute('aria-pressed', 'true');
    });
});
