
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LauncherService } from './LauncherService';
import { GameStore } from './GameStore';

// Mock electron
vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn(),
  },
}));

// Mock child_process
const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: spawnMock.mockImplementation(() => ({
    unref: vi.fn(),
    on: vi.fn(),
    pid: 12345,
  })),
}));

// Mock GameStore
const gameStoreMock = {
  getLibrary: vi.fn(),
  saveGame: vi.fn(),
} as unknown as GameStore;

describe('LauncherService Security Test', () => {
  let launcherService: LauncherService;

  beforeEach(() => {
    vi.clearAllMocks();
    launcherService = new LauncherService(gameStoreMock);
  });

  it('should prevent command injection by not using shell: true', async () => {
    const gameId = 'custom-game-1';
    const maliciousGame = {
      id: gameId,
      title: 'Malicious Game',
      exePath: 'echo',
      launchArgs: '; touch exploited',
      platform: 'other',
    };

    (gameStoreMock.getLibrary as any).mockResolvedValue([maliciousGame]);

    await launcherService.launchGame(gameId);

    expect(spawnMock).toHaveBeenCalled();
    const callArgs = spawnMock.mock.calls[0];
    const options = callArgs[2];

    // Verify shell is NOT true (FIXED)
    expect(options.shell).toBeUndefined();

    // Verify arguments passed
    const command = callArgs[0];
    const args = callArgs[1];

    // Command should be raw, not quoted
    expect(command).toBe('echo');

    // Arguments are parsed from launchArgs
    expect(args).toEqual([';', 'touch', 'exploited']);

    console.log('Security fix confirmed: shell: true is removed');
  });

  it('should handle quoted exePath by stripping quotes', async () => {
    const gameId = 'custom-game-2';
    const quotedGame = {
      id: gameId,
      title: 'Quoted Path Game',
      exePath: '"/path/to/game.exe"',
      launchArgs: '',
      platform: 'other',
    };

    (gameStoreMock.getLibrary as any).mockResolvedValue([quotedGame]);

    await launcherService.launchGame(gameId);

    expect(spawnMock).toHaveBeenCalled();
    const callArgs = spawnMock.mock.calls[0];
    const command = callArgs[0];

    // Verify quotes are stripped
    expect(command).toBe('/path/to/game.exe');
  });
});
