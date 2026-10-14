import { EventEmitter } from 'node:events';

/**
 * Process events raised by the launcher and consumed by the scanning handlers. Kept in its own
 * module so services don't import IPC handlers (A4).
 */
export const gameProcessEvents = new EventEmitter();

export const PROCESS_FOUND_EVENT = 'process-found';

export interface ProcessFoundEvent {
  gameId: string;
  pid: number;
}

export const SESSION_ENDED_EVENT = 'session-ended';

export interface SessionEndedEvent {
  gameId: string;
  startedAt: number;
  endedAt: number;
}
