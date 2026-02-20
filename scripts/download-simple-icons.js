/**
 * Downloads Simple Icons (official brand SVGs) into renderer/public/link-icons.
 * Run: node scripts/download-simple-icons.js
 * Icons from https://simpleicons.org (CC0-1.0). No CDN dependency after run.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CDN = 'https://cdn.simpleicons.org';
const WHITE = 'ffffff';

const ICONS = [
    { key: 'website', slug: 'globe', file: 'globe.svg' },
    { key: 'youtube', slug: 'youtube', file: 'youtube.svg' },
    { key: 'reddit', slug: 'reddit', file: 'reddit.svg' },
    { key: 'discord', slug: 'discord', file: 'discord.svg' },
    { key: 'wiki', slug: 'fandom', file: 'wiki.svg' },
    { key: 'wikipedia', slug: 'wikipedia', file: 'wikipedia.svg' },
    { key: 'facebook', slug: 'facebook', file: 'facebook.svg' },
    { key: 'twitter', slug: 'x', file: 'twitter.svg' },
    { key: 'twitch', slug: 'twitch', file: 'twitch.svg' },
    { key: 'instagram', slug: 'instagram', file: 'instagram.svg' },
    { key: 'steam', slug: 'steam', file: 'steam.svg' },
    { key: 'epic', slug: 'epicgames', file: 'epic.svg' },
    { key: 'xbox', slug: 'xbox', file: 'xbox.svg' },
    { key: 'playstation', slug: 'playstation', file: 'playstation.svg' },
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
    for (const { key, slug, file } of ICONS) {
        const url = `${CDN}/${slug}/${WHITE}`;
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
