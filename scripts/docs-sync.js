const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const mapPath = path.join(repoRoot, '.agent', 'docs', 'doc-map.json');
const structurePath = path.join(repoRoot, '.agent', 'docs', 'structure.md');
const architecturePath = path.join(repoRoot, '.agent', 'docs', 'architecture.md');

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function replaceMarkerBlock(content, startMarker, endMarker, nextBlock) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`Missing marker block: ${startMarker} ... ${endMarker}`);
  }

  const before = content.slice(0, startIndex + startMarker.length);
  const after = content.slice(endIndex);
  return `${before}\n${nextBlock}\n${after}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeIfChanged(filePath, next) {
  const current = fs.readFileSync(filePath, 'utf8');
  if (current !== next) {
    fs.writeFileSync(filePath, next, 'utf8');
    return true;
  }
  return false;
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function countFilesRecursively(relativeDir, extensionPattern) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    return 0;
  }

  let total = 0;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (extensionPattern.test(entry.name)) {
        total += 1;
      }
    }
  }

  walk(absoluteDir);
  return total;
}

function buildOwnershipTable(rules) {
  const header = [
    '| Rule | File Area(s) | Required Doc(s) | Match | Scope |',
    '| --- | --- | --- | --- | --- |'
  ];

  const rows = rules
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((rule) => {
      const areas = rule.prefixes.map((prefix) => `\`${prefix}\``).join('<br>');
      const docs = Array.isArray(rule.docs)
        ? rule.docs.map((doc) => `\`${doc}\``).join('<br>')
        : `\`${rule.doc}\``;
      const matchMode = rule.matchMode === 'any' ? 'any' : 'all';
      return `| ${rule.id} | ${areas} | ${docs} | ${matchMode} | ${rule.scope} |`;
    });

  return [...header, ...rows].join('\n');
}

function buildModuleIndex() {
  const mainFileCount = countFilesRecursively('main', /\.(ts|tsx|js)$/i);
  const rendererFileCount = countFilesRecursively('renderer/src', /\.(ts|tsx|js|jsx)$/i);
  const scriptsFileCount = countFilesRecursively('scripts', /\.(ts|js)$/i);
  const workflowsFileCount = countFilesRecursively('.github/workflows', /\.(yml|yaml)$/i);

  const keyEntrypoints = [
    { label: 'Main process entry', file: 'main/main.ts' },
    { label: 'Preload bridge', file: 'main/preload.ts' },
    { label: 'Renderer app root', file: 'renderer/src/App.tsx' },
    { label: 'Electron builder config', file: 'electron-builder.config.js' }
  ];

  const lines = [
    `- Main process source files: ${mainFileCount}`,
    `- Renderer source files: ${rendererFileCount}`,
    `- Automation scripts: ${scriptsFileCount}`,
    `- GitHub workflow files: ${workflowsFileCount}`,
    '- Key entrypoints:'
  ];

  for (const item of keyEntrypoints) {
    const status = exists(item.file) ? 'present' : 'missing';
    lines.push(`  - ${item.label}: \`${item.file}\` (${status})`);
  }

  return lines.join('\n');
}

function validateDocMap(docMap) {
  if (!docMap || !Array.isArray(docMap.rules)) {
    throw new Error('Invalid doc-map.json format: expected top-level "rules" array.');
  }

  for (const rule of docMap.rules) {
    const hasDoc = typeof rule.doc === 'string' && rule.doc.trim().length > 0;
    const hasDocs = Array.isArray(rule.docs) && rule.docs.length > 0;
    if (!rule.id || !Array.isArray(rule.prefixes) || (!hasDoc && !hasDocs)) {
      throw new Error(`Invalid rule format in doc-map.json: ${JSON.stringify(rule)}`);
    }

    const docs = hasDocs ? rule.docs : [rule.doc];
    for (const doc of docs) {
      if (!exists(doc)) {
        throw new Error(`doc-map rule '${rule.id}' references missing doc: ${doc}`);
      }
    }

    if (rule.matchMode && rule.matchMode !== 'all' && rule.matchMode !== 'any') {
      throw new Error(`Invalid matchMode for rule '${rule.id}': ${rule.matchMode}`);
    }
  }
}

function main() {
  const docMap = readJson(mapPath);
  validateDocMap(docMap);

  let structure = fs.readFileSync(structurePath, 'utf8');
  let architecture = fs.readFileSync(architecturePath, 'utf8');

  const ownershipTable = buildOwnershipTable(docMap.rules);
  const lastSync = `- Synced (UTC): ${new Date().toISOString()}`;
  const moduleIndex = buildModuleIndex();

  structure = replaceMarkerBlock(
    structure,
    '<!-- AUTO-GENERATED:MAP:START -->',
    '<!-- AUTO-GENERATED:MAP:END -->',
    ownershipTable
  );

  structure = replaceMarkerBlock(
    structure,
    '<!-- AUTO-GENERATED:LAST_SYNC:START -->',
    '<!-- AUTO-GENERATED:LAST_SYNC:END -->',
    lastSync
  );

  architecture = replaceMarkerBlock(
    architecture,
    '<!-- AUTO-GENERATED:MODULE_INDEX:START -->',
    '<!-- AUTO-GENERATED:MODULE_INDEX:END -->',
    moduleIndex
  );

  const structureChanged = writeIfChanged(structurePath, structure);
  const architectureChanged = writeIfChanged(architecturePath, architecture);

  if (structureChanged || architectureChanged) {
    const changed = [
      structureChanged ? normalizePath(path.relative(repoRoot, structurePath)) : null,
      architectureChanged ? normalizePath(path.relative(repoRoot, architecturePath)) : null
    ].filter(Boolean);
    console.log(`docs:sync updated ${changed.join(', ')}`);
  } else {
    console.log('docs:sync found no documentation changes to apply.');
  }
}

try {
  main();
} catch (error) {
  console.error(`docs:sync failed: ${error.message || error}`);
  process.exit(1);
}
