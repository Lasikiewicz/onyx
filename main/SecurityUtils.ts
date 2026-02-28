import { URL } from 'url';

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
    'nexusm:' // Commonly used for mod managers
];

export function isSafeExternalUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        return ALLOWED_EXTERNAL_PROTOCOLS.includes(parsedUrl.protocol);
    } catch (error) {
        return false;
    }
}
