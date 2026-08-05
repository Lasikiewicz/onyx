import { describe, it, expect, beforeEach } from 'vitest';
import { APICredentialsService, METADATA_PROVIDER_IDS } from './APICredentialsService.js';

/**
 * Minimal stand-in for the electron-store shim. The real one writes to disk, which would make
 * these assertions depend on leftover state from previous runs.
 */
class FakeStore {
    public data: Record<string, any> = {};

    get(key: string, fallback?: any) {
        return key in this.data ? this.data[key] : fallback;
    }

    set(key: string, value: any) {
        this.data[key] = value;
    }

    delete(key: string) {
        delete this.data[key];
    }
}

const fakeKeytar = {
    getPassword: async () => null,
    setPassword: async () => undefined,
    deletePassword: async () => undefined,
};

describe('APICredentialsService provider enable/disable', () => {
    let service: APICredentialsService;
    let store: FakeStore;

    beforeEach(() => {
        service = new APICredentialsService(fakeKeytar, 'onyx-test-provider-enabled');
        store = new FakeStore();
        (service as any).store = store;
    });

    it('reports every provider as enabled when nothing has been stored', async () => {
        const enabled = await service.getProviderEnabled();
        expect(enabled).toEqual({ igdb: true, rawg: true, steamgriddb: true, giantbomb: true });
    });

    it('covers every known provider id', async () => {
        const enabled = await service.getProviderEnabled();
        expect(Object.keys(enabled).sort()).toEqual([...METADATA_PROVIDER_IDS].sort());
    });

    it('persists a provider being switched off', async () => {
        await service.setProviderEnabled({ rawg: false });

        expect(store.data.providerEnabled).toEqual({ rawg: false });
        expect(await service.getProviderEnabled()).toEqual({
            igdb: true,
            rawg: false,
            steamgriddb: true,
            giantbomb: true,
        });
    });

    it('merges partial updates instead of replacing the whole map', async () => {
        await service.setProviderEnabled({ rawg: false });
        await service.setProviderEnabled({ igdb: false });

        expect(await service.getProviderEnabled()).toEqual({
            igdb: false,
            rawg: false,
            steamgriddb: true,
            giantbomb: true,
        });
    });

    it('switches a provider back on', async () => {
        await service.setProviderEnabled({ rawg: false });
        await service.setProviderEnabled({ rawg: true });

        expect((await service.getProviderEnabled()).rawg).toBe(true);
    });

    it('ignores unknown ids and non-boolean values from the renderer', async () => {
        await service.setProviderEnabled({
            rawg: 'nope',
            somethingElse: false,
        } as any);

        expect(store.data.providerEnabled).toEqual({});
        expect(await service.getProviderEnabled()).toEqual({
            igdb: true,
            rawg: true,
            steamgriddb: true,
            giantbomb: true,
        });
    });

    it('restores defaults when credentials are cleared', async () => {
        await service.setProviderEnabled({ rawg: false, igdb: false });
        await service.clearCredentials();

        expect(await service.getProviderEnabled()).toEqual({
            igdb: true,
            rawg: true,
            steamgriddb: true,
            giantbomb: true,
        });
    });
});
