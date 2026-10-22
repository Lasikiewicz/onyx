import { describe, expect, it } from 'vitest';
import { acceleratorsConflict, decideWakeShortcut, normalizeAccelerator } from './acceleratorConflict';

describe('acceleratorsConflict', () => {
  it('treats modifier order and aliases as the same shortcut', () => {
    expect(normalizeAccelerator('Shift+Ctrl+G')).toBe('ctrl+shift+g');
    expect(acceleratorsConflict('Ctrl+Shift+S', 'shift+control+s')).toBe(true);
    expect(acceleratorsConflict('Ctrl+Shift+G', 'Ctrl+Shift+S')).toBe(false);
  });
});

describe('decideWakeShortcut', () => {
  it('registers a shortcut that does not match suspend', () => {
    expect(decideWakeShortcut({
      enabled: true,
      requested: 'Ctrl+Shift+G',
      suspendShortcut: 'Ctrl+Shift+S',
      suspendEnabled: true,
    })).toEqual({ register: 'Ctrl+Shift+G' });
  });

  it('leaves the shortcut free for Suspend/Resume when they match', () => {
    const decision = decideWakeShortcut({
      enabled: true,
      requested: 'Ctrl+Shift+S',
      suspendShortcut: 'shift+ctrl+s',
      suspendEnabled: true,
    });
    expect(decision.register).toBeNull();
    expect(decision.reason).toMatch(/Suspend\/Resume keeps/);
  });

  it('allows the same keys when suspend is turned off', () => {
    expect(decideWakeShortcut({
      enabled: true,
      requested: 'Ctrl+Shift+S',
      suspendShortcut: 'Ctrl+Shift+S',
      suspendEnabled: false,
    }).register).toBe('Ctrl+Shift+S');
  });

  it('does not register when the setting is off', () => {
    expect(decideWakeShortcut({
      enabled: false,
      requested: 'Ctrl+Shift+G',
      suspendShortcut: 'Ctrl+Shift+S',
      suspendEnabled: true,
    })).toEqual({ register: null });
  });
});
