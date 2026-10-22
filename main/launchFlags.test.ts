import { describe, expect, it } from 'vitest';
import { parseLaunchFlags } from './launchFlags';

describe('parseLaunchFlags', () => {
  it('detects the big screen flag and its alias', () => {
    expect(parseLaunchFlags(['Onyx.exe', '--big-screen'])).toEqual({ bigScreen: true });
    expect(parseLaunchFlags(['--bigscreen'])).toEqual({ bigScreen: true });
    expect(parseLaunchFlags(['--startup-mode=tray'])).toEqual({ bigScreen: false });
  });

  it('reads a display override', () => {
    expect(parseLaunchFlags(['--big-screen', '--big-screen-display=primary'])).toEqual({
      bigScreen: true,
      bigScreenDisplay: 'primary',
    });
    expect(parseLaunchFlags(['--big-screen-display=2'])).toEqual({
      bigScreen: false,
      bigScreenDisplay: 2,
    });
  });

  it('ignores an unknown display value by staying on the current display', () => {
    expect(parseLaunchFlags(['--big-screen-display=sideways']).bigScreenDisplay).toBe('current');
  });
});
