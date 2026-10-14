import type { GameStore } from './GameStore.js';
import type { SessionEndedEvent } from './gameProcessEvents.js';

/** Sessions shorter than this are not counted (a launcher stub that exits at once, or a mis-detected exit). */
export const MIN_SESSION_MS = 60_000;

/** A single session is capped here, so a game left "running" overnight can't add days of playtime. */
export const MAX_SESSION_MS = 24 * 60 * 60_000;

/**
 * Minutes to add for one play session, or undefined if the session doesn't count.
 * Playtime is stored in minutes, the unit Steam uses for `playtime_forever`.
 */
export function sessionMinutes(startedAt: number, endedAt: number): number | undefined {
  const duration = Math.min(endedAt - startedAt, MAX_SESSION_MS);
  if (!Number.isFinite(duration) || duration < MIN_SESSION_MS) return undefined;
  return Math.max(1, Math.round(duration / 60_000));
}

/**
 * Add one finished session to a game's playtime and play count. Recorded in the main process, so
 * a renderer reload can't lose it (E1). Returns false if the session doesn't count or the game is
 * no longer in the library.
 */
export function recordPlaySession(
  store: Pick<GameStore, 'updateGame'>,
  session: SessionEndedEvent,
): boolean {
  const minutes = sessionMinutes(session.startedAt, session.endedAt);
  if (minutes === undefined) return false;

  return store.updateGame(session.gameId, (game) => ({
    playtime: (game.playtime ?? 0) + minutes,
    playCount: (game.playCount ?? 0) + 1,
  }));
}
