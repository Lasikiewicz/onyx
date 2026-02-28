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
const WARMUP = 0;
const RUNS = 1;
const MAX_RUN_MS = 120000;
const RUN_ALTERNATIVES = false;

// Fast-path settings (aligned with speed-first worker strategy)
const WEBP_ANIMATED_QUALITY = 80;
const MAX_DIMENSION_BY_TYPE = {
  boxart: 600,
  logo: 400,
  banner: 800,
  alternativeBanner: 800,
  hero: 800,
  icon: 128,
};

async function runAppPipeline(imageData, imageType = 'banner') {
  log('  runAppPipeline: importing sharp...');
  const sharp = (await import('sharp')).default;
  log('  runAppPipeline: sharp loaded, setting concurrency(1)...');
  sharp.concurrency(1);
  const maxDim = MAX_DIMENSION_BY_TYPE[imageType] || 800;
  log('  runAppPipeline: building pipeline (animated WebP, resized, effort 0)...');
  const pipeline = sharp(imageData, { animated: true, pages: -1, limitInputPixels: 4096 * 4096 })
    .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_ANIMATED_QUALITY, effort: 0 });
  log('  runAppPipeline: calling toBuffer() with 2-minute cap...');
  try {
    const out = await Promise.race([
      pipeline.toBuffer(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${MAX_RUN_MS / 1000}s`)), MAX_RUN_MS)),
    ]);
    log('  runAppPipeline: toBuffer() done, output ' + out.length + ' bytes');
    return out;
  } catch (err) {
    log('  runAppPipeline: fast-fallback to original due to: ' + (err && err.message ? err.message : String(err)));
    return imageData;
  }
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
  let lastOut = null;
  for (let i = 0; i < RUNS; i++) {
    log('Timed run ' + (i + 1) + '/' + RUNS + ' starting...');
    const start = performance.now();
    const out = await runAppPipeline(imageData);
    lastOut = out;
    const elapsed = performance.now() - start;
    times.push(elapsed);
    log('  Run ' + (i + 1) + ' ' + formatMs(elapsed) + ' -> output ' + (out.length / 1024).toFixed(0) + ' KB');
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  log('  Average: ' + formatMs(avg) + ' | Min: ' + formatMs(min));
  console.log('');

  if (lastOut) {
    const outDir = path.resolve('debug-logs', 'bench-output');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, path.basename(INPUT, path.extname(INPUT)) + '-optimized.webp');
    fs.writeFileSync(outFile, lastOut);
    log('Saved optimized output: ' + outFile);
  }

  // Try lower effort (faster encode, slightly larger/same quality)
  if (RUN_ALTERNATIVES) {
    log('Alternative: effort 4 (faster encode):');
    const startE4 = performance.now();
    const outE4 = await runWithLowerEffort(imageData, 4);
    const elapsedE4 = performance.now() - startE4;
    log('  Time: ' + formatMs(elapsedE4) + ' | Output: ' + (outE4.length / 1024).toFixed(0) + ' KB');
    console.log('');

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
  } else {
    log('Summary:');
    log('  App path completed in ~' + formatMs(avg));
  }
  log('Done.');
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
