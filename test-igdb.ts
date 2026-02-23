import { getAppConfigService } from './main/AppConfigService';
import { IGDBMetadataProvider } from './main/IGDBService';

async function run() {
    const igdb = new IGDBMetadataProvider();

    // Need to authenticate or load credentials. Assuming it reads from config.
    await igdb.initialize();

    const results = await igdb.search('Cyberpunk 2077');
    console.log('Results for Cyberpunk 2077:', results.map(r => r.title));

    const resultsFF = await igdb.search('FINAL FANTASY');
    console.log('Results for FINAL FANTASY:', resultsFF.map(r => r.title));
}

run().catch(console.error);
