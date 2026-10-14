import { describe, expect, it, vi } from 'vitest';
import { MAX_SESSION_MS, MIN_SESSION_MS, recordPlaySession, sessionMinutes } from './playtime.js';

const start = 1_000_000_000_000;

describe('sessionMinutes (E1)', () => {
  it('ignores sessions shorter than the minimum', () => {
    expect(sessionMinutes(start, start + MIN_SESSION_MS - 1)).toBeUndefined();
  });

  it('counts a session at exactly the minimum as one minute', () => {
    expect(sessionMinutes(start, start + MIN_SESSION_MS)).toBe(1);
  });

  it('rounds to whole minutes', () => {
    expect(sessionMinutes(start, start + 90 * 60_000)).toBe(90);
    expect(sessionMinutes(start, start + 150_000)).toBe(3);
  });

  it('caps one session at 24 hours', () => {
    expect(sessionMinutes(start, start + 3 * MAX_SESSION_MS)).toBe(24 * 60);
  });

  it('ignores a session that ends before it starts', () => {
    expect(sessionMinutes(start, start - 5_000)).toBeUndefined();
  });
});

describe('recordPlaySession (E1)', () => {
  it('adds minutes and one play to the stored game', () => {
    const updateGame = vi.fn(() => true);
    const recorded = recordPlaySession({ updateGame }, { gameId: 'custom-1', startedAt: start, endedAt: start + 30 * 60_000 });

    expect(recorded).toBe(true);
    const patch = updateGame.mock.calls[0][1] as (game: { playtime?: number; playCount?: number }) => unknown;
    expect(patch({ playtime: 100, playCount: 4 })).toEqual({ playtime: 130, playCount: 5 });
    expect(patch({})).toEqual({ playtime: 30, playCount: 1 });
  });

  it('does not touch the library for a session that does not count', () => {
    const updateGame = vi.fn(() => true);
    expect(recordPlaySession({ updateGame }, { gameId: 'custom-1', startedAt: start, endedAt: start + 1_000 })).toBe(false);
    expect(updateGame).not.toHaveBeenCalled();
  });
});
