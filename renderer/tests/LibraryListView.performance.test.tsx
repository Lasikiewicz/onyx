import React from 'react';
import { render } from '@testing-library/react';
import { LibraryListView } from '../src/components/LibraryListView';
import { describe, it, expect, vi } from 'vitest';

describe('LibraryListView Performance Optimizations', () => {
    const mockGames = [
        {
            id: '1',
            title: 'Test Game 1',
            boxArtUrl: 'boxart.jpg',
            logoUrl: 'logo.jpg',
            iconUrl: 'icon.png'
        },
        {
            id: '2',
            title: 'Test Game 2',
            boxArtUrl: 'boxart2.jpg',
            logoUrl: 'logo2.jpg',
            iconUrl: 'icon2.png'
        }
    ];

    it('should have contentVisibility: auto and containIntrinsicSize styles applied', () => {
        const { container } = render(<LibraryListView games={mockGames} />);

        const gameCards = container.querySelectorAll('[data-game-card="true"]');
        expect(gameCards.length).toBe(2);

        gameCards.forEach(card => {
            const style = window.getComputedStyle(card);
            // jsdom doesn't fully support CSS properties like contentVisibility out-of-the-box in getComputedStyle
            // so we check the inline style attribute directly.
            expect(card.getAttribute('style')).toContain('content-visibility: auto');
            expect(card.getAttribute('style')).toContain('contain-intrinsic-size: auto 128px');
        });
    });

    it('should have loading="lazy" on all images', () => {
        const { container } = render(<LibraryListView games={mockGames} />);
        const images = container.querySelectorAll('img');

        expect(images.length).toBeGreaterThan(0);
        images.forEach(img => {
            expect(img.getAttribute('loading')).toBe('lazy');
        });
    });
});
