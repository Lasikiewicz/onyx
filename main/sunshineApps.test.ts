import { describe, expect, it } from 'vitest';
import {
  ONYX_BIG_SCREEN_APP_NAME,
  buildOnyxBigScreenEntry,
  configHasOnyxBigScreen,
  onyxBigScreenCommand,
  parseSunshineConfig,
  removeOnyxBigScreenApp,
  sunshineCandidatePaths,
  upsertOnyxBigScreenApp,
} from './sunshineApps';

const desktop = { name: 'Desktop', 'image-path': 'desktop.png' };

describe('onyxBigScreenCommand', () => {
  it('quotes a Windows path that contains spaces', () => {
    expect(onyxBigScreenCommand('C:\\Program Files\\Onyx\\Onyx.exe', 'win32')).toBe(
      '"C:\\Program Files\\Onyx\\Onyx.exe" --big-screen',
    );
  });

  it('quotes a Linux path that contains spaces', () => {
    expect(onyxBigScreenCommand('/opt/Onyx Games/onyx', 'linux')).toBe("'/opt/Onyx Games/onyx' --big-screen");
  });
});

describe('sunshine config editing', () => {
  const original = {
    env: { PATH: '$(PATH)' },
    apps: [desktop, { name: 'Steam Big Picture', detached: ['steam://open/bigpicture'] }],
  };

  it('rejects invalid json and array roots without producing a config', () => {
    expect(parseSunshineConfig('{').ok).toBe(false);
    expect(parseSunshineConfig('[]').ok).toBe(false);
    expect(parseSunshineConfig('{"env":{}}').ok).toBe(false);
  });

  it('inserts Onyx Big Screen and keeps the other apps', () => {
    const parsed = parseSunshineConfig(JSON.stringify(original));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const entry = buildOnyxBigScreenEntry('C:\\Program Files\\Onyx\\Onyx.exe', 'C:\\Sunshine\\config\\onyx-big-screen.png', 'win32');
    const next = upsertOnyxBigScreenApp(parsed.config, entry);
    expect(next.env).toEqual(original.env);
    expect(next.apps.map((app) => app.name)).toEqual(['Desktop', 'Steam Big Picture', ONYX_BIG_SCREEN_APP_NAME]);
    expect(next.apps[2].cmd).toContain('--big-screen');
    expect(next.apps[2]['auto-detach']).toBe(false);
    expect(next.apps[2]['wait-all']).toBe(true);
    expect(configHasOnyxBigScreen(next)).toBe(true);
  });

  it('replaces an existing Onyx Big Screen entry instead of duplicating it', () => {
    const parsed = parseSunshineConfig(JSON.stringify({
      apps: [desktop, { name: ONYX_BIG_SCREEN_APP_NAME, cmd: 'old.exe --big-screen' }],
    }));
    if (!parsed.ok) throw new Error('parse failed');
    const next = upsertOnyxBigScreenApp(parsed.config, buildOnyxBigScreenEntry('D:\\Onyx\\Onyx.exe', 'art.png', 'win32'));
    expect(next.apps.filter((app) => app.name === ONYX_BIG_SCREEN_APP_NAME)).toHaveLength(1);
    expect(next.apps[1].cmd).toContain('D:\\Onyx\\Onyx.exe');
  });

  it('removes only an Onyx entry whose command contains --big-screen', () => {
    const parsed = parseSunshineConfig(JSON.stringify({
      apps: [
        desktop,
        { name: ONYX_BIG_SCREEN_APP_NAME, cmd: '"C:\\Onyx\\Onyx.exe" --big-screen' },
      ],
    }));
    if (!parsed.ok) throw new Error('parse failed');
    const removed = removeOnyxBigScreenApp(parsed.config);
    expect(removed.removed).toBe(1);
    expect(removed.blocked).toBe(false);
    expect(removed.config.apps).toEqual([desktop]);
  });

  it('does not remove a different app that happens to use the same name', () => {
    const custom = { name: ONYX_BIG_SCREEN_APP_NAME, cmd: 'C:\\Custom\\launcher.exe' };
    const parsed = parseSunshineConfig(JSON.stringify({ apps: [desktop, custom] }));
    if (!parsed.ok) throw new Error('parse failed');
    const removed = removeOnyxBigScreenApp(parsed.config);
    expect(removed.removed).toBe(0);
    expect(removed.blocked).toBe(true);
    expect(removed.config.apps).toEqual([desktop, custom]);
  });
});

describe('sunshineCandidatePaths', () => {
  it('includes the Windows Sunshine and Apollo install locations', () => {
    const paths = sunshineCandidatePaths({
      ProgramFiles: 'C:\\Program Files',
      'ProgramFiles(x86)': 'C:\\Program Files (x86)',
      LOCALAPPDATA: 'C:\\Users\\Ada\\AppData\\Local',
    }, '').map((candidate) => candidate.appsJson);
    expect(paths).toContain('C:\\Program Files\\Sunshine\\config\\apps.json');
    expect(paths).toContain('C:\\Program Files\\Apollo\\config\\apps.json');
    expect(paths).toContain('C:\\Users\\Ada\\AppData\\Local\\Sunshine\\config\\apps.json');
  });
});
