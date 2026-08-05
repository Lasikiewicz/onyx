import { describe, it, expect } from 'vitest';
import { parseEaGameRegistryOutput } from './eaRegistry.js';

describe('parseEaGameRegistryOutput', () => {
    it('parses a single game and strips the trailing separator', () => {
        const output = [
            'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\EA Games\\Battlefield 6',
            '    Install Dir    REG_SZ    C:\\Program Files\\EA Games\\Battlefield 6\\',
            '',
            'End of search: 1 match(es) found.',
        ].join('\r\n');

        expect(parseEaGameRegistryOutput(output)).toEqual([
            { name: 'Battlefield 6', installDir: 'C:\\Program Files\\EA Games\\Battlefield 6' },
        ]);
    });

    it('parses multiple games, including install dirs outside the default root', () => {
        const output = [
            'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\EA Games\\Battlefield 6',
            '    Install Dir    REG_SZ    C:\\Program Files\\EA Games\\Battlefield 6\\',
            '',
            'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\EA Games\\Dragon Age The Veilguard',
            '    Install Dir    REG_SZ    D:\\My Games\\Dragon Age The Veilguard',
            '',
            'End of search: 2 match(es) found.',
        ].join('\r\n');

        expect(parseEaGameRegistryOutput(output)).toEqual([
            { name: 'Battlefield 6', installDir: 'C:\\Program Files\\EA Games\\Battlefield 6' },
            { name: 'Dragon Age The Veilguard', installDir: 'D:\\My Games\\Dragon Age The Veilguard' },
        ]);
    });

    it('keeps spaces in game folder names', () => {
        const output = [
            'HKEY_LOCAL_MACHINE\\SOFTWARE\\EA Games\\Need for Speed Unbound',
            '    Install Dir    REG_SZ    C:\\Program Files\\EA Games\\Need for Speed Unbound',
        ].join('\n');

        expect(parseEaGameRegistryOutput(output)).toEqual([
            { name: 'Need for Speed Unbound', installDir: 'C:\\Program Files\\EA Games\\Need for Speed Unbound' },
        ]);
    });

    it('ignores values that are not Install Dir', () => {
        const output = [
            'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\EA Games\\Battlefield 6',
            '    Locale    REG_SZ    en_US',
            '    DisplayName    REG_SZ    Battlefield 6',
        ].join('\r\n');

        expect(parseEaGameRegistryOutput(output)).toEqual([]);
    });

    it('ignores an Install Dir value with no preceding key', () => {
        expect(parseEaGameRegistryOutput('    Install Dir    REG_SZ    C:\\Orphaned')).toEqual([]);
    });

    it('returns an empty list for empty or non-matching output', () => {
        expect(parseEaGameRegistryOutput('')).toEqual([]);
        expect(parseEaGameRegistryOutput('ERROR: The system was unable to find the specified registry key')).toEqual([]);
    });
});
