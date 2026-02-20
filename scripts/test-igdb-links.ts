import { OnyxConfigManager } from './main/OnyxConfigManager.ts';
import { IGDBService } from './main/IGDBService.ts';

async function test() {
    const configManager = new OnyxConfigManager();
    const config = configManager.getConfig();
    if (!config.igdbConfig) {
        console.log('No IGDB config');
        return;
    }
    const igdb = new IGDBService(config.igdbConfig);
    console.log('Searching for Assassin\'s Creed Odyssey (links only)...');
    let r = await igdb.searchGame('Assassin\'s Creed Odyssey', true);
    if (r.length > 0) {
        console.log('Found:', r[0].name);
        console.log('Links:', JSON.stringify(r[0].links, null, 2));
    } else {
        console.log('Not found');
    }
}

test().catch(console.error);
