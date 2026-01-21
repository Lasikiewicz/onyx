const fs = require('fs');
const path = require('path');

const roots = ['.'];
const ignoreDirs = new Set(['.git', 'node_modules', 'dist-electron', 'release', 'build', 'dist', '.github']);
// Files that intentionally contain detector patterns and should be skipped by the scan
const ignoreFiles = new Set(['secret-history-scan.js', 'secret-scan.js']);


const patterns = [
  /(?:clientId|client_id)\s*[=:]\s*['\"][^'\"]{8,}['\"]?/i,
  /(?:clientSecret|client_secret)\s*[=:]\s*['\"][^'\"]{8,}['\"]/i,
  /(?:accessToken|access_token|apiKey|API_KEY)\s*[=:]\s*['\"][^'\"]{8,}['\"]/,
  /xlji4pwi9ky847t2mc9iyx5w29kdeo/, // known leaked secret (explicit detect)
  /28m77brcpxywpuw6k9kg3rh6vzprvd/ // known leaked client id (explicit detect)
];

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip scanning the script itself to avoid self-matching of explicit patterns
    if (path.basename(filePath) === path.basename(__filename)) continue;
    // Skip files that are known detector scripts which intentionally contain test/leak patterns
    if (ignoreFiles.has(path.basename(filePath))) continue;
    // Ignore lines that reference process.env (env var usage is allowed)
    if (/process\.env/.test(line)) continue;
    for (const pat of patterns) {
      if (pat.test(line)) {
        // Ignore test markers explicitly inserted for migration tests
        if (/TEST_/.test(line)) continue;
        // Ignore lines that match constants mapping keys to camelCase placeholders like:
        //   IGDB_CLIENT_ID: 'igdbClientId', which are not secrets
        if (/^[\s\{,]*[A-Z0-9_]+\s*[:=]\s*['\"][a-z][A-Za-z0-9_]*['\"]\s*[,\}]?$/.test(line)) continue;
        console.error(`Potential secret found in ${filePath}:${i + 1}: ${line.trim()}`);
        return true;
      }
    }
  }
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (ignoreDirs.has(e.name)) continue;
      walk(path.join(dir, e.name));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      // Scan common text file types
      if (!['.js', '.ts', '.json', '.md', '.env', '.jsx', '.tsx', '.yml', '.yaml', '.html'].includes(ext)) continue;
      const filePath = path.join(dir, e.name);
      if (scanFile(filePath)) process.exitCode = 1;
    }
  }
}

for (const r of roots) walk(r);

if (process.exitCode && process.exitCode !== 0) {
  console.error('\nSecret scan failed. Remove the secret(s) and/or update patterns if false positive.');
  process.exit(process.exitCode);
} else {
  console.log('Secret scan passed. No obvious secrets found.');
}
