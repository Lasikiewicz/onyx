import { useState, useEffect, useCallback, useRef } from 'react';

interface GamepadState {
  connected: Gamepad[];
  enabled: boolean;
  navigationSpeed: number;
  buttonLayout: 'xbox' | 'playstation';
}

interface UseGamepadReturn {
  gamepads: Gamepad[];
  enabled: boolean;
  navigationSpeed: number;
  buttonLayout: 'xbox' | 'playstation';
  setEnabled: (enabled: boolean) => Promise<void>;
  setNavigationSpeed: (speed: number) => Promise<void>;
  setButtonLayout: (layout: 'xbox' | 'playstation') => Promise<void>;
}

// Button mappings (standard gamepad mapping)
enum GamepadButton {
  A = 0,           // Cross on PlayStation
  B = 1,           // Circle on PlayStation
  X = 2,           // Square on PlayStation
  Y = 3,           // Triangle on PlayStation
  LB = 4,          // L1 on PlayStation
  RB = 5,          // R1 on PlayStation
  LT = 6,          // L2 on PlayStation
  RT = 7,          // R2 on PlayStation
  Back = 8,        // Select/Share on PlayStation
  Start = 9,       // Options on PlayStation
  LS = 10,         // L3 on PlayStation
  RS = 11,         // R3 on PlayStation
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
  Guide = 16,      // PS button on PlayStation
}

// Deadzone for analog sticks
const DEADZONE = 0.2;

/**
 * Hook for managing gamepad/controller input
 * Polls connected gamepads and simulates keyboard events for navigation
 */
export function useGamepad(): UseGamepadReturn {
  const [state, setState] = useState<GamepadState>({
    connected: [],
    enabled: true,
    navigationSpeed: 1.0,
    buttonLayout: 'xbox',
  });

  const lastButtonStates = useRef<Map<number, boolean[]>>(new Map());
  const lastAxisValues = useRef<Map<number, number[]>>(new Map());
  const buttonRepeatTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load gamepad preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await window.electronAPI.gamepad.getPreferences();
        setState(prev => ({
          ...prev,
          enabled: prefs.enabled,
          navigationSpeed: prefs.navigationSpeed,
          buttonLayout: prefs.buttonLayout,
        }));
      } catch (error) {
        console.error('Error loading gamepad preferences:', error);
      }
    };

    loadPreferences();

    // Listen for preference changes (triggered when settings are saved)
    const handlePreferencesChanged = () => {
      loadPreferences();
    };

    window.addEventListener('gamepad-preferences-changed', handlePreferencesChanged);

    return () => {
      window.removeEventListener('gamepad-preferences-changed', handlePreferencesChanged);
    };
  }, []);

  // Simulate keyboard event
  const simulateKey = useCallback((key: string) => {
    const event = new KeyboardEvent('keydown', {
      key,
      code: key,
      keyCode: key === 'Enter' ? 13 : key === 'Escape' ? 27 : 0,
      bubbles: true,
      cancelable: true,
    });
    document.activeElement?.dispatchEvent(event) || document.dispatchEvent(event);
  }, []);

  // Handle button press
  const handleButtonPress = useCallback((_gamepadIndex: number, buttonIndex: number) => {
    switch (buttonIndex) {
      case GamepadButton.A:
        simulateKey('Enter');
        break;
      case GamepadButton.B:
        simulateKey('Escape');
        break;
      case GamepadButton.DPadUp:
        simulateKey('ArrowUp');
        break;
      case GamepadButton.DPadDown:
        simulateKey('ArrowDown');
        break;
      case GamepadButton.DPadLeft:
        simulateKey('ArrowLeft');
        break;
      case GamepadButton.DPadRight:
        simulateKey('ArrowRight');
        break;
      case GamepadButton.LB:
        simulateKey('PageUp');
        break;
      case GamepadButton.RB:
        simulateKey('PageDown');
        break;
      // Guide button could be used for special actions
      // Back/Start could be used for menu toggles
      default:
        break;
    }
  }, [simulateKey]);

  // Handle analog stick movement
  const handleAxisMovement = useCallback((_gamepadIndex: number, leftX: number, leftY: number, _rightX: number, _rightY: number) => {
    // Left stick or D-pad - primary navigation
    if (Math.abs(leftX) > DEADZONE) {
      if (leftX > DEADZONE) {
        simulateKey('ArrowRight');
      } else if (leftX < -DEADZONE) {
        simulateKey('ArrowLeft');
      }
    }

    if (Math.abs(leftY) > DEADZONE) {
      if (leftY > DEADZONE) {
        simulateKey('ArrowDown');
      } else if (leftY < -DEADZONE) {
        simulateKey('ArrowUp');
      }
    }
  }, [simulateKey]);

  // Poll gamepads
  useEffect(() => {
    if (!state.enabled) {
      return;
    }

    let animationFrameId: number;

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads();
      const connected: Gamepad[] = [];

      gamepads.forEach((gamepad, index) => {
        if (!gamepad) return;
        
        connected.push(gamepad);

        // Check buttons
        const previousButtons = lastButtonStates.current.get(index) || [];
        const currentButtons = gamepad.buttons.map(b => b.pressed);

        gamepad.buttons.forEach((button, buttonIndex) => {
          const wasPressed = previousButtons[buttonIndex] || false;
          const isPressed = button.pressed;

          // Button just pressed
          if (isPressed && !wasPressed) {
            handleButtonPress(index, buttonIndex);

            // Setup repeat timer for navigation buttons
            if ([GamepadButton.DPadUp, GamepadButton.DPadDown, GamepadButton.DPadLeft, GamepadButton.DPadRight].includes(buttonIndex)) {
              const repeatKey = `${index}-${buttonIndex}`;
              const repeatTimer = setInterval(() => {
                handleButtonPress(index, buttonIndex);
              }, 150 / state.navigationSpeed); // Repeat rate adjusted by navigation speed
              buttonRepeatTimers.current.set(repeatKey, repeatTimer);
            }
          }

          // Button released
          if (!isPressed && wasPressed) {
            const repeatKey = `${index}-${buttonIndex}`;
            const timer = buttonRepeatTimers.current.get(repeatKey);
            if (timer) {
              clearInterval(timer);
              buttonRepeatTimers.current.delete(repeatKey);
            }
          }
        });

        lastButtonStates.current.set(index, currentButtons);

        // Check analog sticks (with threshold to prevent excessive events)
        const previousAxes = lastAxisValues.current.get(index) || [0, 0, 0, 0];
        const currentAxes = gamepad.axes.slice(0, 4);

        // Only process if axes have changed significantly
        const axesChanged = currentAxes.some((axis, i) => Math.abs(axis - previousAxes[i]) > 0.1);

        if (axesChanged) {
          // Throttle axis processing
          const leftX = currentAxes[0] || 0;
          const leftY = currentAxes[1] || 0;
          const rightX = currentAxes[2] || 0;
          const rightY = currentAxes[3] || 0;

          handleAxisMovement(index, leftX, leftY, rightX, rightY);
          lastAxisValues.current.set(index, currentAxes);
        }
      });

      setState(prev => ({ ...prev, connected }));

      animationFrameId = requestAnimationFrame(pollGamepads);
    };

    animationFrameId = requestAnimationFrame(pollGamepads);

    return () => {
      cancelAnimationFrame(animationFrameId);
      // Clear all repeat timers
      buttonRepeatTimers.current.forEach(timer => clearInterval(timer));
      buttonRepeatTimers.current.clear();
    };
  }, [state.enabled, state.navigationSpeed, handleButtonPress, handleAxisMovement]);

  // Listen for gamepad connection/disconnection
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      // Clear button states for this gamepad
      lastButtonStates.current.delete(e.gamepad.index);
      lastAxisValues.current.delete(e.gamepad.index);
      
      // Clear repeat timers for this gamepad
      const keysToDelete: string[] = [];
      buttonRepeatTimers.current.forEach((_, key) => {
        if (key.startsWith(`${e.gamepad.index}-`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => {
        const timer = buttonRepeatTimers.current.get(key);
        if (timer) clearInterval(timer);
        buttonRepeatTimers.current.delete(key);
      });
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    try {
      await window.electronAPI.gamepad.setEnabled(enabled);
      setState(prev => ({ ...prev, enabled }));
    } catch (error) {
      console.error('Error setting gamepad enabled state:', error);
    }
  }, []);

  const setNavigationSpeed = useCallback(async (speed: number) => {
    try {
      await window.electronAPI.gamepad.setNavigationSpeed(speed);
      setState(prev => ({ ...prev, navigationSpeed: speed }));
    } catch (error) {
      console.error('Error setting navigation speed:', error);
    }
  }, []);

  const setButtonLayout = useCallback(async (layout: 'xbox' | 'playstation') => {
    try {
      await window.electronAPI.gamepad.setButtonLayout(layout);
      setState(prev => ({ ...prev, buttonLayout: layout }));
    } catch (error) {
      console.error('Error setting button layout:', error);
    }
  }, []);

  return {
    gamepads: state.connected,
    enabled: state.enabled,
    navigationSpeed: state.navigationSpeed,
    buttonLayout: state.buttonLayout,
    setEnabled,
    setNavigationSpeed,
    setButtonLayout,
  };
}
