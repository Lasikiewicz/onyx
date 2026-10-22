import type { DisplayChoice } from './displayChoice';

export interface BigScreenSessionState {
  active: boolean;
  displayChoice: DisplayChoice;
  /** Fullscreen flag from before this Big Screen session, so leaving it can restore that. */
  wasFullscreen: boolean;
}

const session: BigScreenSessionState = {
  active: false,
  displayChoice: 'current',
  wasFullscreen: false,
};

export function getBigScreenSession(): BigScreenSessionState {
  return { ...session };
}

export function isBigScreenSessionActive(): boolean {
  return session.active;
}

export function beginBigScreenSession(displayChoice: DisplayChoice, wasFullscreen: boolean): void {
  if (!session.active) {
    session.wasFullscreen = wasFullscreen;
  }
  session.active = true;
  session.displayChoice = displayChoice;
}

export function endBigScreenSession(): BigScreenSessionState {
  const previous = getBigScreenSession();
  session.active = false;
  session.displayChoice = 'current';
  session.wasFullscreen = false;
  return previous;
}
