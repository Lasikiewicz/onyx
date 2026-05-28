const normalizePathSeparators = (value: string): string => value.replace(/\\/g, '/');

const normalizeToken = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const getFileName = (exePath: string): string => {
  const parts = normalizePathSeparators(exePath).split('/');
  return parts[parts.length - 1] || '';
};

const getBaseName = (exePath: string): string => getFileName(exePath).replace(/\.exe$/i, '');

const stripUnrealShippingSuffix = (baseName: string): string =>
  baseName.replace(/-(?:win64|win32|wingdk|linux|mac)-shipping$/i, '').replace(/-shipping$/i, '');

export function isUnrealShippingExecutable(exePath: string): boolean {
  const normalizedPath = normalizePathSeparators(exePath).toLowerCase();
  const fileName = getFileName(exePath).toLowerCase();

  return normalizedPath.includes('/binaries/') && /(?:-shipping|-(?:win64|win32|wingdk|linux|mac)-shipping)\.exe$/.test(fileName);
}

export function getUnrealShippingRootDirectory(exePath: string): string | undefined {
  if (!isUnrealShippingExecutable(exePath)) {
    return undefined;
  }

  const parts = normalizePathSeparators(exePath).split('/');
  const binariesIndex = parts.findIndex((part) => part.toLowerCase() === 'binaries');
  if (binariesIndex <= 0) {
    return undefined;
  }

  return parts.slice(0, binariesIndex).join('/');
}

function getRelativeDepth(exePath: string, gameDir: string): number {
  const normalizedExe = normalizePathSeparators(exePath).toLowerCase();
  const normalizedDir = normalizePathSeparators(gameDir).replace(/\/+$/, '').toLowerCase();
  const relativePath = normalizedExe.startsWith(normalizedDir)
    ? normalizedExe.slice(normalizedDir.length).replace(/^\/+/, '')
    : normalizedExe;

  return relativePath.split('/').filter(Boolean).length;
}

function getExecutableScore(exePath: string, gameDir: string, gameTitle: string): number {
  const normalizedPath = normalizePathSeparators(exePath).toLowerCase();
  const baseName = getBaseName(exePath);
  const normalizedBase = normalizeToken(baseName);
  const normalizedShippingBase = normalizeToken(stripUnrealShippingSuffix(baseName));
  const normalizedTitle = normalizeToken(gameTitle);
  let score = 0;

  if (isUnrealShippingExecutable(exePath)) {
    score += 1000;

    if (normalizedPath.includes('/binaries/win64/')) {
      score += 100;
    } else if (normalizedPath.includes('/binaries/win32/')) {
      score += 50;
    }
  }

  if (normalizedTitle) {
    if (normalizedBase === normalizedTitle) {
      score += 600;
    } else if (normalizedShippingBase === normalizedTitle) {
      score += 550;
    } else if (normalizedBase.includes(normalizedTitle) || normalizedTitle.includes(normalizedBase)) {
      score += 250;
    } else if (normalizedShippingBase.includes(normalizedTitle) || normalizedTitle.includes(normalizedShippingBase)) {
      score += 225;
    }
  }

  if (normalizedPath.includes('/binaries/')) {
    score += 25;
  }

  score -= getRelativeDepth(exePath, gameDir);
  return score;
}

export function selectBestGameExecutable(
  exePaths: string[],
  gameDir: string,
  gameTitle: string,
): string | undefined {
  return [...exePaths].sort((a, b) => {
    const scoreDiff = getExecutableScore(b, gameDir, gameTitle) - getExecutableScore(a, gameDir, gameTitle);
    if (scoreDiff !== 0) return scoreDiff;

    const depthDiff = getRelativeDepth(a, gameDir) - getRelativeDepth(b, gameDir);
    if (depthDiff !== 0) return depthDiff;

    return a.localeCompare(b);
  })[0];
}
