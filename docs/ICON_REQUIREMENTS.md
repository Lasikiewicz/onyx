# Icon Requirements

This document outlines the icon requirements for the Onyx launcher application.

## Required Icon Files

### Source Files (in `resources/`)
- **`icon.svg`** - Source vector icon (required)
  - Used to generate all other icon formats
  - Should be a clean, scalable SVG
  
- **`icon.png`** - Source raster icon (required)
  - Used as fallback and for development
  - Recommended size: 512x512 or larger

### Build Files (in `build/`)
- **`icon.ico`** - Windows icon file (required)
  - Contains multiple sizes (16x16, 32x32, 48x48, 256x256)
  - Used for Windows taskbar, system tray, and executable icon
  - Generated automatically from `icon.svg`

- **`icon.png`** - Build PNG icon (optional)
  - Used as fallback in some contexts

- **`icon.icns`** - macOS icon file (optional)
  - Only needed if building for macOS
  - Generated automatically from `icon.svg`

## Icon Validation

The project includes automatic icon validation that runs:

1. **Before building** (`npm run build` or `npm run dist`)
   - Validates all required icon files exist
   - Checks file sizes to ensure they're not corrupted
   - Prevents builds with missing or invalid icons

2. **In CI/CD** (GitHub Actions)
   - Validates icons on pull requests and pushes
   - Ensures icon files are always valid

3. **Manually** (`npm run validate-icons`)
   - Can be run anytime to check icon status

## Generating Icons

To generate all icon files from the source SVG:

```bash
npm run generate-icons
```

This will:
1. Convert `resources/icon.svg` to `resources/icon.png`
2. Generate `build/icon.ico` (Windows)
3. Generate `build/icon.icns` (macOS, if on macOS)

## Icon Usage

### Windows
- **Taskbar**: Uses icon embedded in executable (from `build/icon.ico`)
- **System Tray**: Uses `icon.ico` or `icon.png` from resources folder
- **Window Icon**: Uses `icon.ico` or `icon.png` from resources folder

### Development
- Icons are loaded from `build/` or `resources/` folders
- Falls back to PNG if ICO is not available

## Troubleshooting

### Icons not showing in taskbar/tray

1. **Run validation**:
   ```bash
   npm run validate-icons
   ```

2. **Regenerate icons**:
   ```bash
   npm run generate-icons
   ```

3. **Check file sizes**:
   - ICO files should be at least 2KB
   - PNG files should be at least 1KB
   - SVG files should be at least 100 bytes

4. **Clear Windows icon cache** (Windows only):
   - Restart Windows Explorer
   - Or run: `ie4uinit.exe -show` (as Administrator)

5. **Rebuild the application**:
   ```bash
   npm run dist
   ```

## Best Practices

1. **Always validate before committing**:
   ```bash
   npm run validate-icons
   ```

2. **Update source SVG first**:
   - Edit `resources/icon.svg`
   - Then run `npm run generate-icons`
   - Then validate with `npm run validate-icons`

3. **Don't edit generated files directly**:
   - Only edit `resources/icon.svg`
   - Regenerate other formats as needed

4. **Test icons after changes**:
   - Build the application
   - Verify icons appear in taskbar and tray
   - Test on target platform

## File Locations

```
project-root/
├── resources/
│   ├── icon.svg      (source - edit this)
│   └── icon.png      (source - generated from SVG)
├── build/
│   ├── icon.ico      (Windows - generated)
│   ├── icon.png      (optional - generated)
│   └── icon.icns     (macOS - generated)
└── scripts/
    ├── generate-icons.js    (generates icons)
    └── validate-icons.js    (validates icons)
```

## Integration

Icons are automatically:
- ✅ Validated before builds (`prebuild` hook)
- ✅ Generated and validated before distribution builds (`predist` hook)
- ✅ Validated in CI/CD pipelines
- ✅ Included in packaged app via `extraResources` in `package.json`
