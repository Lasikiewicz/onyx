import { OnyxConfigManager } from '../main/OnyxConfigManager.ts';
import axios from 'axios';

async function test() {
    const configManager = new OnyxConfigManager();
    const config = configManager.getConfig();
    if (!config.igdbConfig) {
        console.log('No IGDB config');
        return;
    }

    const { clientId, clientSecret } = config.igdbConfig;

    // Get token
    const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        }
    });

    const token = tokenRes.data.access_token;

    // Search for Odyssey
    const query = `fields name, websites.*, external_games.*; search "Assassin's Creed Odyssey"; limit 1;`;
    const res = await axios.post('https://api.igdb.com/v4/games', query, {
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain'
        }
    });

    console.log(JSON.stringify(res.data, null, 2));
}

test().catch(console.error);
