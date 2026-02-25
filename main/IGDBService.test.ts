import { describe, it, expect } from 'vitest';
import { IGDBService } from './IGDBService';

describe('IGDBService', () => {
  // Use dummy credentials since we are testing a method that doesn't use them
  const service = new IGDBService('test-client-id', 'test-client-secret');

  // Helper to access the private method
  const inferLinkName = (url: string): string => {
    return (service as any).inferLinkNameFromUrl(url);
  };

  describe('inferLinkNameFromUrl', () => {
    it('should identify Steam URLs', () => {
      expect(inferLinkName('https://store.steampowered.com/app/123')).toBe('Steam');
      expect(inferLinkName('https://steamcommunity.com/app/123')).toBe('Steam');
    });

    it('should identify Epic Games URLs', () => {
      expect(inferLinkName('https://store.epicgames.com/p/game')).toBe('Epic');
      expect(inferLinkName('https://epicgames.com/store')).toBe('Epic');
    });

    it('should identify Xbox URLs', () => {
      expect(inferLinkName('https://www.xbox.com/en-US/games')).toBe('Xbox');
      expect(inferLinkName('https://microsoft.com/store/apps')).toBe('Xbox');
    });

    it('should identify PlayStation URLs', () => {
      expect(inferLinkName('https://store.playstation.com/en-us/product/123')).toBe('PlayStation');
      expect(inferLinkName('https://playstation.com/game')).toBe('PlayStation');
    });

    it('should identify GOG URLs', () => {
      expect(inferLinkName('https://www.gog.com/game/cyberpunk')).toBe('GOG');
    });

    it('should identify Amazon URLs', () => {
      expect(inferLinkName('https://www.amazon.com/dp/B08XW4K8H7')).toBe('Amazon Store');
      expect(inferLinkName('https://amazon.co.uk/game')).toBe('Amazon Store');
    });

    it('should identify Social Media URLs', () => {
      expect(inferLinkName('https://reddit.com/r/game')).toBe('Subreddit');
      expect(inferLinkName('https://discord.gg/game')).toBe('Discord');
      expect(inferLinkName('https://twitter.com/game')).toBe('Twitter');
      expect(inferLinkName('https://x.com/game')).toBe('Twitter');
      expect(inferLinkName('https://facebook.com/game')).toBe('Facebook');
      expect(inferLinkName('https://instagram.com/game')).toBe('Instagram');
      expect(inferLinkName('https://twitch.tv/game')).toBe('Twitch');
      expect(inferLinkName('https://youtube.com/watch?v=123')).toBe('YouTube');
      expect(inferLinkName('https://youtu.be/123')).toBe('YouTube');
    });

    it('should identify Wiki URLs', () => {
      expect(inferLinkName('https://en.wikipedia.org/wiki/Game')).toBe('Wikipedia');
      expect(inferLinkName('https://game.fandom.com/wiki/Home')).toBe('Community Wiki');
      expect(inferLinkName('https://game.wiki.fextralife.com')).toBe('Community Wiki');
    });

    it('should default to "Official Website" for unknown URLs', () => {
      expect(inferLinkName('https://example.com')).toBe('Official Website');
      expect(inferLinkName('https://my-game-site.net')).toBe('Official Website');
    });

    it('should handle case insensitivity', () => {
      expect(inferLinkName('HTTPS://STORE.STEAMPOWERED.COM/APP/123')).toBe('Steam');
      expect(inferLinkName('https://REDDIT.com/r/game')).toBe('Subreddit');
    });
  });
});
