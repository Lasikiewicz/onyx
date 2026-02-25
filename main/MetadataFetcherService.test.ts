import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataFetcherService } from './MetadataFetcherService.js';
import { IGDBMetadataProvider } from './IGDBMetadataProvider.js';

describe('MetadataFetcherService', () => {
    let service: MetadataFetcherService;
    let mockIgdbProvider: any;

    beforeEach(() => {
        mockIgdbProvider = {
            name: 'igdb',
            isAvailable: vi.fn().mockReturnValue(true),
            search: vi.fn(),
            getDescription: vi.fn(),
            getArtwork: vi.fn(),
        };

        service = new MetadataFetcherService();
        // Inject mock provider
        (service as any).igdbProvider = mockIgdbProvider;
        (service as any).providers = [mockIgdbProvider];
    });

    describe('fetchDescriptionForGame (IGDB Fallback)', () => {
        it('should use IGDB search when no Steam App ID is provided (Fallback for Epic/GOG/etc.)', async () => {
            const matchedGame = { title: 'Cyberpunk 2077', source: 'epic', id: 'epic-123' };

            mockIgdbProvider.search.mockResolvedValue([
                { id: 'igdb-71', title: 'Cyberpunk 2077', source: 'igdb' }
            ]);
            mockIgdbProvider.getDescription.mockResolvedValue({
                description: 'Epic description from IGDB',
                source: 'igdb'
            });

            const result = await (service as any).fetchDescriptionForGame(matchedGame);

            expect(mockIgdbProvider.search).toHaveBeenCalledWith('Cyberpunk 2077', undefined, false);
            expect(mockIgdbProvider.getDescription).toHaveBeenCalledWith('igdb-71', false);
            expect(result.description).toBe('Epic description from IGDB');
        });

        it('should prefer exact title match from IGDB search results', async () => {
            const matchedGame = { title: 'Hades', source: 'gog', id: 'gog-123' };

            mockIgdbProvider.search.mockResolvedValue([
                { id: 'igdb-dlc', title: 'Hades: Soundrack', source: 'igdb' },
                { id: 'igdb-main', title: 'Hades', source: 'igdb' }
            ]);
            mockIgdbProvider.getDescription.mockResolvedValue({
                description: 'The main Hades game',
                source: 'igdb'
            });

            await (service as any).fetchDescriptionForGame(matchedGame);

            expect(mockIgdbProvider.getDescription).toHaveBeenCalledWith('igdb-main', false);
        });
    });
});
