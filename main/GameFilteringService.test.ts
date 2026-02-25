import { describe, it, expect } from 'vitest';
import { GameFilteringService } from './GameFilteringService';

describe('GameFilteringService', () => {
  const service = new GameFilteringService();

  describe('isLikelyDownloading', () => {
    it('detects standard download patterns', () => {
      const downloadPaths = [
        'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\uplay_download\\123',
        'C:\\Steam\\steamapps\\downloading\\570',
        'C:/Steam/steamapps/downloading/570',
        'C:\\Program Files\\Epic Games\\epicgames\\directdownload',
        'C:\\Program Files\\Origin Games\\originservice\\staged',
        'C:\\Program Files\\Origin Games\\origin games\\__origintmp',
        'C:\\Program Files\\Battle.net\\battle.net\\temp',
        'C:\\Program Files\\Battle.net\\battlenet\\temp',
        'C:\\Users\\User\\appdata\\local\\temp\\gog-galaxy\\game',
      ];

      downloadPaths.forEach(path => {
        expect(service.isLikelyDownloading(path), `Should detect ${path}`).toBe(true);
      });
    });

    it('detects Xbox Game Pass download patterns', () => {
      // Valid Xbox UUID pattern
      const xboxPath = 'C:\\XboxGames\\AFA5CF80-538B-4681-A685-0C6E61521265';
      expect(service.isLikelyDownloading(xboxPath)).toBe(true);
    });

    it('ignores non-download paths', () => {
      const normalPaths = [
        'C:\\Games\\MyGame',
        'C:\\Steam\\steamapps\\common\\MyGame',
        'C:\\XboxGames\\MyGame', // Xbox path but no UUID
        '/usr/local/games/MyGame',
        ''
      ];

      normalPaths.forEach(path => {
        expect(service.isLikelyDownloading(path), `Should not detect ${path}`).toBe(false);
      });
    });

    it('ignores Xbox paths with invalid UUIDs', () => {
      const invalidXboxPaths = [
        'C:\\XboxGames\\not-a-uuid',
        'C:\\XboxGames\\12345678-1234-1234-1234-12345678901', // Too short
        'C:\\XboxGames\\GFA5CF80-538B-4681-A685-0C6E61521265', // Invalid hex char 'G'
      ];

      invalidXboxPaths.forEach(path => {
        expect(service.isLikelyDownloading(path), `Should not detect ${path}`).toBe(false);
      });
    });

    it('ignores UUIDs in non-Xbox paths', () => {
        const uuidPath = 'C:\\Games\\AFA5CF80-538B-4681-A685-0C6E61521265';
        expect(service.isLikelyDownloading(uuidPath)).toBe(false);
    });

    it('is case insensitive', () => {
      expect(service.isLikelyDownloading('C:\\STEAM\\STEAMAPPS\\DOWNLOADING\\123')).toBe(true);
      expect(service.isLikelyDownloading('C:\\XBOXGAMES\\AFA5CF80-538B-4681-A685-0C6E61521265')).toBe(true);
    });
  });
});
