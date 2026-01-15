const axios = require('axios');

const clientId = '28m77brcpxywpuw6k9kg3rh6vzprvd';
const clientSecret = 'xlji4pwi9ky847t2mc9iyx5w29kdeo';

async function testIGDB() {
  try {
    // Get access token
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      },
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('✓ Got access token');

    // Test what fields are available for a game
    console.log('\n=== Getting all available fields for FINAL FANTASY IX (id: 377840) ===');
    const allFieldsQuery = `fields *;
where id = 377840;
limit 1;`;

    const allFieldsResponse = await axios.post('https://api.igdb.com/v4/games', allFieldsQuery, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
    });

    const game = allFieldsResponse.data[0];
    console.log('Available fields in IGDB game object:');
    Object.keys(game).forEach(key => {
      const value = game[key];
      if (Array.isArray(value)) {
        console.log(`  ${key}: [Array with ${value.length} items]`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });

    // Check specifically for logo fields
    console.log('\n=== Checking for logo-related fields ===');
    const logoFields = Object.keys(game).filter(k => k.toLowerCase().includes('logo') || k.toLowerCase().includes('image') || k.toLowerCase().includes('icon'));
    if (logoFields.length > 0) {
      console.log('Found fields:', logoFields);
      logoFields.forEach(field => {
        console.log(`  ${field}:`, game[field]);
      });
    } else {
      console.log('No logo-related fields found');
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testIGDB();
