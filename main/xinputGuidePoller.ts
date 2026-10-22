import { guideEdge } from './xinputGuide';

interface XInputState {
  dwPacketNumber: number;
  Gamepad: { wButtons: number };
}

interface KoffiModule {
  struct(name: string, fields: Record<string, unknown>): unknown;
  load(file: string): { func(definition: string): (index: number, state: XInputState) => number };
}

const ERROR_SUCCESS = 0;

function createReader(): ((index: number) => number | null) {
  // Loaded only on Windows, and only when the wake setting is on. Tests never import this function.
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
  // Ordinal 100 is XInputGetStateEx. The public XInputGetState export does not report Guide.
  const getStateEx = xinput.func('uint32 __stdcall #100(uint32 dwUserIndex, _Out_ ONYX_XINPUT_STATE *pState)');
  return (index: number) => {
    const state: XInputState = {
      dwPacketNumber: 0,
      Gamepad: { wButtons: 0 },
    };
    const code = getStateEx(index, state);
    if (code !== ERROR_SUCCESS) return null;
    return state.Gamepad?.wButtons ?? 0;
  };
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
    read = createReader();
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
