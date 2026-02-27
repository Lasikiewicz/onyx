/**
 * One-off script: compress one animated WebP from the cache and report sizes.
 * Run: node scripts/compress-one-webp.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const cacheDir = process.env.ONYX_IMAGE_CACHE || path.join(process.env.LOCALAPPDATA || '', 'Onyx Dev', 'images');
const maxDim = 800;
const quality = 80;

const files = fs.readdirSync(cacheDir).filter((f) => f.endsWith('.webp'));
const big = files
  .map((f) => ({ name: f, size: fs.statSync(path.join(cacheDir, f)).size }))
  .sort((a, b) => b.size - a.size);

if (big.length === 0) {
  console.log('No .webp files in', cacheDir);
  process.exit(1);
}

const one = path.join(cacheDir, big[0].name);
const outPath = path.join(cacheDir, 'test-compressed.webp');
const buf = fs.readFileSync(one);
console.log('Input:', big[0].name, (buf.length / 1024).toFixed(0), 'KB');

try {
  const out = await sharp(buf, { animated: true, pages: -1, limitInputPixels: false })
    .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toBuffer();
  fs.writeFileSync(outPath, out);
  console.log('Output: test-compressed.webp', (out.length / 1024).toFixed(0), 'KB');
  console.log('Ratio:', (out.length / buf.length * 100).toFixed(1), '%');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
