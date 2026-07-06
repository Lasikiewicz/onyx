import { useEffect, useRef } from 'react';
import type { Game } from '../types/game';
import type { RightClickMenuEditorSection } from '../components/rightClickMenu/RightClickMenuHeader';

type ViewMode = 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card';
type ControllerFocusMode = 'games' | 'actions' | 'top';
type ControllerAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'primary'
  | 'back'
  | 'context'
  | 'share'
  | 'options';

interface UseControllerNavigationOptions {
  activeGameId: string | null;
  displayGames: Game[];
  enabled: boolean;
  gamepadButtonLayout: 'xbox' | 'playstation';
  gamepadNavigationSpeed: number;
  isGameContextMenuOpen: boolean;
  isShellContextMenuOpen: boolean;
  onCloseGameContextMenu: () => void;
  onCloseShellContextMenu: () => void;
  onGameContextMenu: (game: Game, x: number, y: number) => void;
  onGameSelect: (game: Game) => void;
  onShellContextMenu: (x: number, y: number, initialEditorSection?: RightClickMenuEditorSection | null) => void;
  onStatus?: (message: string, type?: 'success' | 'error') => void;
  overlaysOpen: boolean;
  viewMode: ViewMode;
}

const AXIS_DEADZONE = 0.55;
const BUTTON_PRESS_THRESHOLD = 0.5;
const DEFAULT_REPEAT_DELAY_MS = 180;

declare global {
  interface Window {
    __onyxControllerDebug?: {
      apiAvailable: boolean;
      enabled: boolean;
      lastActions: ControllerAction[];
      lastGamepadId: string | null;
      lastGamepadIndex: number | null;
      lastMapping: string | null;
      lastRoutedAction: ControllerAction | null;
      lastUpdatedAt: number;
      mode: ControllerFocusMode;
      overlaysOpen: boolean;
      pressedButtons: number[];
      sampledAxes: number[];
      viewMode: ViewMode;
    };
  }
}

function clampRepeatDelay(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_REPEAT_DELAY_MS;
  return Math.max(100, Math.min(650, Number(value)));
}

function getElementCenter(element: Element | null, fallback: { x: number; y: number }) {
  if (!element) return fallback;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return fallback;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function findGameCard(gameId: string | null) {
  if (!gameId) return null;
  return Array.from(document.querySelectorAll<HTMLElement>('[data-controller-game-card]'))
    .find((element) => element.dataset.controllerGameCard === gameId) ?? null;
}

function getAxisDirection(axes: readonly number[], negativeIndex: number, positiveIndex: number) {
  return {
    negative: (axes[negativeIndex] ?? 0) < -AXIS_DEADZONE,
    positive: (axes[positiveIndex] ?? 0) > AXIS_DEADZONE,
  };
}

function getHatAxisDirections(axisValue: number | undefined) {
  const directions = new Set<ControllerAction>();
  if (typeof axisValue !== 'number' || !Number.isFinite(axisValue)) {
    return directions;
  }

  const rounded = Math.round(axisValue * 1000) / 1000;
  if (rounded > 0.85) {
    directions.add('left');
  } else if (rounded > 0.55) {
    directions.add('left');
    directions.add('down');
  } else if (rounded > 0.28) {
    directions.add('down');
  } else if (rounded > 0.02) {
    directions.add('down');
    directions.add('right');
  } else if (rounded > -0.28) {
    directions.add('right');
  } else if (rounded > -0.55) {
    directions.add('right');
    directions.add('up');
  } else if (rounded > -0.85) {
    directions.add('up');
  }

  return directions;
}

function getPressedButtonIndexes(gamepad: Gamepad) {
  return gamepad.buttons
    .map((button, index) => (button.pressed || button.value > BUTTON_PRESS_THRESHOLD ? index : -1))
    .filter((index) => index >= 0);
}

function getControllerActions(gamepad: Gamepad): Set<ControllerAction> {
  const actions = new Set<ControllerAction>();
  const buttonPressed = (index: number) => {
    const button = gamepad.buttons[index];
    return button?.pressed === true || (button?.value ?? 0) > BUTTON_PRESS_THRESHOLD;
  };
  const leftStickX = getAxisDirection(gamepad.axes, 0, 0);
  const leftStickY = getAxisDirection(gamepad.axes, 1, 1);
  const alternateStickX = gamepad.mapping === 'standard' ? { negative: false, positive: false } : getAxisDirection(gamepad.axes, 2, 2);
  const alternateStickY = gamepad.mapping === 'standard' ? { negative: false, positive: false } : getAxisDirection(gamepad.axes, 3, 3);
  const dpadAxisX = getAxisDirection(gamepad.axes, 6, 6);
  const dpadAxisY = getAxisDirection(gamepad.axes, 7, 7);
  const hatDirections = getHatAxisDirections(gamepad.axes[9]);

  if (buttonPressed(14) || leftStickX.negative || alternateStickX.negative || dpadAxisX.negative || hatDirections.has('left')) actions.add('left');
  if (buttonPressed(15) || leftStickX.positive || alternateStickX.positive || dpadAxisX.positive || hatDirections.has('right')) actions.add('right');
  if (buttonPressed(12) || leftStickY.negative || alternateStickY.negative || dpadAxisY.negative || hatDirections.has('up')) actions.add('up');
  if (buttonPressed(13) || leftStickY.positive || alternateStickY.positive || dpadAxisY.positive || hatDirections.has('down')) actions.add('down');
  if (buttonPressed(0)) actions.add('primary');
  if (buttonPressed(1)) actions.add('back');
  if (buttonPressed(2)) actions.add('context');
  if (buttonPressed(8)) actions.add('share');
  if (buttonPressed(9)) actions.add('options');

  return actions;
}

function getActionButtons() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-controller-action]'))
    .filter((element) => !element.disabled);
}

function getTopControls() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-controller-top-control]'));
}

function focusElement(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

function getGridColumnCount() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-controller-game-card]'));
  if (cards.length < 2) return 1;
  const firstTop = Math.round(cards[0].getBoundingClientRect().top);
  const firstRowCount = cards.findIndex((card, index) => index > 0 && Math.round(card.getBoundingClientRect().top) !== firstTop);
  return firstRowCount > 0 ? firstRowCount : cards.length;
}

export function useControllerNavigation({
  activeGameId,
  displayGames,
  enabled,
  gamepadButtonLayout,
  gamepadNavigationSpeed,
  isGameContextMenuOpen,
  isShellContextMenuOpen,
  onCloseGameContextMenu,
  onCloseShellContextMenu,
  onGameContextMenu,
  onGameSelect,
  onShellContextMenu,
  onStatus,
  overlaysOpen,
  viewMode,
}: UseControllerNavigationOptions) {
  const modeRef = useRef<ControllerFocusMode>('games');
  const activeGameIdRef = useRef(activeGameId);
  const gamesRef = useRef(displayGames);
  const pressedRef = useRef(new Set<ControllerAction>());
  const repeatedAtRef = useRef(new Map<ControllerAction, number>());
  const actionIndexRef = useRef(0);
  const topIndexRef = useRef(0);
  const apiUnavailableReportedRef = useRef(false);
  const connectedGamepadKeyRef = useRef<string | null>(null);
  const inputDetectedRef = useRef(false);
  const lastRoutedActionRef = useRef<ControllerAction | null>(null);

  useEffect(() => {
    activeGameIdRef.current = activeGameId;
  }, [activeGameId]);

  useEffect(() => {
    gamesRef.current = displayGames;
  }, [displayGames]);

  useEffect(() => {
    window.__onyxControllerDebug = {
      apiAvailable: typeof navigator.getGamepads === 'function',
      enabled,
      lastActions: [],
      lastGamepadId: null,
      lastGamepadIndex: null,
      lastMapping: null,
      lastRoutedAction: lastRoutedActionRef.current,
      lastUpdatedAt: Date.now(),
      mode: modeRef.current,
      overlaysOpen,
      pressedButtons: [],
      sampledAxes: [],
      viewMode,
    };
  }, [enabled, overlaysOpen, viewMode]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleConnected = (event: Event) => {
      const gamepad = (event as GamepadEvent).gamepad;
      if (gamepad) {
        connectedGamepadKeyRef.current = `${gamepad.index}:${gamepad.id}`;
      }
      const label = gamepadButtonLayout === 'playstation' ? 'Controller' : 'Gamepad';
      onStatus?.(`${label} connected: ${gamepad?.id || 'unknown device'}`);
    };

    const handleDisconnected = (event: Event) => {
      const gamepad = (event as GamepadEvent).gamepad;
      connectedGamepadKeyRef.current = null;
      onStatus?.(`Controller disconnected: ${gamepad?.id || 'unknown device'}`, 'error');
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, [enabled, gamepadButtonLayout, onStatus]);

  useEffect(() => {
    if (!enabled || viewMode === 'carousel' || viewMode === 'coverflow') {
      return;
    }

    let frameId = 0;
    const repeatDelay = clampRepeatDelay(gamepadNavigationSpeed);

    const selectGameAt = (index: number) => {
      const games = gamesRef.current;
      if (games.length === 0) return;
      const wrappedIndex = (index + games.length) % games.length;
      const game = games[wrappedIndex];
      onGameSelect(game);
      activeGameIdRef.current = game.id;
      focusElement(findGameCard(game.id));
    };

    const getSelectedIndex = () => {
      const games = gamesRef.current;
      const currentIndex = games.findIndex((game) => game.id === activeGameIdRef.current);
      return currentIndex >= 0 ? currentIndex : 0;
    };

    const moveGameSelection = (delta: number) => {
      const games = gamesRef.current;
      if (games.length === 0) return;
      selectGameAt(getSelectedIndex() + delta);
    };

    const enterActionMode = () => {
      modeRef.current = 'actions';
      const buttons = getActionButtons();
      const playIndex = Math.max(0, buttons.findIndex((button) => button.dataset.controllerAction === 'play'));
      actionIndexRef.current = playIndex;
      focusElement(buttons[playIndex] ?? null);
    };

    const focusTopControl = (preferred = 'search') => {
      const controls = getTopControls();
      if (controls.length === 0) return;
      const preferredIndex = controls.findIndex((control) => control.dataset.controllerTopControl === preferred);
      topIndexRef.current = preferredIndex >= 0 ? preferredIndex : 0;
      modeRef.current = 'top';
      focusElement(controls[topIndexRef.current] ?? null);
    };

    const moveActionFocus = (delta: number) => {
      const buttons = getActionButtons();
      if (buttons.length === 0) return;
      actionIndexRef.current = (actionIndexRef.current + delta + buttons.length) % buttons.length;
      focusElement(buttons[actionIndexRef.current] ?? null);
    };

    const moveTopFocus = (delta: number) => {
      const controls = getTopControls();
      if (controls.length === 0) return;
      topIndexRef.current = (topIndexRef.current + delta + controls.length) % controls.length;
      focusElement(controls[topIndexRef.current] ?? null);
    };

    const openSelectedGameContextMenu = () => {
      const game = gamesRef.current.find((entry) => entry.id === activeGameIdRef.current) ?? gamesRef.current[0];
      if (!game) return;
      const center = getElementCenter(findGameCard(game.id), { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      onGameContextMenu(game, center.x, center.y);
    };

    const openShellContextMenu = () => {
      const gridContainer = document.querySelector('[data-controller-library-surface]');
      const center = getElementCenter(gridContainer, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      onShellContextMenu(center.x, center.y, 'games-view');
    };

    const toggleAppMenu = () => {
      const trigger = document.querySelector<HTMLButtonElement>('[data-controller-menu-trigger]');
      trigger?.click();
      trigger?.focus({ preventScroll: true });
    };

    const handleAction = (action: ControllerAction) => {
      lastRoutedActionRef.current = action;

      if (action === 'back') {
        if (isGameContextMenuOpen) {
          onCloseGameContextMenu();
          modeRef.current = 'games';
          return;
        }
        if (isShellContextMenuOpen) {
          onCloseShellContextMenu();
          modeRef.current = 'games';
          return;
        }
        const appMenu = document.querySelector('[data-controller-app-menu="open"]');
        if (appMenu) {
          toggleAppMenu();
          modeRef.current = 'games';
          return;
        }
      }

      if (action === 'options') {
        toggleAppMenu();
        return;
      }

      if (overlaysOpen && !isGameContextMenuOpen && !isShellContextMenuOpen) {
        return;
      }

      if (modeRef.current === 'actions') {
        if (action === 'left') moveActionFocus(-1);
        else if (action === 'right') moveActionFocus(1);
        else if (action === 'primary') getActionButtons()[actionIndexRef.current]?.click();
        else if (action === 'back') {
          modeRef.current = 'games';
          focusElement(findGameCard(activeGameIdRef.current));
        }
        return;
      }

      if (modeRef.current === 'top') {
        if (action === 'left') moveTopFocus(-1);
        else if (action === 'right') moveTopFocus(1);
        else if (action === 'primary') getTopControls()[topIndexRef.current]?.click();
        else if (action === 'share') focusTopControl('search');
        else if (action === 'back') {
          modeRef.current = 'games';
          focusElement(findGameCard(activeGameIdRef.current));
        }
        return;
      }

      if (action === 'left') moveGameSelection(-1);
      else if (action === 'right') moveGameSelection(1);
      else if (action === 'up') moveGameSelection(viewMode === 'list' ? -1 : -getGridColumnCount());
      else if (action === 'down') moveGameSelection(viewMode === 'list' ? 1 : getGridColumnCount());
      else if (action === 'primary') enterActionMode();
      else if (action === 'context') openSelectedGameContextMenu();
      else if (action === 'back') openShellContextMenu();
      else if (action === 'share') focusTopControl('search');
    };

    const loop = (time: number) => {
      if (typeof navigator.getGamepads !== 'function') {
        if (!apiUnavailableReportedRef.current) {
          apiUnavailableReportedRef.current = true;
          onStatus?.('Controller API is unavailable in this app window.', 'error');
        }
        frameId = window.requestAnimationFrame(loop);
        return;
      }

      const gamepads = Array.from(navigator.getGamepads?.() ?? []);
      const gamepad = gamepads.find((pad): pad is Gamepad => !!pad && pad.connected);
      if (gamepad) {
        const gamepadKey = `${gamepad.index}:${gamepad.id}`;
        if (connectedGamepadKeyRef.current !== gamepadKey) {
          connectedGamepadKeyRef.current = gamepadKey;
          onStatus?.(`Controller ready: ${gamepad.id || 'unknown device'}`);
        }

        const actions = getControllerActions(gamepad);
        window.__onyxControllerDebug = {
          apiAvailable: true,
          enabled,
          lastActions: Array.from(actions),
          lastGamepadId: gamepad.id,
          lastGamepadIndex: gamepad.index,
          lastMapping: gamepad.mapping,
          lastRoutedAction: lastRoutedActionRef.current,
          lastUpdatedAt: Date.now(),
          mode: modeRef.current,
          overlaysOpen,
          pressedButtons: getPressedButtonIndexes(gamepad),
          sampledAxes: Array.from(gamepad.axes),
          viewMode,
        };

        if (actions.size > 0 && !inputDetectedRef.current) {
          inputDetectedRef.current = true;
          onStatus?.(`Controller input detected: ${Array.from(actions).join(', ')}`);
        }

        for (const action of actions) {
          const isHeld = pressedRef.current.has(action);
          const repeatable = action === 'left' || action === 'right' || action === 'up' || action === 'down';
          const lastRepeatedAt = repeatedAtRef.current.get(action) ?? 0;
          if (!isHeld || (repeatable && time - lastRepeatedAt >= repeatDelay)) {
            handleAction(action);
            repeatedAtRef.current.set(action, time);
          }
        }
        pressedRef.current = actions;
      } else {
        window.__onyxControllerDebug = {
          apiAvailable: true,
          enabled,
          lastActions: [],
          lastGamepadId: null,
          lastGamepadIndex: null,
          lastMapping: null,
          lastRoutedAction: lastRoutedActionRef.current,
          lastUpdatedAt: Date.now(),
          mode: modeRef.current,
          overlaysOpen,
          pressedButtons: [],
          sampledAxes: [],
          viewMode,
        };
        pressedRef.current.clear();
      }

      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameId);
      pressedRef.current.clear();
      repeatedAtRef.current.clear();
    };
  }, [
    enabled,
    gamepadNavigationSpeed,
    isGameContextMenuOpen,
    isShellContextMenuOpen,
    onCloseGameContextMenu,
    onCloseShellContextMenu,
    onGameContextMenu,
    onGameSelect,
    onShellContextMenu,
    onStatus,
    overlaysOpen,
    viewMode,
  ]);
}
