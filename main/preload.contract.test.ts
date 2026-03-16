import { beforeEach, describe, expect, it, vi } from 'vitest';

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();
const send = vi.fn();
const on = vi.fn();
const removeListener = vi.fn();

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld,
  },
  ipcRenderer: {
    invoke,
    send,
    on,
    removeListener,
  },
}));

describe('preload electronAPI contract', () => {
  beforeEach(() => {
    exposeInMainWorld.mockClear();
    invoke.mockClear();
    send.mockClear();
    on.mockClear();
    removeListener.mockClear();
    vi.resetModules();
  });

  it('exposes the shared electronAPI bridge with notifyAppReady', async () => {
    const preload = await import('./preload.js');

    expect(exposeInMainWorld).toHaveBeenCalledWith('electronAPI', preload.electronAPI);
    expect(preload.electronAPI.notifyAppReady).toBeTypeOf('function');
    expect('ready' in preload.electronAPI).toBe(false);

    preload.electronAPI.notifyAppReady();
    expect(send).toHaveBeenCalledWith('app:ready');
  });
});
