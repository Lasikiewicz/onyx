/**
 * Worker thread entry: runs Sharp (resize/compress) here so the main process stays responsive.
 * Parent sends: { type: 'optimize', id, imageData, imageType, sourceExt, mode: 'static' | 'animated-webp' }
 * Worker replies: { type: 'result', id, data, ext } or { type: 'error', id, message }
 */

import { parentPort } from 'node:worker_threads';

const MAX_DIMENSION_BY_TYPE: Record<string, number> = {
  boxart: 600,
  logo: 400,
  banner: 800,
  alternativeBanner: 800,
  hero: 800,
  icon: 128,
};
const DEFAULT_MAX_DIMENSION = 800;
const JPEG_QUALITY = 85;
const WEBP_QUALITY = 85;
const PNG_COMPRESSION = 6;
const WEBP_ANIMATED_QUALITY = 80;
/** Slightly lower quality for large background-type images: faster encode, smaller file, still good visually. */
const WEBP_ANIMATED_QUALITY_BACKGROUND = 75;
const ANIMATED_TARGET_FPS = 15;
/** Skip Sharp for static images larger than this to avoid hang/OOM (bytes). */
const STATIC_SKIP_OVER_BYTES = 15 * 1024 * 1024;
/** Limit input pixels for static optimization to avoid libvips native crash on huge images. */
const STATIC_LIMIT_INPUT_PIXELS = 4096 * 4096;
/** Animated WebP often exceeds 16MP; allow a higher ceiling so we can downscale instead of storing originals. */
const ANIMATED_LIMIT_INPUT_PIXELS = 8192 * 8192;

type OptimizeMessage = {
  type: 'optimize';
  id: string;
  imageData: ArrayBuffer;
  imageType: string;
  sourceExt: string;
  mode: 'static' | 'animated-webp';
};

let sharpConcurrencySet = false;
// Keep concurrency(1): higher values cause libvips thread explosion and app crashes.

async function runStatic(
  imageData: Buffer,
  imageType: string,
  sourceExt: string
): Promise<{ data: Buffer; ext: string }> {
  const sharp = (await import('sharp')).default;
  if (!sharpConcurrencySet) {
    sharp.concurrency(1);
    sharpConcurrencySet = true;
  }
  const ext = sourceExt.toLowerCase();
  const maxDim = MAX_DIMENSION_BY_TYPE[imageType] ?? DEFAULT_MAX_DIMENSION;
  let pipeline = sharp(imageData, { limitInputPixels: STATIC_LIMIT_INPUT_PIXELS }).resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
  if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    return { data: await pipeline.toBuffer(), ext: '.jpg' };
  }
  if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: PNG_COMPRESSION });
    return { data: await pipeline.toBuffer(), ext: '.png' };
  }
  if (ext === '.avif') {
    pipeline = pipeline.avif({ quality: Math.round(WEBP_QUALITY * 0.9) });
    return { data: await pipeline.toBuffer(), ext: '.avif' };
  }
  if (ext === '.ico') {
    return { data: imageData, ext: sourceExt };
  }
  return { data: imageData, ext: sourceExt };
}

/** Callable Sharp constructor (default export). */
type SharpConstructor = (input?: unknown, options?: unknown) => import('sharp').Sharp;

/**
 * Reduces frame rate of an animated WebP by dropping frames and merging delays.
 * Call with already-resized buffer to keep memory low. Returns null if not animated, already low fps, or on error.
 */
async function thinWebpFrames(
  inputBuffer: Buffer,
  targetFps: number,
  quality: number,
  sharpInstance: SharpConstructor
): Promise<Buffer | null> {
  try {
    const image = sharpInstance(inputBuffer, { animated: true, pages: -1 });
    const metadata = await image.metadata();
    const pages = metadata.pages ?? 0;
    const pageHeight = metadata.pageHeight ?? 0;
    if (pages <= 1 || !pageHeight || !metadata.width) return null;

    const delayArr: number[] =
      metadata.delay == null
        ? Array(pages).fill(100)
        : Array.isArray(metadata.delay)
          ? [...metadata.delay]
          : Array(pages).fill(metadata.delay as number);
    while (delayArr.length < pages) delayArr.push(100);
    const totalDuration = delayArr.reduce((a, b) => a + b, 0);
    const currentFps = totalDuration > 0 ? (1000 * pages) / totalDuration : 25;
    if (currentFps <= targetFps) return null;

    const dropFactor = Math.ceil(currentFps / targetFps);
    const framesToKeep: number[] = [];
    const newDelays: number[] = [];
    for (let i = 0; i < pages; i += dropFactor) {
      framesToKeep.push(i);
      let acc = 0;
      for (let j = 0; j < dropFactor && i + j < pages; j++) acc += delayArr[i + j] ?? 100;
      newDelays.push(acc);
    }
    const width = metadata.width;

    const frameBuffers = await Promise.all(
      framesToKeep.map((pageIndex) =>
        sharpInstance(inputBuffer, { animated: true, pages: -1 })
          .extract({ left: 0, top: pageIndex * pageHeight, width, height: pageHeight })
          .png()
          .toBuffer()
      )
    );
    const compositeInputs = frameBuffers.map((buf: Buffer, i: number) => ({
      input: buf,
      top: i * pageHeight,
      left: 0,
    }));
    const out = await sharpInstance({
      create: {
        width,
        height: pageHeight * framesToKeep.length,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(compositeInputs)
      .webp({
        quality,
        effort: 4,
        pageHeight,
        delay: newDelays,
        loop: metadata.loop ?? 0,
      } as Parameters<import('sharp').Sharp['webp']>[0])
      .toBuffer();
    return out.length < inputBuffer.length ? out : null;
  } catch {
    return null;
  }
}

async function runAnimatedWebp(imageData: Buffer, imageType: string): Promise<Buffer | null> {
  const sharp = (await import('sharp')).default;
  if (!sharpConcurrencySet) {
    sharp.concurrency(1);
    sharpConcurrencySet = true;
  }
  const maxDim = MAX_DIMENSION_BY_TYPE[imageType] ?? DEFAULT_MAX_DIMENSION;
  const quality =
    imageType === 'banner' || imageType === 'alternativeBanner' || imageType === 'hero'
      ? WEBP_ANIMATED_QUALITY_BACKGROUND
      : WEBP_ANIMATED_QUALITY;
  const out = await sharp(imageData, { animated: true, pages: -1, limitInputPixels: ANIMATED_LIMIT_INPUT_PIXELS })
    .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 0 })
    .toBuffer();
  // Frame-thinning disabled: causes hang on large animated WebP (many frames → heavy extract/composite).
  // Re-enable with a guard (e.g. only when metadata.pages < 60 and buffer size < 5MB).
  // const thinned = await thinWebpFrames(out, ANIMATED_TARGET_FPS, quality, sharp as SharpConstructor);
  // if (thinned != null && thinned.length < out.length) return thinned;
  return out;
}

/** Allow worker processing for animated WebP; caller enforces timeout and fallback. */
const SKIP_ANIMATED_WEBP_IN_WORKER = false;

parentPort?.on('message', async (msg: OptimizeMessage) => {
  if (msg.type !== 'optimize' || !msg.id) return;
  const { id, imageData, imageType, sourceExt, mode } = msg;
  const buffer = Buffer.from(imageData);
  try {
    if (mode === 'animated-webp') {
      const data = SKIP_ANIMATED_WEBP_IN_WORKER ? buffer : (await runAnimatedWebp(buffer, imageType)) ?? buffer;
      const arrayBuf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      parentPort?.postMessage({ type: 'result', id, data: arrayBuf, ext: '.webp' }, [arrayBuf]);
    } else {
      if (buffer.length > STATIC_SKIP_OVER_BYTES) {
        const arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
        parentPort?.postMessage({ type: 'result', id, data: arrayBuf, ext: sourceExt.startsWith('.') ? sourceExt : `.${sourceExt}` }, [arrayBuf]);
      } else {
        const { data, ext } = await runStatic(buffer, imageType, sourceExt);
        const arrayBuf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
        parentPort?.postMessage({ type: 'result', id, data: arrayBuf, ext }, [arrayBuf]);
      }
    }
  } catch (err) {
    parentPort?.postMessage({
      type: 'error',
      id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
