import sharp from 'sharp';
import png2icons from 'png2icons';
import { mkdir, access, constants } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceIconPath = 'resources/icon.svg';
const pngIconPath = 'resources/icon.png';
const buildDir = 'build';
const icoOutputPath = `${buildDir}/icon.ico`;
const icnsOutputPath = `${buildDir}/icon.icns`;

/**
 * Converts SVG to PNG if needed
 */
async function convertSvgToPng() {
  try {
    await access(sourceIconPath, constants.F_OK);
    console.log(`Source SVG icon found at ${sourceIconPath}`);
    
    // Convert SVG to PNG for use in icon generation
    await sharp(sourceIconPath)
      .png()
      .resize(512, 512)
      .toFile(pngIconPath);
    
    console.log(`✓ Converted SVG to PNG at ${pngIconPath}`);
    return true;
  } catch (error) {
    console.error(`Error converting SVG to PNG: ${error.message}`);
    throw error;
  }
}

/**
 * Converts PNG to ICO format for Windows
 */
async function generateIco() {
  try {
    const pngBuffer = await sharp(pngIconPath).png().toBuffer();
    const icoBuffer = png2icons.createICO(pngBuffer, png2icons.BILINEAR, 0);
    
    // Ensure build directory exists
    await mkdir(buildDir, { recursive: true });
    
    // Write ICO file
    const fs = await import('fs/promises');
    await fs.writeFile(icoOutputPath, icoBuffer);
    console.log(`✓ Generated ${icoOutputPath}`);
  } catch (error) {
    console.error(`Error generating ICO: ${error.message}`);
    throw error;
  }
}

/**
 * Converts PNG to ICNS format for macOS
 */
async function generateIcns() {
  try {
    const pngBuffer = await sharp(pngIconPath).png().toBuffer();
    const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.BILINEAR);
    
    // Ensure build directory exists
    await mkdir(buildDir, { recursive: true });
    
    // Write ICNS file
    const fs = await import('fs/promises');
    await fs.writeFile(icnsOutputPath, icnsBuffer);
    console.log(`✓ Generated ${icnsOutputPath}`);
  } catch (error) {
    console.error(`Error generating ICNS: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to generate all icon formats
 */
async function generateIcons() {
  try {
    console.log('Generating icons...\n');
    
    // Convert SVG to PNG first
    await convertSvgToPng();
    
    // Generate ICO for Windows
    await generateIco();
    
    // Generate ICNS for macOS
    await generateIcns();
    
    console.log('\n✓ All icons generated successfully!');
  } catch (error) {
    console.error('\n✗ Error generating icons:', error);
    process.exit(1);
  }
}

// Run if called directly
generateIcons();
