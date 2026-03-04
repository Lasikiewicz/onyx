#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function normalizeVersion(input) {
  return String(input || '').trim().replace(/^v/i, '').split('-')[0];
}

function compareVersions(a, b) {
  const pa = normalizeVersion(a).split('.').map((v) => Number(v) || 0);
  const pb = normalizeVersion(b).split('.').map((v) => Number(v) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function parseSections(changelogContent) {
  const headerRegex = /^##\s+\[(.+?)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?.*$/gm;
  const matches = [...changelogContent.matchAll(headerRegex)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? changelogContent.length) : changelogContent.length;
    const header = match[0];
    const version = String(match[1] || '').trim();
    const date = match[2] ? String(match[2]).trim() : '';
    const body = changelogContent.slice(start + header.length, end).trim();
    const bullets = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())
      .filter(Boolean);
    return { version, date, header, body, bullets };
  });
}

function formatCleanDraft(targetVersion, bullets, includedVersions) {
  const lines = [];
  lines.push(`## Onyx v${normalizeVersion(targetVersion)}`);
  lines.push('');
  lines.push('### ✨ What\'s Changed');
  if (bullets.length === 0) {
    lines.push('- Internal maintenance and quality improvements.');
  } else {
    for (const bullet of bullets) lines.push(`- ${bullet}`);
  }

  if (includedVersions.length > 1) {
    lines.push('');
    lines.push('### 📦 Included Versions');
    for (const version of includedVersions) {
      lines.push(`- v${normalizeVersion(version)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function unique(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv);
  const mode = String(args.mode || 'alpha').toLowerCase();
  if (mode !== 'alpha' && mode !== 'main') {
    throw new Error(`Invalid --mode \"${mode}\". Use alpha or main.`);
  }

  const changelogPath = path.resolve(process.cwd(), String(args.changelog || 'CHANGELOG.md'));
  if (!fs.existsSync(changelogPath)) {
    throw new Error(`CHANGELOG not found at ${changelogPath}`);
  }

  const content = fs.readFileSync(changelogPath, 'utf8');
  const sections = parseSections(content)
    .filter((section) => {
      const key = section.version.toLowerCase();
      return key !== 'pending' && key !== 'unreleased';
    });

  if (sections.length === 0) {
    throw new Error('No released sections found in CHANGELOG.md');
  }

  const latest = sections[0].version;
  const toVersion = normalizeVersion(String(args.to || latest));

  if (mode === 'alpha') {
    const target = sections.find((section) => normalizeVersion(section.version) === toVersion);
    if (!target) {
      throw new Error(`Version ${toVersion} not found in CHANGELOG.md`);
    }

    const markdown = formatCleanDraft(target.version, unique(target.bullets), [target.version]);
    if (args.out) {
      const outPath = path.resolve(process.cwd(), String(args.out));
      fs.writeFileSync(outPath, markdown, 'utf8');
      process.stdout.write(`Wrote ${outPath}\n`);
      return;
    }
    process.stdout.write(markdown);
    return;
  }

  const fromVersionRaw = String(args.from || '').trim();
  if (!fromVersionRaw) {
    throw new Error('Main mode requires --from <last-production-version>.');
  }
  const fromVersion = normalizeVersion(fromVersionRaw);

  const ranged = sections.filter((section) => {
    const current = normalizeVersion(section.version);
    return compareVersions(current, fromVersion) > 0 && compareVersions(current, toVersion) <= 0;
  });

  if (ranged.length === 0) {
    throw new Error(`No changelog sections found in range (${fromVersion}, ${toVersion}]`);
  }

  const allBullets = unique(ranged.flatMap((section) => section.bullets));
  const includedVersions = ranged.map((section) => section.version);
  const markdown = formatCleanDraft(toVersion, allBullets, includedVersions);

  if (args.out) {
    const outPath = path.resolve(process.cwd(), String(args.out));
    fs.writeFileSync(outPath, markdown, 'utf8');
    process.stdout.write(`Wrote ${outPath}\n`);
    return;
  }

  process.stdout.write(markdown);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`release-notes error: ${message}\n`);
  process.exit(1);
}
