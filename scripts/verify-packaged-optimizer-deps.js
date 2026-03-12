const fs = require('node:fs');
const path = require('node:path');

function collectUnpackedDirs(rootDir) {
  const results = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.name === 'app.asar.unpacked' && fullPath.includes(`${path.sep}resources${path.sep}`)) {
        results.push(fullPath);
      } else {
        stack.push(fullPath);
      }
    }
  }

  return results;
}

function hasPath(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function verifyRoot(unpackedRoot) {
  const required = [
    { key: 'worker', variants: ['ImageOptimizerWorker.worker.js', 'dist-electron/ImageOptimizerWorker.worker.js'] },
  ];

  const recommended = [
    { key: 'sharp', variants: ['node_modules/sharp'] },
    { key: 'detect-libc', variants: ['node_modules/detect-libc'] },
    { key: '@img', variants: ['node_modules/@img'] },
    {
      key: 'semver',
      variants: ['node_modules/semver', 'node_modules/sharp/node_modules/semver'],
    },
  ];

  const missing = [];
  for (const requirement of required) {
    const found = requirement.variants.some((variant) => hasPath(unpackedRoot, variant));
    if (!found) {
      missing.push(`${requirement.key} (${requirement.variants.join(' OR ')})`);
    }
  }

  for (const requirement of recommended) {
    const found = requirement.variants.some((variant) => hasPath(unpackedRoot, variant));
    if (!found) {
      console.warn(
        `[verify:packaged-optimizer] Warning: optional dependency not unpacked under ${unpackedRoot}: ${requirement.key} (${requirement.variants.join(
          ' OR '
        )})`
      );
    }
  }

  return missing;
}

function main() {
  const releaseDir = path.resolve(process.cwd(), 'release');
  if (!fs.existsSync(releaseDir)) {
    console.error('[verify:packaged-optimizer] Missing release directory:', releaseDir);
    process.exit(1);
  }

  const unpackedDirs = collectUnpackedDirs(releaseDir);
  if (unpackedDirs.length === 0) {
    console.error('[verify:packaged-optimizer] No app.asar.unpacked directories found under release output.');
    process.exit(1);
  }

  const failures = [];
  for (const unpackedRoot of unpackedDirs) {
    const missing = verifyRoot(unpackedRoot);
    if (missing.length > 0) {
      failures.push({ unpackedRoot, missing });
    }
  }

  if (failures.length > 0) {
    console.error('[verify:packaged-optimizer] Missing optimizer runtime dependencies in packaged output:');
    for (const failure of failures) {
      console.error(`- ${failure.unpackedRoot}`);
      for (const item of failure.missing) {
        console.error(`  - ${item}`);
      }
    }
    process.exit(1);
  }

  console.log('[verify:packaged-optimizer] Packaged optimizer dependencies verified.');
}

main();
