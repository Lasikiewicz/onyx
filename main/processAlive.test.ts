import { describe, expect, it } from 'vitest';
import { isProcessAlive } from './processAlive.js';

describe('isProcessAlive (A14)', () => {
  it('reports the current process as alive', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('rejects invalid PIDs without calling the OS', () => {
    expect(isProcessAlive(0)).toBe(false);
    expect(isProcessAlive(-5)).toBe(false);
    expect(isProcessAlive(Number.NaN)).toBe(false);
  });

  it('reports a PID that does not exist as not alive', () => {
    // 2^22 is above the PID range Windows and Linux hand out by default
    expect(isProcessAlive(4194305)).toBe(false);
  });
});
