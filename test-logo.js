const axios = require('axios');

const clientId = '28m77brcpxywpuw6k9kg3rh6vzprvd';
const clientSecret = 'xlji4pwi9ky847t2mc9iyx5w29kdeo';

async function testIGDB() {
  try {
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      },
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('✓ Got access token\n');

    // Try with just logo field (not logo.url)
    const queryBody = `fields name, cover, logo, screenshots;
where id = 185258;
limit 1;`;

    console.log('Query:', queryBody);
    console.log('\n');

    const response = await axios.post('https://api.igdb.com/v4/games', queryBody, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
    });

    console.log(`Got ${response.data.length} result(s):`);
    response.data.forEach((game) => {
      console.log(`\nGame: ${game.name} (ID: ${game.id})`);
      console.log(`  Cover:`, typeof game.cover, game.cover);
      console.log(`  Logo:`, typeof game.logo, game.logo);
      console.log(`  Screenshots:`, game.screenshots?.length || 0);
    });
  } catch (error) {
    if (error.response?.data) {
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testIGDB();
