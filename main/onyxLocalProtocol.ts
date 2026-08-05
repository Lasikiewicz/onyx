import { app, protocol, session } from 'electron';
import path from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import type { ImageCacheService } from './ImageCacheService.js';

/**
 * Registers the `onyx-local` custom protocol, which serves cached artwork
 * (boxart/banner/logo/hero/icon/screenshots) from the image cache directory
 * to the renderer.
 *
 * URL format (current): onyx-local://{gameId}-{imageType}
 * Older URL formats (URL-encoded or base64-encoded absolute paths) are still
 * decoded for backward compatibility, with a path-traversal guard restricting
 * reads to the cache directory / userData.
 *
 * Must be called after app ready and before any windows are created.
 */
export function registerOnyxLocalProtocol(imageCacheService: ImageCacheService): void {
  // Track failed URLs to avoid spam logging and retry loops.
  // Bounded: reset when they grow past MAX_TRACKED_URLS so memory cannot grow
  // without limit over a long session (worst case after a reset is a few extra
  // log lines / one extra retry round for URLs that were being throttled).
  const MAX_TRACKED_URLS = 2000;
  const failedUrls = new Set<string>();
  const failedUrlCounts = new Map<string, number>();
  const successUrlCounts = new Map<string, number>();

  console.log('[onyx-local] Registering protocol handler...');

  // Use the modern protocol.handle() API (Promise-based, works better with contextIsolation)
  // Note: protocol.handle() uses standard Fetch API Request/Response, not Electron's ProtocolRequest
  const protocolHandler = async (request: Request): Promise<Response> => {
    // Extract request URL early so it's available in catch block
    const requestUrl = request.url;

    // Bound memory before tracking anything new
    if (failedUrlCounts.size > MAX_TRACKED_URLS && !failedUrlCounts.has(requestUrl)) {
      failedUrlCounts.clear();
    }
    if (failedUrls.size > MAX_TRACKED_URLS) {
      failedUrls.clear();
    }

    // Track request count early
    const count = (failedUrlCounts.get(requestUrl) || 0) + 1;
    failedUrlCounts.set(requestUrl, count);

    // Log EVERY request to see if handler is being called
    if (count === 1) {
      console.log(`\n[onyx-local] ===== PROTOCOL HANDLER CALLED =====`);
      console.log(`[onyx-local] URL: ${requestUrl.substring(0, 150)}...`);
    }

    try {
      // NEW SIMPLE APPROACH: URL format is onyx-local://{gameId}-{imageType}
      // Extract gameId and imageType directly from URL
      // Handle both with and without trailing slash
      let urlPath = '';
      const match = requestUrl.match(/onyx-local:\/\/\/?([^?#]+)/);
      if (match) {
        urlPath = match[1].replace(/\/+$/, ''); // Remove trailing slashes
      }

      if (!urlPath) {
        if (count === 1) console.log(`[onyx-local] Empty URL path from: ${requestUrl}`);
        return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
      }

      if (count === 1) {
        console.log(`[onyx-local] Parsing URL: ${requestUrl} -> urlPath: "${urlPath}"`);
      }

      // URL-decode the path first (browser may URL-encode special characters)
      let decodedUrlPath: string;
      try {
        decodedUrlPath = decodeURIComponent(urlPath);
      } catch (e) {
        // If decoding fails, use original
        decodedUrlPath = urlPath;
      }

      if (count === 1 && decodedUrlPath !== urlPath) {
        console.log(`[onyx-local] Decoded urlPath: "${decodedUrlPath}"`);
      }

      // Parse: {gameId}-{imageType} or old format with encoded path
      let gameId: string | null = null;
      let imageType: string | null = null;

      // Check if it's the new simple format: {gameId}-{imageType}
      // Use case-insensitive match so URLs lowercased by the browser (e.g. alternativebanner) still work
      const simpleMatch = decodedUrlPath.match(/^([^-]+(?:-[^-]+)*?)-(boxart|banner|alternativebanner|alternativeBanner|logo|hero|icon|screenshot-\d+)$/i);
      if (simpleMatch) {
        gameId = simpleMatch[1];
        const rawType = simpleMatch[2].toLowerCase();
        imageType = rawType === 'alternativebanner' ? 'alternativeBanner' : rawType;
      } else {
        // Old format - try to decode and extract
        try {
          const filename = path.basename(decodedUrlPath);
          const parts = filename.split('-');
          if (parts.length >= 2) {
            if (parts[0] === 'steam' && parts.length > 1) {
              gameId = parts[0] + '-' + parts[1];
              imageType = parts[2] || 'boxart';
            } else if (parts[0] === 'custom' && parts.length > 2) {
              gameId = parts[0] + '-' + parts[1] + '-' + parts[2];
              imageType = parts[3] || 'boxart';
            } else {
              // Try to find image type in filename
              const typeMatch = filename.match(/-?(boxart|banner|alternativeBanner|logo|hero|icon|screenshot-\d+)-?/);
              if (typeMatch) {
                imageType = typeMatch[1];
                gameId = filename.substring(0, filename.indexOf('-' + imageType));
              }
            }
          }
        } catch (e) {
          // Can't decode, try base64
          try {
            let base64 = decodedUrlPath.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const decoded = Buffer.from(base64, 'base64').toString('utf-8');
            const filename = path.basename(decoded);
            const parts = filename.split('-');
            if (parts.length >= 2) {
              if (parts[0] === 'steam' && parts.length > 1) {
                gameId = parts[0] + '-' + parts[1];
                imageType = parts[2] || 'boxart';
              } else if (parts[0] === 'custom' && parts.length > 2) {
                gameId = parts[0] + '-' + parts[1] + '-' + parts[2];
                imageType = parts[3] || 'boxart';
              }
            }
          } catch (e2) {
            // Can't decode at all
          }
        }
      }

      // Get cache directory from ImageCacheService so protocol lookup always
      // matches the real active cache path (including fallback paths).
      const cacheDir = imageCacheService.getCacheDir();

      if (gameId && imageType && existsSync(cacheDir)) {
        // Try to find file: {gameId}-{imageType}.{ext}
        const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];

        const prefix = `${safeGameId}-${imageType}`;
        const prefixLower = prefix.toLowerCase();
        for (const ext of extensions) {
          const filename = `${prefix}${ext}`;
          const filePath = path.join(cacheDir, filename);

          // Read directly and treat ENOENT as "wrong extension". This runs once per image
          // the renderer paints, so it must not block the main thread: a stat+read pair of
          // sync calls per candidate extension meant ~100 blocking reads to paint a grid.
          let fileData: Buffer;
          try {
            fileData = await readFile(filePath);
          } catch (readError) {
            const code = (readError as NodeJS.ErrnoException)?.code;
            if (code === 'ENOENT' || code === 'EISDIR') continue;
            if (count === 1) {
              console.error(`[onyx-local] Error reading file ${filename}:`, readError);
            }
            break; // Real read failure — fall through to 404 below.
          }

          if (count === 1) console.log(`[onyx-local] ✓ Found: ${filename}`);

          // Clear from failed set if it was there (file now exists)
          if (failedUrls.has(requestUrl)) {
            failedUrls.delete(requestUrl);
            failedUrlCounts.delete(requestUrl);
          }

          let mimeType = 'image/jpeg';
          if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.gif') mimeType = 'image/gif';
          else if (ext === '.webp') mimeType = 'image/webp';
          else if (ext === '.webm') mimeType = 'video/webm';
          else if (ext === '.ico') mimeType = 'image/x-icon';
          else if (ext === '.avif') mimeType = 'image/avif';

          // Only log successful loads occasionally to avoid spam. Counted in its own map so
          // success keys do not consume the failure map's MAX_TRACKED_URLS budget.
          const successCount = successUrlCounts.get(requestUrl) || 0;
          successUrlCounts.set(requestUrl, successCount + 1);
          if (successUrlCounts.size > MAX_TRACKED_URLS) successUrlCounts.clear();
          if (successCount === 0 || successCount % 50 === 0) {
            console.log(`[onyx-local] Successfully serving file: ${filename}`);
          }

          // `Buffer` from fs/promises is ArrayBufferLike-backed and not assignable to BodyInit;
          // re-wrap over a plain ArrayBuffer. The memcpy is trivial next to the blocking
          // synchronous read this replaced.
          return new Response(new Uint8Array(fileData), { headers: { 'Content-Type': mimeType } });
        }

        // Case-insensitive fallback (URL may be lowercased by browser; file on disk may have different casing)
        try {
          const files = readdirSync(cacheDir) as string[];
          for (const f of files) {
            const fl = f.toLowerCase();
            const ext = extensions.find((e) => fl === prefixLower + e);
            if (!ext) continue;
            const filePath = path.join(cacheDir, f);
            if (!existsSync(filePath)) continue;
            if (count === 1) console.log(`[onyx-local] ✓ Found (case-insensitive): ${f}`);
            if (failedUrls.has(requestUrl)) {
              failedUrls.delete(requestUrl);
              failedUrlCounts.delete(requestUrl);
            }
            const fileData = readFileSync(filePath);
            let mimeType = 'image/jpeg';
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.gif') mimeType = 'image/gif';
            else if (ext === '.webp') mimeType = 'image/webp';
            else if (ext === '.webm') mimeType = 'video/webm';
            else if (ext === '.ico') mimeType = 'image/x-icon';
            else if (ext === '.avif') mimeType = 'image/avif';
            return new Response(fileData, { headers: { 'Content-Type': mimeType } });
          }
        } catch (_e) {
          // Ignore
        }

        // File not found - return 404 but don't mark as failed until we've tried a few times
        // This allows other images for the same game to still load
        if (count === 1) {
          console.log(`[onyx-local] File not found: ${safeGameId}-${imageType}.{jpg|png|gif|webp|webm|...}`);
          console.log(`[onyx-local] Cache dir: ${cacheDir}`);
          // List available files for this game ID to help debug
          try {
            const files = readdirSync(cacheDir);
            const matchingFiles = files.filter((f: string) => f.startsWith(safeGameId + '-'));
            if (matchingFiles.length > 0) {
              console.log(`[onyx-local] Found ${matchingFiles.length} file(s) for game ID ${safeGameId}:`, matchingFiles.slice(0, 5));
            } else {
              // Try to find files with similar game IDs
              const similarFiles = files.filter((f: string) => f.includes('-boxart') || f.includes('-banner'));
              if (similarFiles.length > 0) {
                console.log(`[onyx-local] Sample files in cache:`, similarFiles.slice(0, 5));
              }
            }
          } catch (e) {
            // Ignore errors listing directory
          }
        }

        // Return 404 for this specific image - don't block other images
        // Only mark as failed after multiple attempts to prevent retry loops
        if (count > 2) {
          failedUrls.add(requestUrl);
        }
        return new Response(null, {
          status: 404,
          statusText: 'Not Found',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
          }
        });
      } else {
        if (count === 1) {
          console.log(`[onyx-local] Could not parse URL: ${urlPath}`);
          console.log(`[onyx-local] Parsed: gameId="${gameId}", imageType="${imageType}"`);
        }
        // Fall through to fallback logic
      }

      // Fallback: try old format decoding
      let encodedPath = urlPath;

      // Log first few requests with full details, then throttle
      if (count === 1) {
        console.log(`\n[onyx-local] ===== FIRST REQUEST =====`);
        console.log(`[onyx-local] Full URL: ${requestUrl}`);
        console.log(`[onyx-local] Extracted encoded path: ${encodedPath}`);
      } else if (count <= 3) {
        console.log(`[onyx-local] Request #${count} for same URL`);
      } else if (count === 10) {
        console.warn(`[onyx-local] WARNING: Request #${count} for same URL - possible infinite retry loop!`);
      } else if (count % 1000 === 0) {
        console.log(`[onyx-local] Request #${count} (throttled logging)`);
      }

      // Prevent infinite retry loops - if we've seen this URL fail 2+ times, stop processing immediately
      if (count > 2) {
        // Check if this URL has already failed
        if (failedUrls.has(requestUrl)) {
          // Return 410 Gone to tell browser to stop retrying
          return new Response(null, {
            status: 410,
            statusText: 'Gone - Stop Retrying',
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
              'X-Stop-Retry': 'true',
            }
          });
        }
      }

      // Validate we have an encoded path
      if (!encodedPath || encodedPath.trim() === '') {
        console.error(`[onyx-local] Could not extract path from URL: ${requestUrl}`);
        return new Response(null, {
          status: 404,
          headers: { 'Cache-Control': 'no-store' }
        });
      }

      // Remove ALL trailing slashes (Electron sometimes adds multiple)
      // This is critical - trailing slashes break base64 decoding
      while (encodedPath.endsWith('/')) {
        encodedPath = encodedPath.substring(0, encodedPath.length - 1);
      }

      // Remove any query parameters or fragments
      const queryIndex = encodedPath.indexOf('?');
      if (queryIndex !== -1) {
        encodedPath = encodedPath.substring(0, queryIndex);
      }
      const fragmentIndex = encodedPath.indexOf('#');
      if (fragmentIndex !== -1) {
        encodedPath = encodedPath.substring(0, fragmentIndex);
      }

      // Decode the path (it's URL-encoded)
      // URL encoding is case-insensitive, so Electron's URL lowercasing won't break it
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(encodedPath);
      } catch (e) {
        // If URL decoding fails, try base64 decoding for backward compatibility with old URLs
        try {
          // Try base64 decoding (for old URLs that used base64)
          let base64 = encodedPath.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          decodedPath = Buffer.from(base64, 'base64').toString('utf-8');
          if (!failedUrls.has(requestUrl + '_base64_decode')) {
            failedUrls.add(requestUrl + '_base64_decode');
            console.warn(`[onyx-local] Using base64 decoding for backward compatibility: ${encodedPath.substring(0, 50)}...`);
          }
        } catch (e2) {
          if (!failedUrls.has(requestUrl + '_decode_error')) {
            failedUrls.add(requestUrl + '_decode_error');
            console.error(`[onyx-local] Failed to decode path. Encoded: ${encodedPath.substring(0, 100)}...`, e);
          }
          return new Response(null, {
            status: 404,
            headers: { 'Cache-Control': 'no-store' }
          });
        }
      }

      // On Windows, handle path separators and drive letters properly
      let finalPath: string;
      if (process.platform === 'win32') {
        // Replace forward slashes with backslashes
        finalPath = decodedPath.replace(/\//g, '\\');

        // Handle Windows drive letter format
        // After decoding, we should have something like "C:\Users..." or "C:/Users..."
        // Ensure proper format: C:\Users...
        if (finalPath.match(/^[A-Za-z]:/)) {
          // Drive letter is present, ensure backslash after colon
          if (finalPath.charAt(2) !== '\\') {
            finalPath = finalPath.charAt(0) + ':' + '\\' + finalPath.substring(2);
          }
        }
      } else {
        // On Unix-like systems, just replace forward slashes
        finalPath = decodedPath.replace(/\//g, path.sep);
      }

      // Normalize the path to resolve any .. or . segments
      finalPath = path.normalize(finalPath);

      // SECURITY: Ensure path is within cache directory or is a valid absolute path to prevent traversal attacks
      const isTraversed = process.platform === 'win32'
        ? !finalPath.toLowerCase().startsWith(cacheDir.toLowerCase()) && !finalPath.toLowerCase().startsWith(app.getPath('userData').toLowerCase())
        : !finalPath.startsWith(cacheDir) && !finalPath.startsWith(app.getPath('userData'));

      if (isTraversed) {
        console.error(`[onyx-local] ⛔ BLOCKED Path Traversal Attempt or unauthorized access: ${finalPath}`);
        console.error(`[onyx-local] Authorized: ${cacheDir} or ${app.getPath('userData')}`);
        return new Response(null, {
          status: 403,
          statusText: 'Forbidden',
          headers: { 'X-Security-Reason': 'Path Traversal Detected' }
        });
      }

      // Verify file exists
      if (!existsSync(finalPath)) {
        // Only log error once per unique URL to avoid spam
        if (!failedUrls.has(requestUrl)) {
          failedUrls.add(requestUrl);
          console.error(`\n[onyx-local] ===== IMAGE FILE NOT FOUND =====`);
          console.error(`[onyx-local] Final Path: ${finalPath}`);
          console.error(`[onyx-local] URL: ${requestUrl}`);
          console.error(`[onyx-local] Decoded Path: ${decodedPath}`);
          console.error(`[onyx-local] Encoded Path: ${encodedPath}`);

          // Check if parent directory exists
          const parentDir = path.dirname(finalPath);
          if (!existsSync(parentDir)) {
            console.error(`  ❌ Parent directory does not exist: ${parentDir}`);

            // Check if it's the image cache directory - check both old and new locations
            const oldCacheDir = path.join(app.getPath('userData'), 'cache', 'images');
            const appName = app.name || 'Onyx';
            let newCacheDir: string;
            if (process.platform === 'win32') {
              const localAppData = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local');
              newCacheDir = path.join(localAppData, appName, 'images');
            } else if (process.platform === 'darwin') {
              newCacheDir = path.join(homedir(), 'Library', 'Caches', appName, 'images');
            } else {
              newCacheDir = path.join(homedir(), '.cache', appName, 'images');
            }

            // Check both cache locations for any matching files
            const cacheDirs = [newCacheDir, oldCacheDir];
            for (const imageCacheDir of cacheDirs) {
              if (existsSync(imageCacheDir)) {
                try {
                  const cacheFiles = readdirSync(imageCacheDir);
                  console.error(`  Checking cache directory: ${imageCacheDir} (${cacheFiles.length} files)`);

                  // Try multiple matching strategies:
                  // 1. Exact filename match
                  const filename = path.basename(finalPath);
                  let matching = cacheFiles.filter(f => f === filename);

                  // 2. If no exact match, try matching by game ID (first part before first dash)
                  if (matching.length === 0 && filename.includes('-')) {
                    const gameIdPart = filename.split('-')[0];
                    matching = cacheFiles.filter(f => f.startsWith(gameIdPart + '-'));
                    console.error(`  Trying to match by game ID "${gameIdPart}": found ${matching.length} files`);
                  }

                  // 3. If still no match, try matching by image type (boxart, banner, etc.)
                  if (matching.length === 0 && filename.includes('-')) {
                    const parts = filename.split('-');
                    if (parts.length >= 2) {
                      const imageType = parts[1]; // boxart, banner, alternativeBanner, logo, hero, icon
                      const gameIdPart = parts[0];
                      matching = cacheFiles.filter(f =>
                        f.startsWith(gameIdPart + '-') && f.includes('-' + imageType + '-')
                      );
                      console.error(`  Trying to match by game ID + type "${gameIdPart}-${imageType}": found ${matching.length} files`);
                    }
                  }

                  if (matching.length > 0) {
                    // Use the first match (or prefer .png/.jpg if available)
                    let selectedFile: string = matching[0];
                    const pngMatch = matching.find(f => f.endsWith('.png'));
                    const jpgMatch = matching.find(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
                    // Prefer PNG, then JPG, otherwise use first match
                    if (pngMatch) {
                      selectedFile = pngMatch as string;
                    } else if (jpgMatch) {
                      selectedFile = jpgMatch as string;
                    }

                    const correctPath = path.join(imageCacheDir, selectedFile);
                    console.error(`  ✓ Found matching file: ${selectedFile}`);
                    console.error(`  Serving from: ${correctPath}`);

                    if (existsSync(correctPath)) {
                      const fileData = readFileSync(correctPath);
                      const ext = path.extname(correctPath).toLowerCase();
                      let mimeType = 'application/octet-stream';
                      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                      else if (ext === '.png') mimeType = 'image/png';
                      else if (ext === '.gif') mimeType = 'image/gif';
                      else if (ext === '.webp') mimeType = 'image/webp';
                      else if (ext === '.webm') mimeType = 'video/webm';

                      // Clear from failed set since we found it
                      if (failedUrls.has(requestUrl)) {
                        failedUrls.delete(requestUrl);
                        failedUrlCounts.delete(requestUrl);
                      }

                      return new Response(fileData, {
                        headers: { 'Content-Type': mimeType },
                      });
                    }
                  } else {
                    console.error(`  No matching files found in ${imageCacheDir}`);
                  }
                } catch (e) {
                  console.error(`  Could not list cache directory ${imageCacheDir}: ${e}`);
                }
              } else {
                console.error(`  Cache directory does not exist: ${imageCacheDir}`);
              }
            }
          } else {
            console.error(`  ✓ Parent directory exists: ${parentDir}`);
            // List files in parent directory to help debug
            try {
              const files = readdirSync(parentDir);
              console.error(`  Files in directory (${files.length}): ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);

              // Try to find similar files
              const filename = path.basename(finalPath);
              const similar = files.filter(f => {
                const fLower = f.toLowerCase();
                const nameLower = filename.toLowerCase();
                return fLower.includes(nameLower.substring(0, 10)) || nameLower.includes(fLower.substring(0, 10));
              });
              if (similar.length > 0) {
                console.error(`  Similar files found: ${similar.join(', ')}`);
              }
            } catch (e) {
              console.error(`  Could not list directory: ${e}`);
            }
          }
        }
        // Return 404 with headers to prevent retries
        return new Response(null, {
          status: 404,
          statusText: 'Not Found',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
          }
        });
      }

      // Clear from failed set if it was there
      if (failedUrls.has(requestUrl)) {
        failedUrls.delete(requestUrl);
        failedUrlCounts.delete(requestUrl);
      }

      // Only log successful loads occasionally to avoid spam
      const successCount = failedUrlCounts.get(requestUrl + '_success') || 0;
      failedUrlCounts.set(requestUrl + '_success', successCount + 1);
      if (successCount === 0 || successCount % 50 === 0) {
        console.log(`[onyx-local] Successfully serving file: ${finalPath}`);
      }

      // Read file and return as Response
      const fileData = readFileSync(finalPath);
      const ext = path.extname(finalPath).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.webm') mimeType = 'video/webm';

      return new Response(fileData, {
        headers: { 'Content-Type': mimeType },
      });
    } catch (error) {
      // Only log errors once per unique URL to avoid spam
      // IMPORTANT: Errors for one image should NOT affect other images
      // Each request is independent, so we return 500 for this specific URL only
      if (!failedUrls.has(requestUrl + '_error')) {
        failedUrls.add(requestUrl + '_error');
        console.error('[onyx-local] Error in protocol handler for URL:', requestUrl.substring(0, 100));
        if (error instanceof Error) {
          console.error('[onyx-local] Error message:', error.message);
          console.error('[onyx-local] Error stack:', error.stack?.substring(0, 200));
        } else {
          console.error('[onyx-local] Error object:', error);
        }
      }
      // Return 500 for this specific request only - don't block other images
      return new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }
  };

  // Register using modern protocol.handle() API
  try {
    protocol.handle('onyx-local', protocolHandler);
    console.log('[onyx-local] Protocol handler registered successfully (modern API)');
  } catch (e) {
    console.error('[onyx-local] Failed to register with modern API, trying legacy API:', e);
    // Fallback to legacy API - convert ProtocolRequest to Request-like object
    const protocolResult = protocol.registerFileProtocol('onyx-local', (electronRequest, callback) => {
      // Convert Electron ProtocolRequest to Fetch Request
      const fetchRequest = new Request(electronRequest.url, {
        method: electronRequest.method || 'GET',
        headers: electronRequest.headers as Record<string, string>,
      });

      protocolHandler(fetchRequest).then(response => {
        // For legacy API, we need to extract the file path from the URL
        // since Response doesn't have a path property
        const url = new URL(electronRequest.url);
        let encodedPath = url.pathname.substring(1); // Remove leading slash

        if (!encodedPath && electronRequest.url.includes('onyx-local://')) {
          const match = electronRequest.url.match(/onyx-local:\/\/\/?([^?#]+)/);
          if (match) encodedPath = match[1];
        }

        if (response.status === 200 && encodedPath) {
          try {
            // Decode the path
            let base64 = encodedPath.toUpperCase().replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const decodedPath = Buffer.from(base64, 'base64').toString('utf-8');
            let finalPath = process.platform === 'win32'
              ? decodedPath.replace(/\//g, '\\')
              : decodedPath;
            finalPath = path.normalize(finalPath);

            if (existsSync(finalPath)) {
              callback({ path: finalPath });
            } else {
              callback({ error: -6 }); // FILE_NOT_FOUND
            }
          } catch {
            callback({ error: -2 }); // FAILED
          }
        } else {
          callback({ error: response.status === 404 ? -6 : -2 });
        }
      }).catch(() => callback({ error: -2 }));
    });
    if (!protocolResult) {
      console.error('[onyx-local] Failed to register protocol handler!');
    }
  }

  // Also register on default session using modern API
  try {
    session.defaultSession.protocol.handle('onyx-local', protocolHandler);
    console.log('[onyx-local] Also registered on default session (modern API)');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/Failed to register protocol/i.test(message)) {
      console.log('[onyx-local] Default session protocol already registered; continuing.');
    } else {
      console.warn('[onyx-local] Could not register on default session:', e);
    }
  }

  // Verify registration
  const isRegistered = protocol.isProtocolRegistered('onyx-local');
  console.log(`[onyx-local] Protocol registration verified: ${isRegistered}`);
  if (!isRegistered) {
    console.error('[onyx-local] WARNING: Protocol registration check failed!');
  }
}
