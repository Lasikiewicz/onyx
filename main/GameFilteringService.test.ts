import { describe, it, expect } from 'vitest';
import { GameFilteringService } from './GameFilteringService.js';

describe('GameFilteringService', () => {
    const service = new GameFilteringService();

    describe('isLikelyDownloading', () => {
        it('should detect Steam downloading directory', () => {
            expect(service.isLikelyDownloading('C:\\Program Files (x86)\\Steam\\steamapps\\downloading\\12345')).toBe(true);
            expect(service.isLikelyDownloading('/home/user/.steam/steam/steamapps/downloading/12345')).toBe(true);
        });

        it('should detect Ubisoft downloading directory', () => {
            expect(service.isLikelyDownloading('C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\uplay_download\\123')).toBe(true);
        });

        it('should detect Epic Games downloading directory', () => {
            expect(service.isLikelyDownloading('D:\\EpicGames\\DirectDownload\\launcher-cache')).toBe(true);
        });

        it('should detect Origin staged/temp directories', () => {
            expect(service.isLikelyDownloading('C:\\ProgramData\\OriginService\\Staged\\GameName')).toBe(true);
            expect(service.isLikelyDownloading('C:\\Origin Games\\__OriginTmp\\GameFolder')).toBe(true);
        });

        it('should detect Battle.net temp directories', () => {
            expect(service.isLikelyDownloading('C:\\Program Files (x86)\\Battle.net\\temp\\download')).toBe(true);
        });

        it('should detect GOG Galaxy temp directories', () => {
            expect(service.isLikelyDownloading('C:\\Users\\User\\AppData\\Local\\Temp\\gog-galaxy\\temp_installer')).toBe(true);
        });

        it('should detect Xbox UUID patterns in XboxGames folder', () => {
            expect(service.isLikelyDownloading('C:\\XboxGames\\AFA5CF80-538B-4681-A685-0C6E61521265')).toBe(true);
            expect(service.isLikelyDownloading('D:\\XboxGames\\00000000-0000-0000-0000-000000000000')).toBe(true);
        });

        it('should not detect normal Xbox game folders as downloading', () => {
            expect(service.isLikelyDownloading('C:\\XboxGames\\Halo Infinite')).toBe(false);
        });

        it('should return false for regular game paths', () => {
            expect(service.isLikelyDownloading('C:\\Program Files (x86)\\Steam\\steamapps\\common\\Half-Life 2')).toBe(false);
            expect(service.isLikelyDownloading('D:\\Games\\EpicGames\\Fortnite')).toBe(false);
        });
    });
});
