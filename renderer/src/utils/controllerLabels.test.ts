import { describe, expect, it } from 'vitest';
import { controllerButtonLabel } from './controllerLabels';

describe('controllerButtonLabel', () => {
  it('uses Xbox face letters and PlayStation shape names', () => {
    expect(controllerButtonLabel('xbox', 'primary')).toBe('A');
    expect(controllerButtonLabel('xbox', 'back')).toBe('B');
    expect(controllerButtonLabel('playstation', 'primary')).toBe('Cross');
    expect(controllerButtonLabel('playstation', 'secondary')).toBe('Triangle');
    expect(controllerButtonLabel('playstation', 'shoulderLeft')).toBe('L1');
  });
});
