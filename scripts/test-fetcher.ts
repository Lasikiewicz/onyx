import { MetadataFetcherService } from '../main/MetadataFetcherService.ts';
import { IGDBService } from '../main/IGDBService.ts';
import { OnyxConfigManager } from '../main/OnyxConfigManager.ts';
import { SteamGridDBService } from '../main/SteamGridDBService.ts';
import { SteamStoreService } from '../main/SteamStoreService.ts';

async function test() {
    const configManager = new OnyxConfigManager();
    const config = configManager.getConfig();

    const fetcher = new MetadataFetcherService();
    if (config.igdbConfig) {
        fetcher.setIGDBService(new IGDBService(config.igdbConfig));
    }
    fetcher.setSteamGridDBService(new SteamGridDBService(config.steamGridDBApiKey));
    fetcher.setSteamService(new SteamStoreService());

    console.log('Fetching links for Assassin\'s Creed Odyssey...');
    // (gameTitle, matchedGame, steamAppId, bypassCache, linksOnly)
    const meta = await fetcher.fetchCompleteMetadata('Assassin\'s Creed Odyssey', null, '812140', true, true);

    console.log('Result Links:');
    console.log(JSON.stringify(meta.links, null, 2));
}

test().catch(console.error);
