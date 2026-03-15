const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const mapPath = path.join(repoRoot, '.agent', 'docs', 'doc-map.json');
const requiredFeatureDocHeadings = [
  '## What This Feature Does',
  '## User-Facing Surfaces',
  '## Settings and Toggles',
  '## Confirmed End-to-End Flows',
  '## Discovery and Data Sources',
  '## Data Model and Persistence',
  '## Failure Modes and Triage',
  '## File Ownership Map'
];

function normalizePath(value) {
  return value.replace(/\\/g, '/').trim();
}

function getStagedFiles() {
  const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  return output
    .split(/\r?\n/)
    .map((line) => normalizePath(line))
    .filter(Boolean);
}

function getFilesAgainstRef(baseRef) {
  const output = execSync(`git diff --name-only --diff-filter=ACMR ${baseRef}...HEAD`, {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  return output
    .split(/\r?\n/)
    .map((line) => normalizePath(line))
    .filter(Boolean);
}

function parseAgainstRefArg(argv) {
  const index = argv.indexOf('--against');
  if (index === -1) {
    return null;
  }

  if (index === argv.length - 1) {
    throw new Error('Missing value for --against argument.');
  }

  return argv[index + 1];
}

function readDocMap() {
  const parsed = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error('Invalid doc-map.json: missing rules array.');
  }
  return parsed;
}

function isDocumentationFile(filePath) {
  if (filePath.endsWith('.md')) {
    return true;
  }

  return (
    filePath.startsWith('.agent/docs/') ||
    filePath.startsWith('docs/')
  );
}

function isIgnoredFile(filePath) {
  const ignoredPrefixes = [
    'dist/',
    'dist-electron/',
    'tmp/',
    'tmp_latest/',
    'tmp_latest2/',
    'tmp_latest3/',
    'debug-logs/',
    'release/',
    'build/',
    'node_modules/'
  ];

  return ignoredPrefixes.some((prefix) => filePath.startsWith(prefix));
}

function matchesPrefix(filePath, prefix) {
  const normalizedPrefix = normalizePath(prefix);
  if (normalizedPrefix.endsWith('/')) {
    return filePath.startsWith(normalizedPrefix);
  }

  return filePath === normalizedPrefix || filePath.startsWith(`${normalizedPrefix}/`);
}

function findMatchingRules(filePath, rules) {
  return rules.filter((rule) => rule.prefixes.some((prefix) => matchesPrefix(filePath, prefix)));
}

function getRuleDocs(rule) {
  if (Array.isArray(rule.docs)) {
    return rule.docs.map((doc) => normalizePath(doc));
  }

  if (rule.doc) {
    return [normalizePath(rule.doc)];
  }

  throw new Error(`Invalid rule '${rule.id}': expected 'doc' or 'docs'.`);
}

function isFeatureDoc(filePath) {
  if (!filePath.startsWith('docs/features/')) {
    return false;
  }

  const base = path.basename(filePath);
  if (base === 'README.md' || base === 'FEATURE_DOC_STANDARD.md') {
    return false;
  }

  return base.endsWith('.md');
}

function validateFeatureDocStructure(filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const missing = requiredFeatureDocHeadings.filter((heading) => !content.includes(heading));
  return {
    filePath,
    missing
  };
}

function main() {
  const againstRef = parseAgainstRefArg(process.argv.slice(2));
  const stagedFiles = againstRef ? getFilesAgainstRef(againstRef) : getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log('docs:check skipped (no staged files).');
    return;
  }

  const docMap = readDocMap();
  const requiredDocs = new Set();
  const anyOfGroups = [];
  const codeFiles = [];
  const unmatched = [];

  for (const file of stagedFiles) {
    if (isIgnoredFile(file) || isDocumentationFile(file)) {
      continue;
    }

    codeFiles.push(file);
    const matchedRules = findMatchingRules(file, docMap.rules);

    if (matchedRules.length === 0) {
      unmatched.push(file);
      continue;
    }

    for (const rule of matchedRules) {
      const docs = getRuleDocs(rule);
      const matchMode = rule.matchMode === 'any' ? 'any' : 'all';

      if (matchMode === 'any') {
        anyOfGroups.push({
          ruleId: rule.id,
          docs
        });
      } else {
        for (const docPath of docs) {
          requiredDocs.add(docPath);
        }
      }
    }
  }

  if (codeFiles.length === 0) {
    console.log('docs:check passed (staged changes are docs/ignored files only).');
    return;
  }

  const stagedSet = new Set(stagedFiles.map((value) => normalizePath(value)));
  const missingDocs = Array.from(requiredDocs).filter((docPath) => !stagedSet.has(docPath));
  const missingAnyGroups = anyOfGroups.filter((group) => !group.docs.some((docPath) => stagedSet.has(docPath)));
  const stagedFeatureDocs = stagedFiles.filter((file) => isFeatureDoc(file));
  const invalidFeatureDocs = stagedFeatureDocs
    .map((file) => validateFeatureDocStructure(file))
    .filter((result) => result.missing.length > 0);

  if (missingDocs.length > 0 || missingAnyGroups.length > 0 || invalidFeatureDocs.length > 0) {
    console.error('docs:check failed. Missing required doc updates for staged code changes.');
    console.error('');
    if (missingDocs.length > 0) {
      console.error('Required docs not staged:');
      for (const doc of missingDocs) {
        console.error(`  - ${doc}`);
      }
      console.error('');
    }

    if (missingAnyGroups.length > 0) {
      console.error('Required doc groups missing (at least one doc from each group must be staged):');
      for (const group of missingAnyGroups) {
        console.error(`  - Rule ${group.ruleId}:`);
        for (const doc of group.docs) {
          console.error(`    - ${doc}`);
        }
      }
      console.error('');
    }

    if (invalidFeatureDocs.length > 0) {
      console.error('Feature docs missing required sections:');
      for (const invalid of invalidFeatureDocs) {
        console.error(`  - ${invalid.filePath}`);
        for (const heading of invalid.missing) {
          console.error(`    - Missing heading: ${heading}`);
        }
      }
      console.error('');
      console.error('See docs/features/FEATURE_DOC_STANDARD.md for required structure.');
      console.error('');
    }

    console.error('Staged code files:');
    for (const file of codeFiles) {
      console.error(`  - ${file}`);
    }
    console.error('');
    console.error('Action: update and stage the required docs before committing.');
    process.exit(1);
  }

  if (unmatched.length > 0) {
    console.warn('docs:check warning. Some staged files are not mapped in .agent/docs/doc-map.json:');
    for (const file of unmatched) {
      console.warn(`  - ${file}`);
    }
    console.warn('Consider extending the map to keep coverage complete.');
  }

  console.log('docs:check passed. Required documentation updates are staged.');
}

try {
  main();
} catch (error) {
  console.error(`docs:check failed: ${error.message || error}`);
  process.exit(1);
}
