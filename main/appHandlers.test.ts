import { describe, expect, it, vi } from 'vitest';
import { flushPendingAndRelaunch } from './ipc/appHandlers.js';

describe('flushPendingAndRelaunch', () => {
  it('flushes pending game-store writes before relaunching', async () => {
    const callOrder: string[] = [];
    const gameStore = {
      flushPending: vi.fn(async () => {
        callOrder.push('flush');
      }),
    };
    const appControl = {
      relaunch: vi.fn(() => {
        callOrder.push('relaunch');
      }),
      exit: vi.fn(() => {
        callOrder.push('exit');
      }),
    };

    await flushPendingAndRelaunch(gameStore, appControl as any);

    expect(gameStore.flushPending).toHaveBeenCalledTimes(1);
    expect(appControl.relaunch).toHaveBeenCalledTimes(1);
    expect(appControl.exit).toHaveBeenCalledWith(0);
    expect(callOrder).toEqual(['flush', 'relaunch', 'exit']);
  });
});