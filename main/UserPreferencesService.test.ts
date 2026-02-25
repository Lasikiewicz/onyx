import { describe, it, expect } from 'vitest';
import { UserPreferencesService } from './UserPreferencesService';

describe('UserPreferencesService', () => {
  it('createDefaultPreferences returns expected defaults', () => {
    const service = new UserPreferencesService();
    // Catch the error from the store promise to prevent unhandled rejection in logs
    (service as any).storePromise.catch(() => {});

    // Access private method
    const defaults = (service as any).createDefaultPreferences();

    // Check some key values to ensure it's returning data
    expect(defaults.gridSize).toBe(119);
    expect(defaults.panelWidth).toBe(800);

    // Snapshot the entire object
    expect(defaults).toMatchSnapshot();
  });
});
