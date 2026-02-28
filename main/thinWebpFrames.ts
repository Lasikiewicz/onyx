/**
 * Reduces frame rate of an animated WebP by dropping frames and merging delays.
 * Call with already-resized buffer to keep memory low.
 * Returns null if not animated, already at or below target fps, or on error.
 */

import type { Sharp } from 'sharp';

/** Sharp default export (callable constructor). */
type SharpConstructor = (input?: unknown, options?: unknown) => Sharp;

export async function thinWebpFrames(
  sharpInstance: SharpConstructor,
  inputBuffer: Buffer,
  targetFps: number,
  quality: number
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
      } as Parameters<Sharp['webp']>[0])
      .toBuffer();
    return out.length < inputBuffer.length ? out : null;
  } catch {
    return null;
  }
}
