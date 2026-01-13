# Onyx - Premium Unified Game Library

A modern Electron application built with React, TypeScript, Vite, and Tailwind CSS. Onyx provides a unified interface for managing games from multiple launchers (Steam, Epic, GOG, Xbox, and more).

## Build Channels

Onyx supports three separate build channels that can coexist on the same computer:

- **Development**: Local development builds (localhost)
- **Alpha**: Testing builds from the `develop` branch (installs as "Onyx Alpha" with yellow icon)
- **Production**: Stable builds from the `main` branch (installs as "Onyx")

Alpha and Production builds use different App IDs, allowing them to be installed side-by-side without conflicts. Alpha builds display a yellow "ALPHA" banner in the top-right corner for easy identification.

## Git Workflow

**All local development and testing is done on the `master` branch.**

### Pushing Alpha Builds

When ready to deploy an alpha build:

```bash
git push origin master:develop --force
```

This overwrites the `develop` branch with `master`, triggering an automatic Alpha build via GitHub Actions.

### Pushing Production Builds

Once the alpha build is tested and confirmed working:

```bash
git push origin develop:main --force
```

This overwrites the `main` branch with `develop`, triggering an automatic Production build via GitHub Actions.

## Project Structure

```
├── main/              # Electron main process (backend)
│   ├── main.ts        # Main process entry point
│   ├── preload.ts     # Preload script with ContextBridge
│   └── tsconfig.json  # TypeScript config for main process
├── renderer/          # React frontend
│   ├── src/
│   │   ├── App.tsx    # Main React component
│   │   ├── main.tsx   # React entry point
│   │   └── index.css  # Tailwind CSS imports
│   └── index.html     # HTML template
├── dist-electron/     # Compiled main process files
└── dist/              # Built renderer files (after build)
```

## Features

- ⚡ Vite for fast development and building
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for styling
- 🔒 Secure IPC communication via ContextBridge
- 🌙 Dark-themed UI
- 📦 TypeScript for type safety

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up IGDB API credentials (optional, for game metadata):
   - Copy `.env.example` to `.env`
   - Get your IGDB API credentials from https://api.igdb.com/
   - Add your `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` to the `.env` file
   ```env
   IGDB_CLIENT_ID=your_client_id_here
   IGDB_CLIENT_SECRET=your_client_secret_here
   ```

3. Build the main process:
   ```bash
   npx tsc -p main/tsconfig.json
   ```

4. Run in development mode:
   ```bash
   npm run electron:dev
   ```

   This will:
   - Start the Vite dev server on http://localhost:5173
   - Launch Electron when the server is ready
   - Open DevTools automatically

## Building

### Development Build

To build for local development:

```bash
npm run build
```

This compiles both the main process and the renderer, then you can run:

```bash
npm run electron:build
```

### Production Builds

The project supports multiple build channels:

**Alpha Build** (for testing):
```bash
npm run build:alpha
```
- Creates "Onyx Alpha" with App ID: `com.lasikiewicz.onyx.alpha`
- Includes yellow "ALPHA" banner in the UI
- Outputs to `dist/` directory

**Production Build**:
```bash
npm run build:prod
```
- Creates "Onyx" with App ID: `com.lasikiewicz.onyx`
- Standard production build
- Outputs to `dist/` directory

**Standard Distribution Build**:
```bash
npm run dist
```
- Uses default production settings
- Automatically increments build version
- Generates and validates icons

### Automated Builds via GitHub Actions

The project includes automated builds via GitHub Actions:

- **Pushing to `develop` branch**: Automatically builds Alpha version and creates a pre-release on GitHub
- **Pushing to `main` branch**: Automatically builds Production version and creates a stable release on GitHub

Releases are tagged as:
- Alpha: `alpha-v{version}` (marked as pre-release)
- Production: `v{version}` (stable release)

**Workflow:**
1. Work and test locally on `master` branch
2. Force push `master` to `develop` for Alpha builds: `git push origin master:develop --force`
3. Test the Alpha build
4. Force push `develop` to `main` for Production builds: `git push origin develop:main --force`
5. Download releases from the GitHub Releases page

### Icon Management

The project includes automatic icon validation to ensure icons always work correctly:

- **Icons are automatically validated** before builds
- **Icons are automatically generated** before distribution builds
- **Icons are validated in CI/CD** to prevent broken builds

To manually validate icons:
```bash
npm run validate-icons
```

To regenerate icons from the source SVG:
```bash
npm run generate-icons
```

See [docs/ICON_REQUIREMENTS.md](docs/ICON_REQUIREMENTS.md) for detailed icon requirements and troubleshooting.

## Scripts

### Development
- `npm run dev` - Start Vite dev server only
- `npm run build` - Build both main and renderer (validates icons automatically)
- `npm run electron:dev` - Run in development mode
- `npm run electron:build` - Run built application
- `npm run electron` - Run Electron (requires built files)

### Production Builds
- `npm run build:alpha` - Build Alpha version (Onyx Alpha)
- `npm run build:prod` - Build Production version (Onyx)
- `npm run dist` - Build distribution package (generates and validates icons automatically)

### Icons
- `npm run generate-icons` - Generate all icon formats from `resources/icon.svg`
- `npm run validate-icons` - Validate that all required icon files exist and are valid

## IPC Communication

The app uses ContextBridge for secure IPC communication. The preload script exposes safe APIs to the renderer process. You can extend `main/preload.ts` to add more IPC channels as needed.

## Window Configuration

- Default Size: 1920x1080 pixels
- Resizable: Yes
- Minimum size: 1280x720 pixels
- Theme: Dark background with gradient
- Title: Dynamically set based on build channel ("Onyx" or "Onyx Alpha")

## Build Configuration

The build configuration is managed in `electron-builder.config.js`, which supports dynamic configuration based on the `BUILD_PROFILE` environment variable:

- `BUILD_PROFILE=alpha` - Configures for Alpha builds
- `BUILD_PROFILE=production` - Configures for Production builds (default)

The configuration automatically adjusts:
- App ID (for side-by-side installation)
- Product Name (window title and installer name)
- Icon paths
- GitHub release settings
