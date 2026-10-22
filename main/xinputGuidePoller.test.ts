import { describe, expect, it } from 'vitest';
import { loadXInputGuideReader, startXInputGuideWatch } from './xinputGuidePoller';

const itWindows = process.platform === 'win32' ? it : it.skip;

describe('XInput Guide reader', () => {
  itWindows('calls XInputGetStateEx ordinal 100', () => {
    const read = loadXInputGuideReader();
    expect(loadXInputGuideReader()).toBe(read);
    for (let index = 0; index < 4; index += 1) {
      const buttons = read(index);
      expect(buttons === null || Number.isInteger(buttons)).toBe(true);
    }
  });

  itWindows('starts a Guide watch when XInput loads', () => {
    const watch = startXInputGuideWatch(() => undefined);
    expect(watch).not.toBeNull();
    watch?.stop();
  });
});
