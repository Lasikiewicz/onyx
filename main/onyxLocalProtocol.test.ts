import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { isPathWithinRoots } from './onyxLocalProtocol.js';

/**
 * The `onyx-local` protocol serves files off disk to the renderer, so the containment check is
 * the boundary between "cached artwork" and "any file the user can read". These tests cover
 * that check directly.
 */

const isWindows = process.platform === 'win32';
const root = isWindows ? 'C:\\Users\\me\\AppData\\Roaming\\Onyx\\cache' : '/home/me/.config/Onyx/cache';
const userData = isWindows ? 'C:\\Users\\me\\AppData\\Roaming\\Onyx' : '/home/me/.config/Onyx';
const j = (...segments: string[]) => path.join(...segments);

describe('isPathWithinRoots', () => {
  it('accepts a file directly inside a root', () => {
    expect(isPathWithinRoots(j(root, 'steam-440-boxart.png'), [root])).toBe(true);
  });

  it('accepts a file nested deeper inside a root', () => {
    expect(isPathWithinRoots(j(root, 'sub', 'dir', 'art.png'), [root])).toBe(true);
  });

  it('accepts the root itself', () => {
    expect(isPathWithinRoots(root, [root])).toBe(true);
  });

  it('accepts a path under any one of several roots', () => {
    expect(isPathWithinRoots(j(userData, 'preferences.json'), [root, userData])).toBe(true);
  });

  it('rejects a sibling directory that merely shares the root as a string prefix', () => {
    // The regression this function exists for: a plain startsWith() check treats
    // `.../cache-evil/payload` as living inside `.../cache`.
    expect(isPathWithinRoots(`${root}-evil${path.sep}payload.png`, [root])).toBe(false);
  });

  it('rejects a sibling file that shares the root as a string prefix', () => {
    expect(isPathWithinRoots(`${root}.png`, [root])).toBe(false);
  });

  it('rejects traversal out of the root via ..', () => {
    const escaped = j(root, '..', '..', '..', 'secrets.txt');
    expect(isPathWithinRoots(escaped, [root])).toBe(false);
  });

  it('accepts traversal that stays inside the root', () => {
    const stillInside = j(root, 'sub', '..', 'art.png');
    expect(isPathWithinRoots(stillInside, [root])).toBe(true);
  });

  it('rejects an unrelated absolute path', () => {
    const outside = isWindows ? 'C:\\Windows\\System32\\config\\SAM' : '/etc/shadow';
    expect(isPathWithinRoots(outside, [root, userData])).toBe(false);
  });

  it('rejects when there are no roots to compare against', () => {
    expect(isPathWithinRoots(j(root, 'art.png'), [])).toBe(false);
  });

  it('ignores empty roots rather than treating them as permissive', () => {
    expect(isPathWithinRoots(j(root, 'art.png'), [''])).toBe(false);
  });

  it('rejects an empty candidate', () => {
    expect(isPathWithinRoots('', [root])).toBe(false);
  });

  it('tolerates a trailing separator on the root', () => {
    expect(isPathWithinRoots(j(root, 'art.png'), [root + path.sep])).toBe(true);
  });

  it.runIf(isWindows)('compares case-insensitively on Windows', () => {
    expect(isPathWithinRoots(j(root.toUpperCase(), 'ART.PNG'), [root])).toBe(true);
  });

  it.runIf(!isWindows)('compares case-sensitively off Windows', () => {
    expect(isPathWithinRoots(j(root.toUpperCase(), 'ART.PNG'), [root])).toBe(false);
  });
});
