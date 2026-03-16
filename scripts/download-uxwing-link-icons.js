/**
 * Downloads UXWing SVG icons for game link types into renderer/public/link-icons.
 * Run: node scripts/download-uxwing-link-icons.js
 * Icons from https://uxwing.com (free for commercial use).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media';
const OTHER = 'https://uxwing.com/wp-content/themes/uxwing/download/internet-network-technology';

const ICONS = [
    { key: 'website', url: `${OTHER}/globe-network-icon.svg`, file: 'globe-network-icon.svg' },
    { key: 'youtube', url: `${BASE}/youtube-icon.svg`, file: 'youtube-icon.svg' },
    { key: 'reddit', url: `${BASE}/reddit-icon.svg`, file: 'reddit-icon.svg' },
    { key: 'discord', url: `${BASE}/discord-color-icon.svg`, file: 'discord-color-icon.svg' },
    { key: 'wikipedia', url: `${BASE}/wikipedia-icon.svg`, file: 'wikipedia-icon.svg' },
    { key: 'facebook', url: `${BASE}/facebook-app-round-icon.svg`, file: 'facebook-icon.svg' },
    { key: 'twitter', url: `${BASE}/twitter-icon.svg`, file: 'twitter-icon.svg' },
    { key: 'twitch', url: `${BASE}/twitch-color-icon.svg`, file: 'twitch-icon.svg' },
    { key: 'instagram', url: `${BASE}/ig-instagram-icon.svg`, file: 'instagram-icon.svg' },
    { key: 'steam', url: `${BASE}/steam-icon.svg`, file: 'steam-icon.svg' },
    { key: 'epic', url: `${BASE}/epic-games-icon.svg`, file: 'epic-games-icon.svg' }, // may 404; UXWing may not have Epic
    { key: 'xbox', url: `${BASE}/xbox-icon.svg`, file: 'xbox-icon.svg' },
    { key: 'playstation', url: `${BASE}/playstation-icon.svg`, file: 'playstation-icon.svg' },
];

const OUT_DIR = path.join(__dirname, '..', 'renderer', 'public', 'link-icons');

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`${url} => ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        }).on('error', reject);
    });
}

async function main() {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }
    for (const { key, url, file } of ICONS) {
        try {
            const body = await get(url);
            const outPath = path.join(OUT_DIR, file);
            fs.writeFileSync(outPath, body, 'utf8');
            console.log(`OK ${key} -> ${file}`);
        } catch (e) {
            console.error(`FAIL ${key} (${url}):`, e.message);
        }
    }
}

main();
