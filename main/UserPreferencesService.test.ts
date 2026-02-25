import { describe, it, expect, vi } from 'vitest';
import { UserPreferencesService } from './UserPreferencesService';

// Subclass to mock ensureStore
class TestUserPreferencesService extends UserPreferencesService {
  public mockStore: any;

  constructor(mockData: any = {}) {
    super();
    this.mockStore = {
      get: (key: string, def: any) => mockData[key] || def,
      set: (key: string, val: any) => { mockData[key] = val; },
      delete: (key: string) => { delete mockData[key]; },
      has: (key: string) => key in mockData,
      store: mockData
    };
  }

  // @ts-ignore - overriding private/protected method if necessary
  async ensureStore() {
    return this.mockStore;
  }
}

describe('UserPreferencesService', () => {
  it('correctly identifies per-game settings in saved defaults', async () => {
    const mockData = {
      customDefaults: {
        '1080p': {
          grid: {
            settings: { gridSize: 100 },
            gamesCustomSettings: { 'game1': { size: 200 } }
          },
          list: {
            settings: { listViewSize: 50 }
            // No gamesCustomSettings
          },
          logo: {
            settings: { logoSize: 100 },
            gamesCustomSettings: {} // Empty object
          }
        }
      }
    };

    const service = new TestUserPreferencesService(mockData);
    const list = await service.getSavedDefaultsList();

    const gridDefault = list.find(d => d.resolution === '1080p' && d.viewMode === 'grid');
    const listDefault = list.find(d => d.resolution === '1080p' && d.viewMode === 'list');
    const logoDefault = list.find(d => d.resolution === '1080p' && d.viewMode === 'logo');

    expect(gridDefault).toBeDefined();
    expect(gridDefault?.hasPerGameSettings).toBe(true);

    expect(listDefault).toBeDefined();
    expect(listDefault?.hasPerGameSettings).toBe(false);

    expect(logoDefault).toBeDefined();
    expect(logoDefault?.hasPerGameSettings).toBe(false);
  });
});
