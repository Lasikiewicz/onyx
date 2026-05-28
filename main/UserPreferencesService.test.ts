import { describe, it, expect, vi } from 'vitest';
import { UserPreferencesService } from './UserPreferencesService.js';
import * as dynamicImportModule from './dynamicImport.js';

vi.mock('./dynamicImport.js', () => ({
    dynamicImport: vi.fn(),
}));

// Mock Store class
class MockStore {
    get() { return {}; }
    set() { }
}

describe('UserPreferencesService', () => {
    // Setup mock for dynamicImport before each test
    vi.mocked(dynamicImportModule.dynamicImport).mockResolvedValue({ default: MockStore });

    const service = new UserPreferencesService();

    describe('createDefaultPreferences', () => {
        it('should match the default preferences snapshot', () => {
            const defaults = (service as any).createDefaultPreferences();

            // We use a property-by-property check instead of toMatchSnapshot to avoid 
            // issues with absolute paths or environment-specific values if any exist.
            expect(defaults).toBeDefined();
            expect(defaults.gridSize).toBe(145);
            expect(defaults.panelWidth).toBe(800);
            expect(defaults.showSystemTrayIcon).toBe(true);
            expect(defaults.checkForUpdatesOnStartup).toBe(true);
            expect(defaults.panelWidthByView).toBeDefined();
        });
    });

    describe('normalizeResolutionKey', () => {
        const normalize = (val?: string) => (service as any).normalizeResolutionKey(val);

        it('should handle undefined correctly', () => {
            expect(normalize()).toBe('1080p');
        });

        it('should normalize 4K variants', () => {
            expect(normalize('4k')).toBe('4K');
            expect(normalize('4K')).toBe('4K');
        });

        it('should normalize 1440p variants', () => {
            expect(normalize('1440p')).toBe('1440p');
            expect(normalize('1440P')).toBe('1440p');
        });

        it('should normalize 720p variants', () => {
            expect(normalize('720p')).toBe('720p');
            expect(normalize('720P')).toBe('720p');
        });

        it('should fallback to 1080p for unknown values', () => {
            expect(normalize('unknown')).toBe('1080p');
            expect(normalize('')).toBe('1080p');
            expect(normalize('8k')).toBe('1080p');
        });

        it('should handle 1080p explicitly', () => {
            expect(normalize('1080p')).toBe('1080p');
            expect(normalize('1080P')).toBe('1080p');
        });
    });

    describe('savePreferences', () => {
        it('preserves the latest window state across concurrent partial saves', async () => {
            const service = new UserPreferencesService();
            const defaults = (service as any).createDefaultPreferences();
            const state: Record<string, any> = {
                preferences: {
                    ...defaults,
                    windowState: {
                        x: 10,
                        y: 10,
                        width: 1280,
                        height: 720,
                        isMaximized: false,
                    },
                },
                customDefaults: {},
                schemaVersion: 1,
            };
            const clone = (value: any) => JSON.parse(JSON.stringify(value));

            (service as any).store = {
                get: vi.fn((key: string, defaultValue?: any) => (
                    state[key] === undefined ? defaultValue : clone(state[key])
                )),
                set: vi.fn((key: string, value: any) => {
                    state[key] = clone(value);
                }),
            };

            await Promise.all([
                service.savePreferences({
                    windowState: {
                        x: 0,
                        y: 0,
                        width: 1920,
                        height: 1080,
                        isMaximized: true,
                    },
                }),
                service.savePreferences({ viewMode: 'list' }),
            ]);

            expect(state.preferences.windowState).toMatchObject({
                width: 1920,
                height: 1080,
                isMaximized: true,
            });
            expect(state.preferences.viewMode).toBe('list');
        });
    });
});
