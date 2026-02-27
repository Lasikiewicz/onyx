import { URL } from 'node:url';

const ALLOWED_PROTOCOLS = [
  'http:',
  'https:',
  'steam:',
  'epic:',
  'goggalaxy:',
  'uplay:',
  'origin:',
  'origin2:',
  'com.epicgames.launcher:',
  'battlenet:',
  'vortex:',
  'nexusm:',
  'xbox:',
  'discord:'
];

/**
 * Validates if a URL is safe to open externally based on a strict protocol whitelist.
 * prevents arbitrary command execution via unsafe protocols (e.g. javascript:, file:).
 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsedUrl.protocol);
  } catch (error) {
    // If URL parsing fails, it's not a valid URL, so it's not safe to open
    return false;
  }
}
