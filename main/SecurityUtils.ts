import { URL } from 'node:url';

/**
 * List of protocols that are considered safe to open via shell.openExternal
 */
export const ALLOWED_EXTERNAL_PROTOCOLS = [
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
  'xbox:',
  'ms-windows-store:',
  'nexusm:', // Nexus Mods
  'vortex:', // Vortex Mod Manager
  'mailto:', // Standard mailto links
];

/**
 * Validates if a URL uses a safe protocol allowed for external opening.
 *
 * @param url The URL string to validate
 * @returns true if the URL uses a safe protocol, false otherwise
 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_EXTERNAL_PROTOCOLS.includes(parsedUrl.protocol);
  } catch {
    // URL parsing failed, considered unsafe
    return false;
  }
}
