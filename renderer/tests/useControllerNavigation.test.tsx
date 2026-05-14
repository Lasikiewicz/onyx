import React, { useState } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useControllerNavigation } from '../src/hooks/useControllerNavigation';
import type { Game } from '../src/types/game';

const games: Game[] = [
  { id: 'game-1', title: 'First', platform: 'steam', exePath: 'first.exe', boxArtUrl: '', bannerUrl: '' },
  { id: 'game-2', title: 'Second', platform: 'steam', exePath: 'second.exe', boxArtUrl: '', bannerUrl: '' },
  { id: 'game-3', title: 'Third', platform: 'steam', exePath: 'third.exe', boxArtUrl: '', bannerUrl: '' },
];

const buttonIndexByAction = {
  primary: 0,
  back: 1,
  context: 2,
  share: 8,
  options: 9,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
} as const;

type ButtonAction = keyof typeof buttonIndexByAction;

function createGamepad(
  pressedActions: ButtonAction[] = [],
  axes: number[] = [0, 0],
  options: { mapping?: GamepadMappingType; valuedActions?: ButtonAction[] } = {},
) {
  const pressed = new Set(pressedActions.map((action) => buttonIndexByAction[action]));
  const valued = new Set((options.valuedActions ?? []).map((action) => buttonIndexByAction[action]));
  return {
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressed.has(index),
      touched: pressed.has(index) || valued.has(index),
      value: pressed.has(index) || valued.has(index) ? 1 : 0,
    })),
    connected: true,
    id: 'DualSense Wireless Controller',
    index: 0,
    mapping: options.mapping ?? 'standard',
    timestamp: 1,
  } as unknown as Gamepad;
}

interface HarnessProps {
  gameContextMenuOpen?: boolean;
  shellContextMenuOpen?: boolean;
  onCloseGameContextMenu?: () => void;
  onCloseShellContextMenu?: () => void;
  onGameContextMenu?: (game: Game, x: number, y: number) => void;
  onShellContextMenu?: (x: number, y: number) => void;
  onStatus?: (message: string, type?: 'success' | 'error') => void;
}

function Harness({
  gameContextMenuOpen = false,
  shellContextMenuOpen = false,
  onCloseGameContextMenu = () => {},
  onCloseShellContextMenu = () => {},
  onGameContextMenu = () => {},
  onShellContextMenu = () => {},
  onStatus,
}: HarnessProps) {
  const [activeGameId, setActiveGameId] = useState('game-1');

  useControllerNavigation({
    activeGameId,
    displayGames: games,
    enabled: true,
    gamepadButtonLayout: 'playstation',
    gamepadNavigationSpeed: 120,
    isGameContextMenuOpen: gameContextMenuOpen,
    isShellContextMenuOpen: shellContextMenuOpen,
    onCloseGameContextMenu,
    onCloseShellContextMenu,
    onGameContextMenu,
    onGameSelect: (game) => setActiveGameId(game.id),
    onShellContextMenu,
    onStatus,
    overlaysOpen: gameContextMenuOpen || shellContextMenuOpen,
    viewMode: 'grid',
  });

  return (
    <div>
      <div data-controller-library-surface>
        {games.map((game) => (
          <button key={game.id} data-controller-game-card={game.id}>
            {game.title}
          </button>
        ))}
      </div>
      <button data-controller-action="favorite">Favorite</button>
      <button data-controller-action="edit">Edit</button>
      <button data-controller-action="play">Play</button>
      <input data-controller-top-control="search" aria-label="Search library" />
      <button data-controller-top-control="sort">Sort by</button>
      <button data-controller-top-control="launcher">Launcher</button>
      <button data-controller-top-control="categories">Categories</button>
      <button data-controller-menu-trigger onClick={() => {}}>Menu</button>
    </div>
  );
}

describe('useControllerNavigation', () => {
  let frameCallback: FrameRequestCallback | null = null;
  let currentGamepad: Gamepad | null = null;

  const step = (time: number) => {
    const callback = frameCallback;
    frameCallback = null;
    if (callback) {
      act(() => callback(time));
    }
  };

  const press = (actions: ButtonAction[], time: number) => {
    currentGamepad = createGamepad(actions);
    step(time);
  };

  const release = (time: number) => {
    currentGamepad = createGamepad([]);
    step(time);
  };

  beforeEach(() => {
    currentGamepad = createGamepad([]);
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: vi.fn(() => [currentGamepad] as Gamepad[]),
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('moves selected games with the d-pad and stick', () => {
    render(<Harness />);

    press(['right'], 16);
    expect(document.activeElement).toHaveAttribute('data-controller-game-card', 'game-2');

    release(32);
    currentGamepad = createGamepad([], [-1, 0]);
    step(160);
    expect(document.activeElement).toHaveAttribute('data-controller-game-card', 'game-1');
  });

  it('also reads d-pad axes from non-standard controller mappings', () => {
    render(<Harness />);

    currentGamepad = createGamepad([], [0, 0, 0, 0, 0, 0, 1, 0]);
    step(16);
    expect(document.activeElement).toHaveAttribute('data-controller-game-card', 'game-2');

    release(32);
    currentGamepad = createGamepad([], [0, 0, 0, 0, 0, 0, -1, 0]);
    step(180);
    expect(document.activeElement).toHaveAttribute('data-controller-game-card', 'game-1');
  });

  it('treats analog button values as pressed buttons', () => {
    render(<Harness />);

    currentGamepad = createGamepad([], [0, 0], { valuedActions: ['right'] });
    step(16);

    expect(document.activeElement).toHaveAttribute('data-controller-game-card', 'game-2');
    expect(window.__onyxControllerDebug?.pressedButtons).toEqual([15]);
  });

  it('supports common non-standard hat axis direction values', () => {
    render(<Harness />);

    currentGamepad = createGamepad([], [0, 0, 0, 0, 0, 0, 0, 0, 0, -0.143], { mapping: '' });
    step(16);
    expect(document.activeElement).toHaveAttribute('data-controller-game-card', 'game-2');

    release(32);
    currentGamepad = createGamepad([], [0, 0, 0, 0, 0, 0, 0, 0, 0, 1], { mapping: '' });
    step(180);
    expect(document.activeElement).toHaveAttribute('data-controller-game-card', 'game-1');
  });

  it('uses Cross to enter the action row and Circle to return to game selection', () => {
    render(<Harness />);

    press(['primary'], 16);
    expect(document.activeElement).toHaveAttribute('data-controller-action', 'play');

    release(32);
    press(['left'], 180);
    expect(document.activeElement).toHaveAttribute('data-controller-action', 'edit');

    release(200);
    press(['back'], 240);
    expect(document.activeElement).toHaveAttribute('data-controller-game-card', 'game-1');
  });

  it('opens selected game and view context menus from grid mode', () => {
    const onGameContextMenu = vi.fn();
    const onShellContextMenu = vi.fn();
    render(<Harness onGameContextMenu={onGameContextMenu} onShellContextMenu={onShellContextMenu} />);

    press(['context'], 16);
    expect(onGameContextMenu).toHaveBeenCalledWith(games[0], expect.any(Number), expect.any(Number));

    release(32);
    press(['back'], 64);
    expect(onShellContextMenu).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'games-view');
  });

  it('focuses top search with Share and opens the menu with Options', () => {
    render(<Harness />);
    const menuTrigger = document.querySelector<HTMLButtonElement>('[data-controller-menu-trigger]');
    const clickSpy = vi.spyOn(menuTrigger!, 'click');

    press(['share'], 16);
    expect(document.activeElement).toHaveAttribute('data-controller-top-control', 'search');

    release(32);
    press(['right'], 180);
    expect(document.activeElement).toHaveAttribute('data-controller-top-control', 'sort');

    release(200);
    press(['options'], 240);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('uses Circle to close controller-opened context menus', () => {
    const onCloseShellContextMenu = vi.fn();
    render(<Harness shellContextMenuOpen={true} onCloseShellContextMenu={onCloseShellContextMenu} />);

    press(['back'], 16);
    expect(onCloseShellContextMenu).toHaveBeenCalled();
  });

  it('reports controller readiness and stores debug state while polling', () => {
    const onStatus = vi.fn();
    render(<Harness onStatus={onStatus} />);

    step(16);

    expect(onStatus).toHaveBeenCalledWith('Controller ready: DualSense Wireless Controller');
    expect(window.__onyxControllerDebug).toMatchObject({
      apiAvailable: true,
      enabled: true,
      lastGamepadId: 'DualSense Wireless Controller',
      lastMapping: 'standard',
    });
  });
});
