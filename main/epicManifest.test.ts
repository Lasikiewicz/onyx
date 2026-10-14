import { describe, expect, it } from 'vitest';
import { findEpicAppName } from './epicManifest.js';

describe('findEpicAppName (A6)', () => {
  const manifests = [
    { AppName: 'Fortnite', InstallLocation: 'C:\\Epic\\Fortnite' },
    { AppName: 'Salt', InstallLocation: 'D:\\Games\\Salt\\' },
    { AppName: 'Broken' },
  ];

  it('returns the AppName whose InstallLocation matches the install directory', () => {
    expect(findEpicAppName(manifests, 'C:\\Epic\\Fortnite')).toBe('Fortnite');
  });

  it('matches across slash style, case and a trailing separator', () => {
    expect(findEpicAppName(manifests, 'd:/games/salt')).toBe('Salt');
  });

  it('does not match a sibling folder that shares a prefix', () => {
    expect(findEpicAppName(manifests, 'C:\\Epic\\Fortnite2')).toBeUndefined();
  });

  it('returns undefined when no manifest matches or the install directory is empty', () => {
    expect(findEpicAppName(manifests, 'E:\\Nope')).toBeUndefined();
    expect(findEpicAppName(manifests, '')).toBeUndefined();
  });
});
