import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataFetcherService } from './MetadataFetcherService.js';

// Mock dependencies
vi.mock('./IGDBMetadataProvider.js');
vi.mock('./SteamMetadataProvider.js');
vi.mock('./RateLimitCoordinator.js', () => ({
  getRateLimitCoordinator: () => ({ queueRequest: (_: string, fn: () => any) => fn() })
}));
vi.mock('./MetadataCache.js', () => ({
  getMetadataCache: () => ({
    generateKey: () => 'key',
    get: () => null,
    set: () => {}
  })
}));
vi.mock('./MetadataValidator.js', () => ({
  getMetadataValidator: () => ({ validateMetadata: () => true })
}));
vi.mock('./GameMatcher.js', () => ({
  getGameMatcher: () => ({ stripDemoIndicator: (t: string) => ({ stripped: t, isDemo: false }) })
}));

describe('MetadataFetcherService', () => {
  let service: MetadataFetcherService;
  let mockIGDBProvider: any;
  let mockSteamProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockIGDBProvider = {
      isAvailable: vi.fn().mockReturnValue(true),
      search: vi.fn(),
      getDescription: vi.fn(),
      name: 'igdb'
    };

    mockSteamProvider = {
      isAvailable: vi.fn().mockReturnValue(true),
      getDescription: vi.fn(),
      name: 'steam'
    };

    // Instantiate service without real services
    service = new MetadataFetcherService(null, null, null, null, null);

    // Inject mocks manually into private properties
    (service as any).igdbProvider = mockIGDBProvider;
    (service as any).steamProvider = mockSteamProvider;
  });

  describe('searchMetadataOnly', () => {
    it('should use Steam provider for Steam games', async () => {
        mockSteamProvider.getDescription.mockResolvedValue({ description: 'Steam Desc', source: 'steam' });

        const result = await service.searchMetadataOnly('123', 'steam', '123', 'Game Title');

        expect(mockSteamProvider.getDescription).toHaveBeenCalledWith('steam-123');
        expect(result.description).toBe('Steam Desc');
    });

    it('should use IGDB provider for Epic games via search', async () => {
        mockIGDBProvider.search.mockResolvedValue([{ id: 456 }]);
        mockIGDBProvider.getDescription.mockResolvedValue({ description: 'IGDB Desc', source: 'igdb' });

        // This test case expects the fix to be implemented.
        // Before the fix, this will fail (it will return undefined description).
        const result = await service.searchMetadataOnly('AppID', 'epic', undefined, 'Epic Game');

        // These assertions are what we EXPECT after the fix
        expect(mockIGDBProvider.search).toHaveBeenCalledWith('Epic Game', undefined);
        expect(mockIGDBProvider.getDescription).toHaveBeenCalledWith(456);
        expect(result.description).toBe('IGDB Desc');
    });

    it('should use IGDB provider directly if source is igdb', async () => {
        mockIGDBProvider.getDescription.mockResolvedValue({ description: 'IGDB Direct', source: 'igdb' });

        const result = await service.searchMetadataOnly('igdb-789', 'igdb', undefined, 'Game');

        expect(mockIGDBProvider.getDescription).toHaveBeenCalledWith('igdb-789');
        expect(result.description).toBe('IGDB Direct');
    });
  });
});
