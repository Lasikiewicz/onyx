/**
 * Benchmarks the exact image optimization pipeline the app uses for banner .webp.
 * Run from repo root: node scripts/bench-optimize-banner.js
 * Usage: node scripts/bench-optimize-banner.js [path-to-banner.webp]
 */

const fs = require('fs');
const path = require('path');

function log(msg) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${msg}`);
}

const INPUT = path.resolve(process.argv[2] || 'custom-1772029543687-cn5xu89-banner.webp');
const WARMUP = 2;
const RUNS = 5;

// Same as app: ImageOptimizerWorker.worker / resizeAnimatedWebpWithSharp
const WEBP_ANIMATED_QUALITY = 80;

async function runAppPipeline(imageData, imageType = 'banner') {
  log('  runAppPipeline: importing sharp...');
  const sharp = (await import('sharp')).default;
  log('  runAppPipeline: sharp loaded, setting concurrency(1)...');
  sharp.concurrency(1);
  log('  runAppPipeline: building pipeline (animated WebP, effort 6)...');
  const pipeline = sharp(imageData, { animated: true, pages: -1, limitInputPixels: false })
    .webp({ quality: WEBP_ANIMATED_QUALITY, effort: 6 });
  log('  runAppPipeline: calling toBuffer() (this can take minutes for large animated WebP; effort 6 is slow)...');
  const out = await pipeline.toBuffer();
  log('  runAppPipeline: toBuffer() done, output ' + out.length + ' bytes');
  return out;
}

async function runWithLowerEffort(imageData, effort = 4) {
  log('  runWithLowerEffort: importing sharp...');
  const sharp = (await import('sharp')).default;
  sharp.concurrency(1);
  log('  runWithLowerEffort: pipeline effort=' + effort + ', toBuffer()...');
  const out = await sharp(imageData, { animated: true, pages: -1, limitInputPixels: false })
    .webp({ quality: WEBP_ANIMATED_QUALITY, effort })
    .toBuffer();
  log('  runWithLowerEffort: done, ' + out.length + ' bytes');
  return out;
}

function formatMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

async function main() {
  log('Script started. Node ' + process.version + ', cwd=' + process.cwd());
  log('Resolved INPUT: ' + INPUT);

  if (!fs.existsSync(INPUT)) {
    console.error('File not found:', INPUT);
    console.error('Usage: node scripts/bench-optimize-banner.js [path-to-banner.webp]');
    process.exit(1);
  }
  log('File exists, reading...');

  const imageData = fs.readFileSync(INPUT);
  const sizeIn = imageData.length;
  const sizeMB = (sizeIn / 1024 / 1024).toFixed(2);
  log('Read done. Input: ' + INPUT);
  log('Size: ' + sizeMB + ' MB (' + sizeIn + ' bytes)');
  console.log('');

  // Warmup
  log('Warmup (' + WARMUP + ' runs)...');
  for (let i = 0; i < WARMUP; i++) {
    log('Warmup run ' + (i + 1) + '/' + WARMUP);
    await runAppPipeline(imageData);
    log('Warmup run ' + (i + 1) + ' done');
  }
  log('Warmup complete');
  console.log('');

  // Timed runs - exact app pipeline
  log('App pipeline (animated WebP, quality 80, effort 6):');
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    log('Timed run ' + (i + 1) + '/' + RUNS + ' starting...');
    const start = performance.now();
    const out = await runAppPipeline(imageData);
    const elapsed = performance.now() - start;
    times.push(elapsed);
    log('  Run ' + (i + 1) + ' ' + formatMs(elapsed) + ' -> output ' + (out.length / 1024).toFixed(0) + ' KB');
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  log('  Average: ' + formatMs(avg) + ' | Min: ' + formatMs(min));
  console.log('');

  // Try lower effort (faster encode, slightly larger/same quality)
  log('Alternative: effort 4 (faster encode):');
  const startE4 = performance.now();
  const outE4 = await runWithLowerEffort(imageData, 4);
  const elapsedE4 = performance.now() - startE4;
  log('  Time: ' + formatMs(elapsedE4) + ' | Output: ' + (outE4.length / 1024).toFixed(0) + ' KB');
  console.log('');

  // Try effort 0 (fastest)
  log('Alternative: effort 0 (fastest):');
  const startE0 = performance.now();
  const outE0 = await runWithLowerEffort(imageData, 0);
  const elapsedE0 = performance.now() - startE0;
  log('  Time: ' + formatMs(elapsedE0) + ' | Output: ' + (outE0.length / 1024).toFixed(0) + ' KB');
  console.log('');

  log('Summary:');
  log('  App (effort 6): ~' + formatMs(avg) + ' per image');
  log('  effort 4:       ~' + formatMs(elapsedE4) + ' (potential speedup for queue)');
  log('  effort 0:       ~' + formatMs(elapsedE0) + ' (max speed, slightly larger output)');
  log('Done.');
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
