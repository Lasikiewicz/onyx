import { promises as fsp } from 'node:fs';
import path from 'node:path';

interface EpicManifestSummary {
  AppName?: unknown;
  InstallLocation?: unknown;
}

/**
 * The Epic AppName for the game installed in `installDir`, from its manifest's InstallLocation.
 * Matching ignores case and slash style, and ignores a trailing separator.
 */
export function findEpicAppName(manifests: EpicManifestSummary[], installDir: string): string | undefined {
  const normalize = (value: string) => value.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
  const target = normalize(installDir);
  if (!target) return undefined;

  for (const manifest of manifests) {
    const location = manifest.InstallLocation;
    const appName = manifest.AppName;
    if (typeof location !== 'string' || typeof appName !== 'string' || appName.length === 0) continue;
    if (normalize(location) === target) return appName;
  }
  return undefined;
}

/** Epic's manifest folder, under ProgramData on Windows. */
export function epicManifestsDir(): string {
  return path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
}

/**
 * Read every Epic `.item` manifest and return the AppName for `installDir`. Returns undefined when
 * the folder is missing or nothing matches. Used at launch for games imported before the AppName
 * was stored as `launchUri` (A6).
 */
export async function lookupEpicAppName(installDir: string): Promise<string | undefined> {
  let manifests: EpicManifestSummary[] = [];
  try {
    const dir = epicManifestsDir();
    const files = (await fsp.readdir(dir)).filter((file) => file.endsWith('.item'));
    manifests = await Promise.all(
      files.map(async (file) => {
        try {
          return JSON.parse(await fsp.readFile(path.join(dir, file), 'utf-8')) as EpicManifestSummary;
        } catch {
          return {};
        }
      }),
    );
  } catch {
    return undefined;
  }
  return findEpicAppName(manifests, installDir);
}
