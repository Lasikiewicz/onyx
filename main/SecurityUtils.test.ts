import { describe, it, expect } from 'vitest';
import { isSafeExternalUrl } from './SecurityUtils.js';

describe('SecurityUtils', () => {
    describe('isSafeExternalUrl', () => {
        it('should allow http and https URLs', () => {
            expect(isSafeExternalUrl('http://example.com')).toBe(true);
            expect(isSafeExternalUrl('https://example.com/foo/bar')).toBe(true);
        });

        it('should allow known launcher protocols', () => {
            expect(isSafeExternalUrl('steam://rungameid/123')).toBe(true);
            expect(isSafeExternalUrl('epic://test')).toBe(true);
            expect(isSafeExternalUrl('goggalaxy://launchGame/123')).toBe(true);
            expect(isSafeExternalUrl('uplay://launch/123')).toBe(true);
            expect(isSafeExternalUrl('origin://game/launch')).toBe(true);
            expect(isSafeExternalUrl('origin2://game/launch')).toBe(true);
            expect(isSafeExternalUrl('battlenet://launch')).toBe(true);
            expect(isSafeExternalUrl('com.epicgames.launcher://apps/test')).toBe(true);
            expect(isSafeExternalUrl('xbox://test')).toBe(true);
            expect(isSafeExternalUrl('ms-windows-store://pdp/?ProductId=9WZDNCRFHVJL')).toBe(true);
        });

        it('should allow mod manager protocols', () => {
            expect(isSafeExternalUrl('nexusm://skyrim/mods/123')).toBe(true);
            expect(isSafeExternalUrl('vortex://test')).toBe(true);
        });

        it('should allow mailto links', () => {
            expect(isSafeExternalUrl('mailto:user@example.com')).toBe(true);
        });

        it('should reject javascript: URLs', () => {
            expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
        });

        it('should reject vbscript: URLs', () => {
            expect(isSafeExternalUrl('vbscript:msgbox("hello")')).toBe(false);
        });

        it('should reject file: URLs', () => {
            expect(isSafeExternalUrl('file:///C:/Windows/System32/calc.exe')).toBe(false);
        });

        it('should reject unknown protocols', () => {
            expect(isSafeExternalUrl('unknown://test')).toBe(false);
            expect(isSafeExternalUrl('ftp://example.com')).toBe(false);
        });

        it('should reject invalid URLs', () => {
            expect(isSafeExternalUrl('not-a-url')).toBe(false);
            expect(isSafeExternalUrl('')).toBe(false);
        });
    });
});
