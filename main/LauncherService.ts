import { spawn, execFile } from 'child_process';
import { dirname, join, normalize } from 'path';
import { constants as fsConstants, existsSync, promises as fsp, readdirSync } from 'node:fs';
import { shell } from 'electron';
import { GameStore, Game } from './GameStore.js';
import { isSafeExternalUrl } from './SecurityUtils.js';
import { resolveKnownGameLauncherExecutable } from './knownGameLaunchers.js';
import { IS_WINDOWS } from './platformSupport.js';
import { buildWindowsCommandLine } from './windowsCommandLine.js';
import { findProcessByInstallDir, listProcesses } from './ProcessLookup.js';
import { lookupEpicAppName } from './epicManifest.js';
import { gameProcessEvents, PROCESS_FOUND_EVENT, type ProcessFoundEvent } from './gameProcessEvents.js';

/**
 * Whether the Windows-only store clients (Epic Games Launcher, EA App/Origin, GOG Galaxy, Ubisoft
 * Connect, Xbox) can be present. Their `com.epicgames.launcher://`, `origin2://`, `goggalaxy://`,
 * `uplay://` and `shell:AppsFolder\` handlers exist on Windows only, so elsewhere those branches
 * must be skipped in favour of a stored launch URI or a direct executable launch.
 *
 * Steam is deliberately not covered: `steam://` is registered by the native Linux client too.
 */
const HAS_NATIVE_STORE_CLIENTS = IS_WINDOWS;

/**
 * Common uninstaller executable names to look for in the game folder. The Linux entries cover the
 * `uninstall.sh` GOG's native installers write and the extension-less variant some ship instead;
 * they are kept off Windows so the file this picks in a Windows game folder cannot change.
 */
const UNINSTALLER_NAMES = [
  'uninstall.exe', 'Uninstall.exe', 'unins000.exe', 'unins001.exe', 'unins002.exe',
  ...(IS_WINDOWS ? [] : ['uninstall.sh', 'uninstall']),
];

const escapePowerShellSingleQuoted = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/** Protocol launches return no PID. Look for the game's process this long after launch. */
const PROCESS_WATCH_INITIAL_DELAY_MS = 5_000;
const PROCESS_WATCH_INTERVAL_MS = 2_000;
const PROCESS_WATCH_TIMEOUT_MS = 90_000;

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await fsp.stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

/** The PowerShell launch prints the new process ID as its last line (`-PassThru`). */
function parseLaunchedPid(stdout: string): number | undefined {
  const pid = Number(stdout.trim().split(/\r?\n/).pop());
  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
}

export class LauncherService {
  private gameStore: GameStore;

  constructor(gameStore: GameStore) {
    this.gameStore = gameStore;
  }

  /**
   * Launch a game by its ID
   * Supports URI protocols for:
   * - Steam: steam://rungameid/<AppID>
   * - Epic: com.epicgames.launcher://apps/<AppID>?action=launch&silent=true
   * - GOG: goggalaxy://openGameView/<ProductID>
   * - Xbox: shell:appsFolder\\<PackageFamilyName>!App (uses explorer)
   * - EA/Origin: origin2://game/launch?offerIds=<OfferId>
   * - Battle.net: Uses Battle.net.exe --exec=\"launch <GameCode>\"
   * - Ubisoft: uplay://launch/<GameID>
   * For non-launcher games: executes the .exe file using child_process.spawn
   * Returns PID for non-Steam games for process tracking
   */
  async launchGame(gameId: string): Promise<{ success: boolean; error?: string; pid?: number }> {
    try {
      const games = await this.gameStore.getLibrary();
      const game = games.find(g => g.id === gameId);

      if (!game) {
        return { success: false, error: `Game with ID ${gameId} not found` };
      }

      // A stored launch URI wins over every source-derived protocol guess below. This is how the
      // Linux launcher integrations work: a Heroic game must go through `heroic://` so Heroic
      // applies the Wine/Proton prefix, environment and wrappers it was configured with, which
      // spawning the game binary directly would discard.
      //
      // Xbox is the one exception — its `shell:AppsFolder\...` URIs need explorer.exe rather than
      // the shell's external handler, so they stay with the Xbox branch further down.
      const storedLaunchUri = typeof game.launchUri === 'string' ? game.launchUri.trim() : '';
      if (storedLaunchUri && !storedLaunchUri.toLowerCase().startsWith('shell:')) {
        if (!isSafeExternalUrl(storedLaunchUri)) {
          return { success: false, error: `Refusing to launch disallowed URI scheme: ${storedLaunchUri}` };
        }
        console.log(`[LauncherService] Launching via stored launch URI: ${storedLaunchUri}`);
        await shell.openExternal(storedLaunchUri);
        this.watchForInstallDirProcess(game);

        const lastPlayed = new Date().toISOString();
        game.lastPlayed = lastPlayed;
        this.gameStore.updateGame(game.id, { lastPlayed });

        return { success: true };
      }

      // Check ID format to determine launcher (most reliable method)
      // Steam games: steam-<AppID>
      const steamMatch = gameId.match(/^steam-(.+)$/);

      if (steamMatch && steamMatch[1]) {
        // This is a Steam game - launch via Steam URL protocol
        const appId = steamMatch[1];
        const steamUrl = `steam://rungameid/${appId}`;
        await shell.openExternal(steamUrl);

        // Update lastPlayed timestamp
        const lastPlayed = new Date().toISOString();
        game.lastPlayed = lastPlayed;
        this.gameStore.updateGame(game.id, { lastPlayed });

        this.watchForInstallDirProcess(game);

        return { success: true };
      }

      // Epic Games: epic-<CatalogItemId> or epic-<AppName>
      const epicMatch = gameId.match(/^epic-(.+)$/);
      const isEpic = epicMatch || game.platform === 'epic' || game.source === 'epic';
      if (isEpic && game.installationDirectory && HAS_NATIVE_STORE_CLIENTS) {
        // Epic launches by AppName (apps/<AppName>), not by install path (A6). Games imported since
        // then have that URI stored and take the stored-URI branch above. For older games, read the
        // AppName from the Epic manifest once and save it, so later launches use the stored URI.
        const appName = await lookupEpicAppName(game.installationDirectory);
        if (appName) {
          const epicUrl = `com.epicgames.launcher://apps/${encodeURIComponent(appName)}?action=launch&silent=true`;
          console.log(`[LauncherService] Launching Epic game: ${epicUrl}`);
          this.gameStore.updateGame(game.id, { launchUri: epicUrl });
          await shell.openExternal(epicUrl);
          this.watchForInstallDirProcess(game);

          // Update lastPlayed timestamp
          const lastPlayed = new Date().toISOString();
          game.lastPlayed = lastPlayed;
          this.gameStore.updateGame(game.id, { lastPlayed });

          return { success: true };
        }
        console.warn(`[LauncherService] No Epic manifest matches ${game.installationDirectory}; launching the executable instead`);
      }

      // EA/Origin: ea-<OfferId> or origin-<OfferId>
      const eaMatch = gameId.match(/^(ea|origin)-(.+)$/);
      const isEA = eaMatch || game.platform === 'ea' || game.source === 'ea' || game.platform === 'origin' || game.source === 'origin';
      if (isEA && eaMatch && eaMatch[2] && HAS_NATIVE_STORE_CLIENTS) {
        // EA uses: origin2://game/launch?offerIds=<OfferId>
        const offerId = eaMatch[2];
        const eaUrl = `origin2://game/launch?offerIds=${offerId}`;
        console.log(`[LauncherService] Launching EA game: ${eaUrl}`);
        await shell.openExternal(eaUrl);

        // Update lastPlayed timestamp
        const lastPlayed = new Date().toISOString();
        game.lastPlayed = lastPlayed;
        this.gameStore.updateGame(game.id, { lastPlayed });

        return { success: true };
      }

      // GOG: gog-<ProductId> (Product IDs should be numeric)
      const gogMatch = gameId.match(/^gog-(\d+)$/);
      const isGOG = gogMatch || game.platform === 'gog' || game.source === 'gog';
      if (isGOG && gogMatch && gogMatch[1] && HAS_NATIVE_STORE_CLIENTS) {
        // GOG uses: goggalaxy://launchGame/<ProductID>
        const productId = gogMatch[1];
        const gogUrl = `goggalaxy://launchGame/${productId}`;
        console.log(`[LauncherService] Launching GOG game via protocol: ${gogUrl}`);
        await shell.openExternal(gogUrl);

        // Update lastPlayed timestamp
        const lastPlayed = new Date().toISOString();
        game.lastPlayed = lastPlayed;
        this.gameStore.updateGame(game.id, { lastPlayed });

        return { success: true };
      }

      // Ubisoft Connect: ubisoft-<GameId> (Game IDs should be numeric)
      const ubisoftMatch = gameId.match(/^ubisoft-(\d+)$/);
      const isUbisoft = ubisoftMatch || game.platform === 'ubisoft' || game.source === 'ubisoft';
      if (isUbisoft && ubisoftMatch && ubisoftMatch[1] && HAS_NATIVE_STORE_CLIENTS) {
        // Ubisoft uses: uplay://launch/<GameID>
        const gameUbisoftId = ubisoftMatch[1];
        const ubisoftUrl = `uplay://launch/${gameUbisoftId}`;
        console.log(`[LauncherService] Launching Ubisoft game via protocol: ${ubisoftUrl}`);
        await shell.openExternal(ubisoftUrl);

        // Update lastPlayed timestamp
        const lastPlayed = new Date().toISOString();
        game.lastPlayed = lastPlayed;
        this.gameStore.updateGame(game.id, { lastPlayed });

        return { success: true };
      }

      // Rockstar Games Launcher: Launch via exe (no URI protocol)
      // Rockstar games typically need to be launched through their exe
      const isRockstar = game.platform === 'rockstar' || game.source === 'rockstar';
      if (isRockstar && game.exePath) {
        console.log(`[LauncherService] Launching Rockstar game via exe: ${game.exePath}`);
        // Fall through to exe launch below
      }

      // Xbox (UWP/PC Game Pass) — Windows-only by construction
      const isXbox = gameId.startsWith('xbox-') || game.platform === 'xbox' || game.source === 'xbox';
      if (isXbox && HAS_NATIVE_STORE_CLIENTS) {
        const xboxKind = game.xboxKind;
        const appUserModelId = game.appUserModelId;
        const launchUri = game.launchUri ?? (appUserModelId ? `shell:AppsFolder\\${appUserModelId}` : undefined);

        console.log(`[LauncherService] Launching Xbox game: ${game.title}`);
        console.log(`  xboxKind: ${xboxKind}`);
        console.log(`  exePath: ${game.exePath}`);
        console.log(`  appUserModelId: ${appUserModelId}`);
        console.log(`  launchUri: ${launchUri}`);

        // Prefer direct explorer launch for UWP/MSIX entries
        if ((xboxKind === 'uwp' || appUserModelId || launchUri) && launchUri) {
          console.log(`[LauncherService] Using explorer.exe launch with URI: ${launchUri}`);
          const child = spawn('explorer.exe', [launchUri], {
            detached: true,
            stdio: 'ignore',
            shell: false,
          });
          child.unref();

          // Update lastPlayed timestamp
          const lastPlayed = new Date().toISOString();
          game.lastPlayed = lastPlayed;
          this.gameStore.updateGame(game.id, { lastPlayed });

          // Do not return explorer PID here: explorer exits quickly and is not the actual game process.
          // Returning it causes renderer/background tracking to mark the game as stopped almost immediately.
          return { success: true };
        }

        // Fallback to executable launch for PC installs
        if (!game.exePath) {
          console.error(`[LauncherService] Xbox PC game has no executable path: ${game.title}`);
          return { success: false, error: 'Executable path not set for this Xbox game' };
        }

        console.log(`[LauncherService] Using exe launch for PC Game Pass: ${game.exePath}`);
      }

      // Fallback: Check platform field if ID format doesn't match
      if (game.platform === 'steam') {
        // Fallback: platform is set to 'steam' but ID format doesn't match
        // Try to extract appId from the ID anyway
        const fallbackMatch = gameId.match(/steam-?(\d+)/);
        if (fallbackMatch && fallbackMatch[1]) {
          const appId = fallbackMatch[1];
          const steamUrl = `steam://rungameid/${appId}`;
          await shell.openExternal(steamUrl);

          // Update lastPlayed timestamp
          const lastPlayed = new Date().toISOString();
          game.lastPlayed = lastPlayed;
          this.gameStore.updateGame(game.id, { lastPlayed });

          return { success: true };
        }
        return { success: false, error: 'Invalid Steam game ID format' };
      }

      // For GOG games without proper IDs, try to launch via exe
      if (isGOG && !gogMatch && game.exePath) {
        console.log(`[LauncherService] GOG game without proper ID, launching via exe: ${game.exePath}`);
        // Fall through to exe launch below
      }

      // For Epic games without proper installation directory, try exe launch
      if (isEpic && !game.installationDirectory && game.exePath) {
        console.log(`[LauncherService] Epic game without installation directory, launching via exe: ${game.exePath}`);
        // Fall through to exe launch below
      }

      const knownLauncherExe = resolveKnownGameLauncherExecutable(game);

      // Non-launcher game or fallback: launch the executable
      if (!game.exePath && !knownLauncherExe) {
        return { success: false, error: 'Executable path not set for this game' };
      }

      // Use normalized native paths on Windows to avoid EACCES (spawn can fail with forward slashes)
      let exePath = knownLauncherExe || game.exePath;
      if (exePath.startsWith('"') && exePath.endsWith('"')) {
        exePath = exePath.slice(1, -1);
      }

      // A folder can't be run. Say so, rather than letting spawn fail with an opaque error (E4).
      if (!knownLauncherExe && (await isDirectory(exePath))) {
        return {
          success: false,
          error: `No executable set for ${game.title}: "${exePath}" is a folder. Choose the game's .exe in Game Manager.`,
        };
      }
      exePath = normalize(exePath);
      const workingDir = normalize(dirname(exePath));

      if (knownLauncherExe && normalize(game.exePath || '') !== exePath) {
        console.log(`[LauncherService] Resolved known launcher executable for ${game.title}: ${exePath}`);
      }

      console.log(`[LauncherService] Executing exe: ${exePath}`);
      console.log(`[LauncherService] Working directory: ${workingDir}`);

      // Parse launch arguments if provided (trim so whitespace-only or leading/trailing space works)
      const args: string[] = [];
      const launchArgsStr = typeof game.launchArgs === 'string' ? game.launchArgs.trim() : '';
      if (launchArgsStr) {
        const regex = /[^\s"]+|"([^"]*)"/g;
        let match;
        while ((match = regex.exec(launchArgsStr)) !== null) {
          const arg = match[1] !== undefined ? match[1] : match[0];
          if (arg.length > 0) args.push(arg);
        }
        console.log(`[LauncherService] Parsed launch arguments: ${JSON.stringify(args)}`);
      }

      let child: ReturnType<typeof spawn> | undefined;
      let launchedPid: number | undefined;
      if (process.platform === 'win32') {
        // On Windows, use PowerShell's Start-Process to handle UAC elevation prompts properly 
        // while also supporting working directories and arguments.
        // One pre-quoted string, not an array: PS 5.1 joins array elements with spaces and does not
        // quote them, which split any argument containing a space (A5).
        const psArgs = args.length > 0
          ? ` -ArgumentList ${escapePowerShellSingleQuoted(buildWindowsCommandLine(args))}`
          : '';
        const psCommand = `$ErrorActionPreference = 'Stop'; $p = Start-Process -FilePath ${escapePowerShellSingleQuoted(exePath)} -WorkingDirectory ${escapePowerShellSingleQuoted(workingDir)}${psArgs} -PassThru; Write-Output $p.Id`;
        
        console.log(`[LauncherService] Using PowerShell launch: ${psCommand}`);
        const launchResult = await new Promise<{ success: boolean; error?: string; pid?: number }>((resolve) => {
          const psChild = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
          });

          let stdout = '';
          psChild.stdout?.on('data', (chunk) => {
            stdout += chunk.toString();
          });
          let stderr = '';
          psChild.stderr?.on('data', (chunk) => {
            stderr += chunk.toString();
          });
          psChild.on('error', (error) => {
            resolve({ success: false, error: error.message });
          });
          psChild.on('close', (code) => {
            if (code === 0) {
              resolve({ success: true, pid: parseLaunchedPid(stdout) });
            } else {
              resolve({ success: false, error: stderr.trim() || `PowerShell launch failed with exit code ${code}` });
            }
          });
        });

        if (!launchResult.success) {
          return { success: false, error: launchResult.error || 'PowerShell launch failed' };
        }
        launchedPid = launchResult.pid;
      } else {
        // Games unpacked from an archive routinely lose the executable bit, and the raw spawn
        // failure for that is an opaque EACCES. Check first so the user gets told what to fix.
        try {
          await fsp.access(exePath, fsConstants.X_OK);
        } catch {
          return {
            success: false,
            error: `"${exePath}" is not marked executable. Run: chmod +x "${exePath}"`,
          };
        }

        child = spawn(exePath, args, {
          detached: true,
          stdio: 'ignore',
          shell: false,
          cwd: workingDir,
        });
      }

      if (child) {
        child.unref();
        child.on('error', (error) => {
          console.error(`Failed to launch game: ${error.message}`);
        });
      }

      const lastPlayed = new Date().toISOString();
      game.lastPlayed = lastPlayed;
      this.gameStore.updateGame(game.id, { lastPlayed });

      if (isXbox) {
        return { success: true };
      }
      if (process.platform === 'win32') {
        return { success: true, pid: launchedPid };
      }
      return { success: true, pid: child?.pid };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error launching game:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Launch the configured mod manager for a game
   * Supports vetted launcher/web URLs and local file paths
   */
  async launchModManagerTarget(modManagerUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!modManagerUrl) {
        return { success: false, error: 'Mod manager not configured' };
      }

      if (isSafeExternalUrl(modManagerUrl)) {
        try {
          await shell.openExternal(modManagerUrl);
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error('[LauncherService] Failed to open external mod manager URL:', message);
          return { success: false, error: message };
        }
      }

      if (existsSync(modManagerUrl)) {
        const error = await shell.openPath(modManagerUrl);
        return { success: error === '', error: error || undefined };
      }

      console.warn('[LauncherService] Mod manager URL is not allowed and path does not exist:', modManagerUrl);
      return { success: false, error: 'Mod manager path or URL is invalid, unsafe, or not found' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error launching mod manager target:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async launchModManager(gameId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const games = await this.gameStore.getLibrary();
      const game = games.find(g => g.id === gameId);

      if (!game) {
        return { success: false, error: `Game with ID ${gameId} not found` };
      }

      const modManagerUrl = game.modManagerUrl;
      if (!modManagerUrl) {
        return { success: false, error: 'Mod manager not configured for this game' };
      }

      console.log(`[LauncherService] Launching mod manager for ${game.title}: ${modManagerUrl}`);
      return await this.launchModManagerTarget(modManagerUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error launching mod manager:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Fallback when no uninstaller sits in the game folder. Windows has a system page for this;
   * elsewhere there is no equivalent — Linux uninstalls go through the distro's package manager or
   * the launcher that installed the game — so report that instead of opening the wrong thing.
   */
  private async openUninstallFallback(gameTitle: string): Promise<{ success: boolean; error?: string; openedUninstaller?: boolean }> {
    if (IS_WINDOWS) {
      await shell.openExternal('ms-settings:appsfeatures');
      return { success: true, openedUninstaller: false };
    }

    console.log(`[LauncherService] No uninstaller found for "${gameTitle}" and no system uninstall UI on this platform`);
    return {
      success: false,
      openedUninstaller: false,
      error: 'No uninstaller was found in the game folder. Remove this game with your package manager or the launcher that installed it.',
    };
  }

  /**
   * Open the game's uninstaller if present in the game folder; otherwise fall back per platform.
   */
  async openGameUninstaller(gameId: string): Promise<{ success: boolean; error?: string; openedUninstaller?: boolean }> {
    try {
      const games = await this.gameStore.getLibrary();
      const game = games.find(g => g.id === gameId);
      if (!game) {
        return { success: false, error: `Game with ID ${gameId} not found` };
      }

      const gameDir = game.exePath ? dirname(game.exePath) : game.installationDirectory;
      if (!gameDir || !existsSync(gameDir)) {
        console.log(`[LauncherService] No game folder for "${game.title}"`);
        return this.openUninstallFallback(game.title);
      }

      const dirEntries = readdirSync(gameDir, { withFileTypes: true });
      const files = dirEntries.filter(e => e.isFile());
      const lowerToName = new Map(files.map(e => [e.name.toLowerCase(), e.name]));

      for (const name of UNINSTALLER_NAMES) {
        const actualName = lowerToName.get(name.toLowerCase());
        if (actualName) {
          const uninstallerPath = join(gameDir, actualName);
          console.log(`[LauncherService] Opening uninstaller: ${uninstallerPath}`);
          const openError = await shell.openPath(uninstallerPath);
          if (openError) {
            return { success: false, error: openError, openedUninstaller: true };
          }
          return { success: true, openedUninstaller: true };
        }
      }

      console.log(`[LauncherService] No uninstaller found in "${gameDir}"`);
      return this.openUninstallFallback(game.title);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[LauncherService] Error in openGameUninstaller:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Protocol launches (Steam, Epic, stored launch URIs) return no PID. Poll for a process running
   * from the game's install directory and publish it, so running state, restore-after-launch and
   * background-scan pausing follow the real game instead of a fixed timer (A4, A7).
   */
  private watchForInstallDirProcess(game: Game): void {
    const installDir = game.installationDirectory;
    if (process.platform !== 'win32' || !installDir) return;

    const deadline = Date.now() + PROCESS_WATCH_TIMEOUT_MS;
    const poll = async (): Promise<void> => {
      const pid = findProcessByInstallDir(await listProcesses(), installDir);
      if (pid !== undefined) {
        console.log(`[LauncherService] Found process ${pid} for ${game.title}`);
        gameProcessEvents.emit(PROCESS_FOUND_EVENT, { gameId: game.id, pid } satisfies ProcessFoundEvent);
        return;
      }
      if (Date.now() < deadline) setTimeout(() => void poll(), PROCESS_WATCH_INTERVAL_MS);
    };
    setTimeout(() => void poll(), PROCESS_WATCH_INITIAL_DELAY_MS);
  }
}
