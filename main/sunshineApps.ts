import path from 'node:path';
import { buildWindowsCommandLine } from './windowsCommandLine';

export const ONYX_BIG_SCREEN_APP_NAME = 'Onyx Big Screen';
export const ONYX_BIG_SCREEN_IMAGE_NAME = 'onyx-big-screen.png';
export const SUNSHINE_CONFIG_MAX_BYTES = 2_000_000;

export interface SunshinePrepCommand {
  do: string;
  undo: string;
}

export interface SunshineAppEntry {
  name: string;
  cmd?: string;
  output?: string;
  elevated?: boolean;
  'auto-detach'?: boolean;
  'wait-all'?: boolean;
  'exclude-global-prep-cmd'?: boolean;
  detached?: string[];
  'prep-cmd'?: SunshinePrepCommand[];
  'image-path'?: string;
  'working-dir'?: string;
  [key: string]: unknown;
}

export interface SunshineConfig {
  env?: Record<string, string>;
  apps: SunshineAppEntry[];
  [key: string]: unknown;
}

export interface SunshineCandidate {
  host: 'sunshine' | 'apollo';
  appsJson: string;
}

export type ParsedSunshineConfig =
  | { ok: true; config: SunshineConfig }
  | { ok: false; error: string };

function quotePosix(value: string): string {
  if (value.length > 0 && !/[^A-Za-z0-9_@%+=:,./-]/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function onyxBigScreenCommand(executablePath: string, platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    return buildWindowsCommandLine([executablePath, '--big-screen']);
  }
  return `${quotePosix(executablePath)} --big-screen`;
}

export function buildOnyxBigScreenEntry(executablePath: string, imagePath: string, platform: NodeJS.Platform): SunshineAppEntry {
  return {
    name: ONYX_BIG_SCREEN_APP_NAME,
    cmd: onyxBigScreenCommand(executablePath, platform),
    'image-path': imagePath,
    elevated: false,
    // The stream stays attached to Onyx. auto-detach would drop the session when the process starts.
    'auto-detach': false,
    // If Onyx exits while a game it spawned is still running, keep the stream on that game.
    'wait-all': true,
    'exclude-global-prep-cmd': false,
    detached: [],
    'prep-cmd': [],
  };
}

export function sunshineCandidatePaths(env: NodeJS.ProcessEnv, home: string): SunshineCandidate[] {
  const programFiles = env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = env.LOCALAPPDATA || '';
  const candidates: SunshineCandidate[] = [
    { host: 'sunshine', appsJson: path.win32.join(programFiles, 'Sunshine', 'config', 'apps.json') },
    { host: 'sunshine', appsJson: path.win32.join(programFilesX86, 'Sunshine', 'config', 'apps.json') },
    { host: 'apollo', appsJson: path.win32.join(programFiles, 'Apollo', 'config', 'apps.json') },
    { host: 'apollo', appsJson: path.win32.join(programFilesX86, 'Apollo', 'config', 'apps.json') },
  ];
  if (localAppData) {
    candidates.push(
      { host: 'sunshine', appsJson: path.win32.join(localAppData, 'Sunshine', 'config', 'apps.json') },
      { host: 'apollo', appsJson: path.win32.join(localAppData, 'Apollo', 'config', 'apps.json') },
    );
  }
  if (home) {
    candidates.push(
      { host: 'sunshine', appsJson: path.join(home, '.config', 'sunshine', 'apps.json') },
      { host: 'apollo', appsJson: path.join(home, '.config', 'apollo', 'apps.json') },
      {
        host: 'sunshine',
        appsJson: path.join(home, '.var', 'app', 'dev.lizardbyte.app.Sunshine', 'config', 'sunshine', 'apps.json'),
      },
    );
  }
  return candidates;
}

export function parseSunshineConfig(text: string): ParsedSunshineConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'apps.json is not valid JSON. It was not changed.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'apps.json must be a JSON object with an apps array. It was not changed.' };
  }
  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.apps)) {
    return { ok: false, error: 'apps.json has no apps array. It was not changed.' };
  }
  const apps: SunshineAppEntry[] = [];
  for (const entry of record.apps) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return { ok: false, error: 'apps.json contains an app entry that is not an object. It was not changed.' };
    }
    const app = entry as SunshineAppEntry;
    if (typeof app.name !== 'string' || app.name.trim().length === 0) {
      return { ok: false, error: 'apps.json contains an app without a name. It was not changed.' };
    }
    apps.push(app);
  }
  return { ok: true, config: { ...record, apps } };
}

export function findNamedApps(config: SunshineConfig, name: string): SunshineAppEntry[] {
  return config.apps.filter((app) => app.name === name);
}

export function configHasOnyxBigScreen(config: SunshineConfig): boolean {
  return findNamedApps(config, ONYX_BIG_SCREEN_APP_NAME).some((app) => typeof app.cmd === 'string' && app.cmd.includes('--big-screen'));
}

/**
 * Replaces every app named "Onyx Big Screen" with one managed entry.
 * Other apps, env, and unknown fields are kept.
 */
export function upsertOnyxBigScreenApp(config: SunshineConfig, entry: SunshineAppEntry): SunshineConfig {
  const apps = config.apps.filter((app) => app.name !== ONYX_BIG_SCREEN_APP_NAME);
  apps.push(entry);
  return { ...config, apps };
}

export interface SunshineRemoval {
  config: SunshineConfig;
  removed: number;
  blocked: boolean;
}

/**
 * Removes only entries that are both named "Onyx Big Screen" and launch with --big-screen.
 * A same-named app with a different command is left in place.
 */
export function removeOnyxBigScreenApp(config: SunshineConfig): SunshineRemoval {
  const matches = findNamedApps(config, ONYX_BIG_SCREEN_APP_NAME);
  const removable = matches.filter((app) => typeof app.cmd === 'string' && app.cmd.includes('--big-screen'));
  const blocked = matches.length > 0 && removable.length === 0;
  if (removable.length === 0) {
    return { config, removed: 0, blocked };
  }
  const removableSet = new Set(removable);
  return {
    config: { ...config, apps: config.apps.filter((app) => !removableSet.has(app)) },
    removed: removable.length,
    blocked: false,
  };
}

export function serializeSunshineConfig(config: SunshineConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}
