#!/usr/bin/env node

/**
 * Icon Validation Script
 * 
 * This script validates that all required icon files exist and are properly formatted.
 * It should be run before building to ensure icons will work correctly.
 */

import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Required icon files and their expected locations
const requiredIcons = {
  // Source files
  sourceSvg: {
    path: join(projectRoot, 'resources', 'icon.svg'),
    name: 'resources/icon.svg',
    required: true,
    description: 'Source SVG icon (used to generate other formats)'
  },
  sourcePng: {
    path: join(projectRoot, 'resources', 'icon.png'),
    name: 'resources/icon.png',
    required: true,
    description: 'Source PNG icon (used for development and as fallback)'
  },
  // Build output files
  buildIco: {
    path: join(projectRoot, 'build', 'icon.ico'),
    name: 'build/icon.ico',
    required: true,
    description: 'Windows ICO file (required for Windows builds)'
  },
  buildPng: {
    path: join(projectRoot, 'build', 'icon.png'),
    name: 'build/icon.png',
    required: false,
    description: 'Build PNG icon (optional)'
  }
};

// Minimum file sizes (in bytes) to ensure files aren't empty or corrupted
const minFileSizes = {
  '.svg': 100,   // SVG should be at least 100 bytes
  '.png': 1000,  // PNG should be at least 1KB
  '.ico': 2000   // ICO should be at least 2KB (contains multiple sizes)
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
      errors.push(`❌ Missing required icon: ${iconConfig.name} - ${iconConfig.description}`);
    } else {
      warnings.push(`⚠️  Missing optional icon: ${iconConfig.name} - ${iconConfig.description}`);
    }
    return { errors, warnings };
  }
  
  // Check file size
  try {
    const stats = statSync(iconConfig.path);
    const ext = getFileExtension(iconConfig.path);
    const minSize = minFileSizes[ext] || 100;
    
    if (stats.size < minSize) {
      errors.push(
        `❌ Icon file too small: ${iconConfig.name} (${stats.size} bytes, expected at least ${minSize} bytes)`
      );
    } else {
      console.log(`✓ ${iconConfig.name} exists (${(stats.size / 1024).toFixed(2)} KB)`);
    }
  } catch (error) {
    errors.push(`❌ Error reading icon file ${iconConfig.name}: ${error.message}`);
  }
  
  return { errors, warnings };
}

function validateIcons() {
  console.log('🔍 Validating icon files...\n');
  
  const allErrors = [];
  const allWarnings = [];
  
  // Validate all icon files
  for (const [key, config] of Object.entries(requiredIcons)) {
    const { errors, warnings } = validateIconFile(config);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }
  
  // Print results
  console.log('');
  
  if (allWarnings.length > 0) {
    console.log('⚠️  Warnings:');
    allWarnings.forEach(warning => console.log(`  ${warning}`));
    console.log('');
  }
  
  if (allErrors.length > 0) {
    console.error('❌ Icon validation failed!\n');
    console.error('Errors:');
    allErrors.forEach(error => console.error(`  ${error}`));
    console.error('\n💡 To fix:');
    console.error('  1. Run: npm run generate-icons');
    console.error('  2. Ensure resources/icon.svg exists');
    console.error('  3. Rebuild the application\n');
    process.exit(1);
  }
  
  console.log('✅ All required icon files are valid!\n');
  return true;
}

// Run validation
try {
  validateIcons();
} catch (error) {
  console.error('❌ Icon validation script failed:', error);
  process.exit(1);
}
