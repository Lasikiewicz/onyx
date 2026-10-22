import { guideEdge } from './xinputGuide';

interface XInputGamepad {
  wButtons: number;
  bLeftTrigger: number;
  bRightTrigger: number;
  sThumbLX: number;
  sThumbLY: number;
  sThumbRX: number;
  sThumbRY: number;
}

interface XInputState {
  dwPacketNumber: number;
  Gamepad: XInputGamepad;
}

interface KoffiModule {
  struct(name: string, fields: Record<string, unknown>): unknown;
  pointer(type: unknown): unknown;
  out(type: unknown): unknown;
  load(file: string): {
    func(
      convention: string,
      name: number,
      result: string,
      args: unknown[],
    ): (index: number, state: XInputState) => number;
  };
}

const ERROR_SUCCESS = 0;

function emptyState(): XInputState {
  return {
    dwPacketNumber: 0,
    Gamepad: {
      wButtons: 0,
      bLeftTrigger: 0,
      bRightTrigger: 0,
      sThumbLX: 0,
      sThumbLY: 0,
      sThumbRX: 0,
      sThumbRY: 0,
    },
  };
}

let cachedRead: ((index: number) => number | null) | undefined;

/**
 * Loads XInputGetStateEx (xinput1_4.dll ordinal 100). Koffi accepts that ordinal as the
 * number 100. A prototype string such as "#100" throws "Unexpected token '#'" and the
 * Guide watch never starts. The public XInputGetState export does not report Guide.
 */
export function loadXInputGuideReader(): (index: number) => number | null {
  if (cachedRead) return cachedRead;
  const koffi = require('koffi') as KoffiModule;
  const gamepad = koffi.struct('ONYX_XINPUT_GAMEPAD', {
    wButtons: 'uint16',
    bLeftTrigger: 'uint8',
    bRightTrigger: 'uint8',
    sThumbLX: 'int16',
    sThumbLY: 'int16',
    sThumbRX: 'int16',
    sThumbRY: 'int16',
  });
  const stateType = koffi.struct('ONYX_XINPUT_STATE', {
    dwPacketNumber: 'uint32',
    Gamepad: gamepad,
  });
  if (stateType == null) {
    throw new Error('XInput state type failed to register');
  }
  const xinput = koffi.load('xinput1_4.dll');
  const getStateEx = xinput.func('__stdcall', 100, 'uint32', [
    'uint32',
    koffi.out(koffi.pointer(stateType)),
  ]);
  cachedRead = (index: number) => {
    const state = emptyState();
    const code = getStateEx(index, state);
    if (code !== ERROR_SUCCESS) return null;
    return state.Gamepad?.wButtons ?? 0;
  };
  return cachedRead;
}

/**
 * Poll Xbox controllers for the Guide button while Onyx is not the focused window.
 * The browser Gamepad API does not deliver input in that case. Returns null when
 * XInput cannot be loaded; the keyboard shortcut still works.
 */
export function startXInputGuideWatch(onGuide: () => void): { stop: () => void } | null {
  if (process.platform !== 'win32') return null;
  let read: (index: number) => number | null;
  try {
    read = loadXInputGuideReader();
  } catch (error) {
    console.warn('[Gamepad] Xbox Guide button is unavailable:', error);
    return null;
  }
  const previous = [false, false, false, false];
  const timer = setInterval(() => {
    for (let index = 0; index < previous.length; index += 1) {
      let buttons: number | null = null;
      try {
        buttons = read(index);
      } catch (error) {
        console.warn('[Gamepad] XInput poll failed:', error);
        buttons = null;
      }
      if (buttons == null) {
        previous[index] = false;
        continue;
      }
      const edge = guideEdge(previous[index], buttons);
      previous[index] = edge.down;
      if (edge.pressed) onGuide();
    }
  }, 200);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}
