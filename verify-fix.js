const { MetadataFetcherService } = require('./dist-electron/MetadataFetcherService.js');
const { IGDBService } = require('./dist-electron/IGDBService.js');
const { SteamGridDBService } = require('./dist-electron/SteamGridDBService.js');
const dotenv = require('dotenv');
const path = require('node:path');

dotenv.config();

async function verify() {
    console.log('--- Verifying MetadataFetcherService Fix ---');

    // Note: This script requires dist-electron to be built
    // and valid .env credentials

    const igdbService = process.env.IGDB_CLIENT_ID ? new IGDBService(process.env.IGDB_CLIENT_ID, process.env.IGDB_CLIENT_SECRET) : null;
    const sgdbService = process.env.STEAMGRIDDB_API_KEY ? new SteamGridDBService(process.env.STEAMGRIDDB_API_KEY) : null;

    const metadataFetcher = new MetadataFetcherService(igdbService, null, null, sgdbService);

    const testTitle = 'Grand Theft Auto V';
    console.log(`Testing with title: "${testTitle}" (no Steam App ID)`);

    try {
        const metadata = await metadataFetcher.searchArtwork(testTitle);
        console.log('Result:', {
            boxArtUrl: metadata.boxArtUrl ? 'PRESENT' : 'MISSING',
            bannerUrl: metadata.bannerUrl ? 'PRESENT' : 'MISSING',
            logoUrl: metadata.logoUrl ? 'PRESENT' : 'MISSING',
        });

        if (metadata.boxArtUrl) {
            console.log('SUCCESS: Artwork fetched correctly without Steam App ID!');
        } else {
            console.log('FAILURE: Artwork still missing for title-only search.');
        }
    } catch (error) {
        console.error('Verification failed with error:', error);
    }
}

verify();
