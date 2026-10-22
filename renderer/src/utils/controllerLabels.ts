export type ControllerButtonLayout = 'xbox' | 'playstation';

export type ControllerHintButton =
  | 'primary'
  | 'back'
  | 'context'
  | 'secondary'
  | 'share'
  | 'options'
  | 'shoulderLeft'
  | 'shoulderRight';

const LABELS: Record<ControllerButtonLayout, Record<ControllerHintButton, string>> = {
  xbox: {
    primary: 'A',
    back: 'B',
    context: 'X',
    secondary: 'Y',
    share: 'View',
    options: 'Menu',
    shoulderLeft: 'LB',
    shoulderRight: 'RB',
  },
  playstation: {
    primary: 'Cross',
    back: 'Circle',
    context: 'Square',
    secondary: 'Triangle',
    share: 'Create',
    options: 'Options',
    shoulderLeft: 'L1',
    shoulderRight: 'R1',
  },
};

export function controllerButtonLabel(layout: ControllerButtonLayout, button: ControllerHintButton): string {
  return LABELS[layout][button];
}
