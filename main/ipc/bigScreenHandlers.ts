import { app, ipcMain, type BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { syncBringToFront, type BringToFrontSyncResult } from '../bringToFrontService';
import {
  enterBigScreenWindow,
  exitBigScreenWindow,
  listBigScreenDisplays,
  returnToBigScreenWindow,
} from '../bigScreenWindow';
import { getBigScreenSession, isBigScreenSessionActive } from '../bigScreenSession';
import { normalizeDisplayChoice, type DisplayChoice } from '../displayChoice';
import { parseLaunchFlags } from '../launchFlags';
import {
  ONYX_BIG_SCREEN_IMAGE_NAME,
  SUNSHINE_CONFIG_MAX_BYTES,
  buildOnyxBigScreenEntry,
  configHasOnyxBigScreen,
  onyxBigScreenCommand,
  parseSunshineConfig,
  removeOnyxBigScreenApp,
  serializeSunshineConfig,
  sunshineCandidatePaths,
  upsertOnyxBigScreenApp,
  type SunshineCandidate,
} from '../sunshineApps';
import type { UserPreferencesService } from '../UserPreferencesService';

interface BigScreenHandlerDeps {
  getWindow: () => BrowserWindow | null;
  userPreferencesService: UserPreferencesService;
}

export interface SunshineInstallReport {
  host: 'sunshine' | 'apollo';
  appsJson: string;
  hasOnyxEntry: boolean;
}

export interface SunshineFileResult {
  appsJson: string;
  success: boolean;
  error?: string;
  backupPath?: string;
  removed?: number;
}

async function existingCandidates(): Promise<Array<SunshineCandidate & { realPath: string }>> {
  const found: Array<SunshineCandidate & { realPath: string }> = [];
  for (const candidate of sunshineCandidatePaths(process.env, os.homedir())) {
    try {
      const realPath = await fs.realpath(candidate.appsJson);
      const stat = await fs.stat(realPath);
      if (!stat.isFile() || stat.size > SUNSHINE_CONFIG_MAX_BYTES) continue;
      found.push({ ...candidate, realPath });
    } catch {
      // Missing installs are skipped. We never create an apps.json.
    }
  }
  return found;
}

async function resolveAllowed(requested: unknown): Promise<Array<SunshineCandidate & { realPath: string }>> {
  const allowed = await existingCandidates();
  const requestedPaths = Array.isArray(requested) ? requested.filter((entry): entry is string => typeof entry === 'string') : [];
  const resolved: Array<SunshineCandidate & { realPath: string }> = [];
  for (const requestPath of requestedPaths) {
    let realPath: string;
    try {
      realPath = await fs.realpath(requestPath);
    } catch {
      continue;
    }
    const match = allowed.find((candidate) => candidate.realPath === realPath);
    if (match && !resolved.some((entry) => entry.realPath === match.realPath)) {
      resolved.push(match);
    }
  }
  return resolved;
}

function boxArtCandidates(): string[] {
  return [
    path.join(process.resourcesPath, ONYX_BIG_SCREEN_IMAGE_NAME),
    path.join(app.getAppPath(), 'resources', ONYX_BIG_SCREEN_IMAGE_NAME),
    path.join(process.cwd(), 'resources', ONYX_BIG_SCREEN_IMAGE_NAME),
  ];
}

async function resolveBoxArt(): Promise<string | null> {
  for (const candidate of boxArtCandidates()) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // try the next location
    }
  }
  return null;
}

function commandPreview(): string {
  const executable = app.isPackaged
    ? process.execPath
    : (process.platform === 'win32' ? 'C:\\Program Files\\Onyx\\Onyx.exe' : '/usr/bin/onyx');
  return onyxBigScreenCommand(executable, process.platform);
}

async function writeConfigAtomically(appsJson: string, contents: string): Promise<string> {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const backupPath = `${appsJson}.onyx-backup-${stamp}`;
  await fs.copyFile(appsJson, backupPath);
  const tmpPath = `${appsJson}.onyx-tmp`;
  await fs.writeFile(tmpPath, contents, 'utf8');
  await fs.rename(tmpPath, appsJson);
  return backupPath;
}

async function readConfigText(realPath: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const stat = await fs.stat(realPath);
  if (stat.size > SUNSHINE_CONFIG_MAX_BYTES) {
    return { ok: false, error: 'apps.json is unexpectedly large. It was not changed.' };
  }
  return { ok: true, text: await fs.readFile(realPath, 'utf8') };
}

export function registerBigScreenHandlers(deps: BigScreenHandlerDeps): { syncBringToFront: () => Promise<BringToFrontSyncResult> } {
  const sync = () => syncBringToFront({
    getWindow: deps.getWindow,
    userPreferencesService: deps.userPreferencesService,
  });

  ipcMain.handle('big-screen:getLaunchFlags', async () => {
    const flags = parseLaunchFlags(process.argv);
    const session = getBigScreenSession();
    return {
      bigScreen: flags.bigScreen || session.active,
      bigScreenDisplay: flags.bigScreenDisplay ?? session.displayChoice,
    };
  });

  ipcMain.handle('big-screen:listDisplays', async () => listBigScreenDisplays());

  ipcMain.handle('big-screen:enter', async (_event, options: unknown) => {
    const win = deps.getWindow();
    if (!win) return { success: false, error: 'The main window is not open.' };
    const explicit = options && typeof options === 'object' && 'display' in options
      ? (options as { display?: unknown }).display
      : undefined;
    let choice: DisplayChoice;
    if (explicit !== undefined) {
      choice = normalizeDisplayChoice(explicit);
    } else {
      const flags = parseLaunchFlags(process.argv);
      if (flags.bigScreenDisplay) {
        choice = flags.bigScreenDisplay;
      } else {
        const prefs = await deps.userPreferencesService.getPreferences();
        choice = normalizeDisplayChoice(prefs.bigScreenDisplay);
      }
    }
    enterBigScreenWindow(win, choice);
    return { success: true, display: getBigScreenSession().displayChoice };
  });

  ipcMain.handle('big-screen:exit', async () => {
    const win = deps.getWindow();
    if (!win) return { success: false, error: 'The main window is not open.' };
    exitBigScreenWindow(win);
    return { success: true };
  });

  ipcMain.handle('big-screen:returnFromGame', async () => {
    const win = deps.getWindow();
    if (!win) return { success: false, returned: false };
    return { success: true, returned: returnToBigScreenWindow(win) };
  });

  ipcMain.handle('big-screen:syncWake', async () => sync());

  ipcMain.handle('sunshine:detect', async () => {
    const installs: SunshineInstallReport[] = [];
    for (const candidate of await existingCandidates()) {
      let hasOnyxEntry = false;
      try {
        const text = await fs.readFile(candidate.realPath, 'utf8');
        const parsed = parseSunshineConfig(text);
        hasOnyxEntry = parsed.ok && configHasOnyxBigScreen(parsed.config);
      } catch {
        hasOnyxEntry = false;
      }
      installs.push({
        host: candidate.host,
        appsJson: candidate.realPath,
        hasOnyxEntry,
      });
    }
    const art = await resolveBoxArt();
    return {
      installs,
      packaged: app.isPackaged,
      commandPreview: commandPreview(),
      imageAvailable: art !== null,
    };
  });

  ipcMain.handle('sunshine:add', async (_event, requested: unknown) => {
    if (!app.isPackaged) {
      return {
        success: false,
        error: 'Onyx is running from a development build. The entry would point at the Electron binary, so nothing was written.',
        results: [] as SunshineFileResult[],
      };
    }
    const targets = await resolveAllowed(requested);
    if (targets.length === 0) {
      return { success: false, error: 'No confirmed Sunshine or Apollo apps.json was selected.', results: [] as SunshineFileResult[] };
    }
    const artSource = await resolveBoxArt();
    const results: SunshineFileResult[] = [];
    for (const target of targets) {
      try {
        const read = await readConfigText(target.realPath);
        if (!read.ok) {
          results.push({ appsJson: target.realPath, success: false, error: read.error });
          continue;
        }
        const parsed = parseSunshineConfig(read.text);
        if (!parsed.ok) {
          results.push({ appsJson: target.realPath, success: false, error: parsed.error });
          continue;
        }
        const imageDestination = path.join(path.dirname(target.realPath), ONYX_BIG_SCREEN_IMAGE_NAME);
        let imagePath = imageDestination;
        if (artSource) {
          try {
            await fs.copyFile(artSource, imageDestination);
          } catch (error) {
            imagePath = artSource;
            console.warn('[Sunshine] Could not copy box art next to apps.json:', error);
          }
        }
        const next = upsertOnyxBigScreenApp(
          parsed.config,
          buildOnyxBigScreenEntry(process.execPath, imagePath, process.platform),
        );
        const backupPath = await writeConfigAtomically(target.realPath, serializeSunshineConfig(next));
        results.push({ appsJson: target.realPath, success: true, backupPath });
      } catch (error) {
        results.push({
          appsJson: target.realPath,
          success: false,
          error: error instanceof Error ? error.message : 'Could not update apps.json.',
        });
      }
    }
    const success = results.length > 0 && results.every((result) => result.success);
    return { success, results, error: success ? undefined : 'One or more Sunshine/Apollo files were not updated.' };
  });

  ipcMain.handle('sunshine:remove', async (_event, requested: unknown) => {
    const targets = await resolveAllowed(requested);
    if (targets.length === 0) {
      return { success: false, error: 'No confirmed Sunshine or Apollo apps.json was selected.', results: [] as SunshineFileResult[] };
    }
    const results: SunshineFileResult[] = [];
    for (const target of targets) {
      try {
        const read = await readConfigText(target.realPath);
        if (!read.ok) {
          results.push({ appsJson: target.realPath, success: false, error: read.error });
          continue;
        }
        const parsed = parseSunshineConfig(read.text);
        if (!parsed.ok) {
          results.push({ appsJson: target.realPath, success: false, error: parsed.error });
          continue;
        }
        const removal = removeOnyxBigScreenApp(parsed.config);
        if (removal.blocked) {
          results.push({
            appsJson: target.realPath,
            success: false,
            removed: 0,
            error: 'An app named "Onyx Big Screen" is present, but its command is not the Onyx --big-screen command. It was left unchanged.',
          });
          continue;
        }
        if (removal.removed === 0) {
          results.push({ appsJson: target.realPath, success: true, removed: 0 });
          continue;
        }
        const backupPath = await writeConfigAtomically(target.realPath, serializeSunshineConfig(removal.config));
        const imagePath = path.join(path.dirname(target.realPath), ONYX_BIG_SCREEN_IMAGE_NAME);
        try {
          await fs.unlink(imagePath);
        } catch {
          // The box art may already be gone, or the user replaced it. The app entry is still removed.
        }
        results.push({ appsJson: target.realPath, success: true, backupPath, removed: removal.removed });
      } catch (error) {
        results.push({
          appsJson: target.realPath,
          success: false,
          error: error instanceof Error ? error.message : 'Could not update apps.json.',
        });
      }
    }
    const success = results.length > 0 && results.every((result) => result.success);
    return { success, results, error: success ? undefined : 'One or more Sunshine/Apollo files were not updated.' };
  });

  return { syncBringToFront: sync };
}

export function bigScreenSessionIsActive(): boolean {
  return isBigScreenSessionActive();
}
