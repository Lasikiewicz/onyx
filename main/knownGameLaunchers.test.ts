import { describe, expect, it } from 'vitest';
import { normalize } from 'node:path';
import { resolveKnownGameLauncherExecutable } from './knownGameLaunchers.js';

describe('resolveKnownGameLauncherExecutable', () => {
  it('redirects Neverness To Everness nested client executables to the root launcher', () => {
    const launcherPath = normalize('C:\\Program Files\\Neverness To Everness\\NTEGlobalLauncher.exe');

    const result = resolveKnownGameLauncherExecutable(
      {
        title: 'Neverness To Everness',
        platform: 'hardcoded',
        source: 'hardcoded',
        installationDirectory: 'C:\\Program Files\\Neverness To Everness',
        exePath: 'C:\\Program Files\\Neverness To Everness\\Client\\NTE\\NTE.exe',
      },
      {
        pathExists: (path) => normalize(path) === launcherPath,
      },
    );

    expect(result).toBe(launcherPath);
  });

  it('can recover the Neverness launcher from the default install path when exePath is missing', () => {
    const launcherPath = normalize('C:\\Program Files\\Neverness To Everness\\NTEGlobalLauncher.exe');

    const result = resolveKnownGameLauncherExecutable(
      {
        title: 'Neverness To Everness',
        platform: 'hardcoded',
        source: 'hardcoded',
        installationDirectory: undefined,
        exePath: '',
      },
      {
        pathExists: (path) => normalize(path) === launcherPath,
      },
    );

    expect(result).toBe(launcherPath);
  });

  it('leaves unrelated games on their existing launch path', () => {
    const result = resolveKnownGameLauncherExecutable(
      {
        title: 'Example Game',
        platform: 'manual',
        source: 'manual',
        installationDirectory: 'D:\\Games\\Example Game',
        exePath: 'D:\\Games\\Example Game\\Example.exe',
      },
      {
        pathExists: () => true,
      },
    );

    expect(result).toBeUndefined();
  });
});

