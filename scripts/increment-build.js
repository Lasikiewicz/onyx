import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');

// Read package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Parse current version
const versionParts = packageJson.version.split('.');
const major = parseInt(versionParts[0]) || 0;
const minor = parseInt(versionParts[1]) || 0;
const patch = parseInt(versionParts[2]) || 0;

// Increment patch version (build number)
const newVersion = `${major}.${minor}.${patch + 1}`;

// Update version
packageJson.version = newVersion;

// Write back to package.json
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

console.log(`✓ Version incremented: ${packageJson.version.split('.').slice(0, 2).join('.')}.${patch} → ${newVersion}`);
