import { describe, expect, it } from 'vitest';
import { getBackgroundScanUiChannels } from './ipc/scanningHandlers.js';

describe('getBackgroundScanUiChannels', () => {
  it('uses startup-only channels for startup scans', () => {
    expect(getBackgroundScanUiChannels(true)).toEqual({
      progressChannel: 'startup:progress',
      newGamesChannel: 'startup:newGamesFound',
    });
  });

  it('avoids startup progress UI for normal background scans', () => {
    expect(getBackgroundScanUiChannels(false)).toEqual({
      progressChannel: null,
      newGamesChannel: 'background:newGamesFound',
    });
  });
});
