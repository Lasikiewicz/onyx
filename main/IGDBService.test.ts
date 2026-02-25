import { describe, it, expect } from 'vitest';
import { IGDBService } from './IGDBService.js';

describe('IGDBService', () => {
    const service = new IGDBService('mock-client-id', 'mock-client-secret');

    describe('inferLinkNameFromUrl', () => {
        // Access private method for testing
        const inferLinkName = (url: string) => (service as any).inferLinkNameFromUrl(url);

        it('should infer Steam from various URLs', () => {
            expect(inferLinkName('https://store.steampowered.com/app/123')).toBe('Steam');
            expect(inferLinkName('http://steamcommunity.com/groups/onyx')).toBe('Steam');
        });

        it('should infer Epic from various URLs', () => {
            expect(inferLinkName('https://store.epicgames.com/en-US/p/game')).toBe('Epic');
            expect(inferLinkName('https://epicgames.com/login')).toBe('Epic');
        });

        it('should infer Xbox from various URLs', () => {
            expect(inferLinkName('https://www.xbox.com/en-US/games/store/game/123')).toBe('Xbox');
            expect(inferLinkName('https://apps.microsoft.com/store/detail/game')).toBe('Xbox');
        });

        it('should infer PlayStation from various URLs', () => {
            expect(inferLinkName('https://store.playstation.com/en-us/product/123')).toBe('PlayStation');
        });

        it('should infer Subreddit from Reddit URLs', () => {
            expect(inferLinkName('https://www.reddit.com/r/gaming')).toBe('Subreddit');
        });

        it('should infer Discord from Discord URLs', () => {
            expect(inferLinkName('https://discord.gg/invite')).toBe('Discord');
            expect(inferLinkName('https://discord.com/invite/123')).toBe('Discord');
        });

        it('should infer Wikipedia from Wikipedia URLs', () => {
            expect(inferLinkName('https://en.wikipedia.org/wiki/Game')).toBe('Wikipedia');
        });

        it('should infer Community Wiki from Fandom or Wiki URLs', () => {
            expect(inferLinkName('https://game.fandom.com/wiki/Main_Page')).toBe('Community Wiki');
            expect(inferLinkName('https://wiki.game.com')).toBe('Community Wiki');
        });

        it('should infer YouTube from YouTube URLs', () => {
            expect(inferLinkName('https://www.youtube.com/watch?v=123')).toBe('YouTube');
            expect(inferLinkName('https://youtu.be/123')).toBe('YouTube');
        });

        it('should infer Twitch from Twitch URLs', () => {
            expect(inferLinkName('https://www.twitch.net/channel')).toBe('Twitch');
        });

        it('should infer Twitter from Twitter or X URLs', () => {
            expect(inferLinkName('https://twitter.com/user')).toBe('Twitter');
            expect(inferLinkName('https://x.com/user')).toBe('Twitter');
        });

        it('should infer Facebook from Facebook URLs', () => {
            expect(inferLinkName('https://www.facebook.com/page')).toBe('Facebook');
        });

        it('should infer Instagram from Instagram URLs', () => {
            expect(inferLinkName('https://www.instagram.com/user')).toBe('Instagram');
        });

        it('should infer GOG from GOG URLs', () => {
            expect(inferLinkName('https://www.gog.com/game/123')).toBe('GOG');
        });

        it('should infer Amazon Store from Amazon URLs', () => {
            expect(inferLinkName('https://www.amazon.com/dp/B000000')).toBe('Amazon Store');
        });

        it('should return Official Website as default', () => {
            expect(inferLinkName('https://mygame.com')).toBe('Official Website');
        });
    });
});
