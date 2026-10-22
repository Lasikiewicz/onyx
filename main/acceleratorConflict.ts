const MODIFIER_ALIASES: Record<string, string> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  cmd: 'cmd',
  command: 'cmd',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
  meta: 'meta',
  super: 'meta',
};

export function normalizeAccelerator(shortcut: string): string {
  const parts = shortcut
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const modifiers: string[] = [];
  const keys: string[] = [];
  for (const part of parts) {
    const modifier = MODIFIER_ALIASES[part];
    if (modifier) modifiers.push(modifier);
    else keys.push(part);
  }
  modifiers.sort();
  return [...modifiers, ...keys].join('+');
}

export function acceleratorsConflict(left: string, right: string): boolean {
  if (!left.trim() || !right.trim()) return false;
  return normalizeAccelerator(left) === normalizeAccelerator(right);
}

export interface WakeShortcutDecision {
  register: string | null;
  reason?: string;
}

/**
 * The bring-to-front hotkey and Suspend/Resume both use Electron globalShortcut.
 * Suspend keeps the slot when they match. Guide-button wake is separate and is not decided here.
 */
export function decideWakeShortcut(options: {
  enabled: boolean;
  requested: string;
  suspendShortcut: string;
  suspendEnabled: boolean;
}): WakeShortcutDecision {
  if (!options.enabled) {
    return { register: null };
  }
  const requested = options.requested.trim();
  if (!requested) {
    return { register: null, reason: 'Bring-to-front shortcut is empty.' };
  }
  if (options.suspendEnabled && acceleratorsConflict(requested, options.suspendShortcut)) {
    return {
      register: null,
      reason: `Bring-to-front shortcut ${requested} matches the Suspend/Resume shortcut, so it was not registered. Suspend/Resume keeps that shortcut.`,
    };
  }
  return { register: requested };
}
