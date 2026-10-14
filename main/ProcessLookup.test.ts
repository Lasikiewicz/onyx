import { describe, expect, it } from 'vitest';
import { findProcessByInstallDir, parseProcessList } from './ProcessLookup.js';

describe('parseProcessList (A7)', () => {
  it('accepts an array of processes', () => {
    const json = JSON.stringify([
      { ProcessId: 10, ExecutablePath: 'C:\\Games\\A\\a.exe' },
      { ProcessId: 11, ExecutablePath: null },
    ]);
    expect(parseProcessList(json)).toEqual([{ pid: 10, exePath: 'C:\\Games\\A\\a.exe' }]);
  });

  it('accepts a single bare object, which PowerShell emits for one process', () => {
    const json = JSON.stringify({ ProcessId: 42, ExecutablePath: 'C:\\Games\\B\\b.exe' });
    expect(parseProcessList(json)).toEqual([{ pid: 42, exePath: 'C:\\Games\\B\\b.exe' }]);
  });

  it('returns an empty list for empty or invalid output', () => {
    expect(parseProcessList('')).toEqual([]);
    expect(parseProcessList('not json')).toEqual([]);
  });
});

describe('findProcessByInstallDir (A7)', () => {
  const processes = [
    { pid: 1, exePath: 'C:\\Windows\\explorer.exe' },
    { pid: 2, exePath: 'C:\\Games\\Foo2\\other.exe' },
    { pid: 3, exePath: 'C:\\Games\\Foo\\overlay.exe' },
    { pid: 4, exePath: 'C:\\Games\\Foo\\bin\\game.exe' },
  ];

  it('finds a process running from inside the install directory', () => {
    expect(findProcessByInstallDir(processes, 'C:\\Games\\Foo')).toBe(4);
  });

  it('does not match a sibling directory that shares a prefix', () => {
    expect(findProcessByInstallDir([{ pid: 2, exePath: 'C:\\Games\\Foo2\\other.exe' }], 'C:\\Games\\Foo')).toBeUndefined();
  });

  it('ignores helper and overlay executables', () => {
    expect(findProcessByInstallDir([{ pid: 3, exePath: 'C:\\Games\\Foo\\overlay.exe' }], 'C:\\Games\\Foo')).toBeUndefined();
  });

  it('treats forward and back slashes, and case, as equal', () => {
    expect(findProcessByInstallDir([{ pid: 9, exePath: 'c:/games/foo/game.exe' }], 'C:\\Games\\Foo\\')).toBe(9);
  });

  it('returns undefined for an empty install directory', () => {
    expect(findProcessByInstallDir(processes, '')).toBeUndefined();
  });
});
