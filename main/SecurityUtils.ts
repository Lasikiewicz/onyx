import { shell } from 'electron';

export const ALLOWED_EXTERNAL_PROTOCOLS: ReadonlySet<string> = new Set([
  'http:',
  'https:',
  'steam:',
  'epic:',
  'goggalaxy:',
  'uplay:',
  'origin:',
  'origin2:',
  'battlenet:',
  'battle.net:',
  'com.epicgames.launcher:',
  'xbox:',
  'nexusm:',
  'vortex:',
]);

export function isSafeExternalUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  const protocol = url.protocol.toLowerCase();
  if (!ALLOWED_EXTERNAL_PROTOCOLS.has(protocol)) {
    return false;
  }

  return true;
}

export async function openSafeExternal(rawUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!isSafeExternalUrl(rawUrl)) {
    return { success: false, error: 'Disallowed protocol' };
  }

  try {
    await shell.openExternal(rawUrl);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

