import axios from 'axios';

async function test() {
    const clientId = '1xsiqb6b255cofc5k53baxw6fez087';
    const clientSecret = '79u2mz6i9dsymmxlu9621bfri29wen';

    const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        }
    });

    const token = tokenRes.data.access_token;

    const query = `fields id, name, category, websites.*, external_games.*; search "Assassin's Creed Odyssey"; limit 5;`;
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
