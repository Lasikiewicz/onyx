import { normalizeDisplayChoice, type DisplayChoice } from './displayChoice';

export interface LaunchFlags {
  bigScreen: boolean;
  /** Set only when `--big-screen-display=` is present. */
  bigScreenDisplay?: DisplayChoice;
}

const BIG_SCREEN_FLAGS = new Set(['--big-screen', '--bigscreen']);

export function parseLaunchFlags(argv: readonly string[]): LaunchFlags {
  const bigScreen = argv.some((arg) => BIG_SCREEN_FLAGS.has(arg));
  const displayArg = argv.find((arg) => arg.startsWith('--big-screen-display='));
  if (!displayArg) {
    return { bigScreen };
  }
  const raw = displayArg.slice('--big-screen-display='.length).trim().toLowerCase();
  if (raw === 'primary' || raw === 'current') {
    return { bigScreen, bigScreenDisplay: raw };
  }
  if (/^\d+$/.test(raw)) {
    return { bigScreen, bigScreenDisplay: normalizeDisplayChoice(raw) };
  }
  return { bigScreen, bigScreenDisplay: 'current' };
}
