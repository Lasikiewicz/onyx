#!/usr/bin/env node

/**
 * Icon validation script.
 *
 * Validates that the required icon files exist and are not obviously corrupted
 * before local builds and packaging steps run.
 */

import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const requiredIcons = {
  sourceSvg: {
    path: join(projectRoot, 'resources', 'icon.svg'),
    name: 'resources/icon.svg',
    required: true,
    description: 'Source SVG icon (used to generate other formats)',
  },
  sourcePng: {
    path: join(projectRoot, 'resources', 'icon.png'),
    name: 'resources/icon.png',
    required: true,
    description: 'Source PNG icon (used for development and as fallback)',
  },
  buildIco: {
    path: join(projectRoot, 'build', 'icon.ico'),
    name: 'build/icon.ico',
    required: true,
    description: 'Windows ICO file (required for Windows builds)',
  },
  buildPng: {
    path: join(projectRoot, 'build', 'icon.png'),
    name: 'build/icon.png',
    required: false,
    description: 'Build PNG icon (optional)',
  },
};

const minFileSizes = {
  '.svg': 100,
  '.png': 1000,
  '.ico': 2000,
};

function getFileExtension(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext ? `.${ext}` : '';
}

function validateIconFile(iconConfig) {
  const errors = [];
  const warnings = [];

  if (!existsSync(iconConfig.path)) {
    if (iconConfig.required) {
      errors.push(`Missing required icon: ${iconConfig.name} - ${iconConfig.description}`);
    } else {
      warnings.push(`Missing optional icon: ${iconConfig.name} - ${iconConfig.description}`);
    }
    return { errors, warnings };
  }

  try {
    const stats = statSync(iconConfig.path);
    const ext = getFileExtension(iconConfig.path);
    const minSize = minFileSizes[ext] || 100;

    if (stats.size < minSize) {
      errors.push(
        `Icon file too small: ${iconConfig.name} (${stats.size} bytes, expected at least ${minSize} bytes)`,
      );
    } else {
      console.log(`OK ${iconConfig.name} exists (${(stats.size / 1024).toFixed(2)} KB)`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Error reading icon file ${iconConfig.name}: ${message}`);
  }

  return { errors, warnings };
}

function validateIcons() {
  console.log('Validating icon files...\n');

  const allErrors = [];
  const allWarnings = [];

  for (const config of Object.values(requiredIcons)) {
    const { errors, warnings } = validateIconFile(config);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }

  console.log('');

  if (allWarnings.length > 0) {
    console.log('Warnings:');
    allWarnings.forEach((warning) => console.log(`  ${warning}`));
    console.log('');
  }

  if (allErrors.length > 0) {
    console.error('Icon validation failed.\n');
    console.error('Errors:');
    allErrors.forEach((error) => console.error(`  ${error}`));
    console.error('\nTo fix:');
    console.error('  1. Run: npm run generate-icons');
    console.error('  2. Ensure resources/icon.svg exists');
    console.error('  3. Rebuild the application\n');
    process.exit(1);
  }

  console.log('All required icon files are valid.\n');
}

try {
  validateIcons();
} catch (error) {
  console.error('Icon validation script failed:', error);
  process.exit(1);
}
