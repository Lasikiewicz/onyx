import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BottomBar } from '../src/components/BottomBar';

describe('BottomBar', () => {
    it('has aria-labels on its buttons', () => {
        const mockGame = {
            id: '1',
            title: 'Test Game',
            favorite: true,
            modManagerUrl: 'test'
        };

        render(
            <BottomBar game={mockGame} onPlay={() => {}} onEdit={() => {}} onFavorite={() => {}} />
        );

        expect(screen.getByRole('button', { name: /Remove from favorites/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Edit Game/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Open Mod Manager/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Play game/i })).toBeInTheDocument();
    });
});
