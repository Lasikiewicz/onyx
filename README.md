# Onyx - Premium Unified Game Library

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Platform: Windows](https://img.shields.io/badge/Platform-Windows-0078d6?logo=windows)](https://onyxlauncher.co.uk/)

A modern Electron application built with React, TypeScript, Vite, and Tailwind CSS. Onyx provides a unified interface for managing games from multiple launchers (Steam, Epic, GOG, Xbox, and more).

- **Download:** [https://onyxlauncher.co.uk/](https://onyxlauncher.co.uk/) · [GitHub Releases](https://github.com/Lasikiewicz/onyx/releases) (Windows installer)
- **Free and open source** — MIT license · [Changelog](CHANGELOG.md) / [What's new](https://github.com/Lasikiewicz/onyx/releases)

### Screenshots

| Grid View | List View |
|-----------|-----------|
| [![Grid View](website/public/Screenshots/Grid%20View.png)](website/public/Screenshots/Grid%20View.png) | [![List View](website/public/Screenshots/List%20View.png)](website/public/Screenshots/List%20View.png) |
| Logo View | Carousel View |
| [![Logo View](website/public/Screenshots/Logo%20View.png)](website/public/Screenshots/Logo%20View.png) | [![Carousel View](website/public/Screenshots/Carousel%20View.png)](website/public/Screenshots/Carousel%20View.png) |

*All four view types: Grid, List, Logo, and Carousel. See [the website](https://onyxlauncher.co.uk/) for more.*

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

2. Set up API credentials (optional, for game metadata and artwork):
   - Copy `.env.example` to `.env`
   - Add keys for the services you want (IGDB, RAWG, SteamGridDB). See [.env.example](.env.example) and the **Third-party services (APIs)** section below.
   - Example (IGDB only): get credentials from https://api.igdb.com/ and add `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` to `.env`.
   ```env
   IGDB_CLIENT_ID=your_client_id_here
   IGDB_CLIENT_SECRET=your_client_secret_here
   ```

   **Security note:** Do NOT commit real API credentials to source control. If credentials are ever committed, rotate them immediately and follow incident response procedures.

   **Credential storage:** Onyx now stores API credentials in the OS secure credential store (Windows Credential Locker, macOS Keychain, or the system secret service) when available. If the OS secure store isn't available, it will temporarily fall back to `electron-store` (not recommended).

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

## Third-party services (APIs)

Onyx uses the following third-party services for game metadata and artwork. You must obtain your own API keys and comply with each service's terms of use and rate limits.

| Service       | Purpose        | Configure in app (Settings > APIs) or via env (see `.env.example`) |
|---------------|-----------------|---------------------------------------------------------------------|
| **IGDB**      | Game metadata   | `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`                             |
| **RAWG**      | Game metadata   | `RAWG_API_KEY`                                                     |
| **SteamGridDB** | Artwork (covers, logos, etc.) | `STEAMGRIDDB_API_KEY`                        |

Do not commit real API credentials to the repository. Keys can be set in the app's Settings > APIs or via environment variables when running the app.

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
- Outputs installer and artifacts to `release/`

**Production Build**:
```bash
npm run build:prod
```
- Creates "Onyx" with App ID: `com.lasikiewicz.onyx`
- Standard production build
- Outputs installer and artifacts to `release/`

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
5. Download releases from the [GitHub Releases](https://github.com/Lasikiewicz/onyx/releases) page

*For maintainers:* "Push to git" or "push to git master" means approval to push current changes to `master` after summarizing; do not push without explicit permission.

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

### Checks (run before submitting PRs)
- `npm run scan:secrets` - Scan for committed secrets; must pass (see [scripts/secret-scan.js](scripts/secret-scan.js))
- `npm run check:no-raw-ipc` - Enforce no raw `window.ipcRenderer` in renderer (see [scripts/check-no-raw-ipc.js](scripts/check-no-raw-ipc.js))

### Maintainer scripts (GitHub API)

Scripts that call the GitHub API (e.g. `create-pr.js`, `create-pr-credentials.js`, `list-runs.js`, `post-pr-comment.js`, `fetch-failing-jobs.js`) are for maintainers of the canonical repo. They read:

- **`GHTOKEN`** (required) — GitHub token with appropriate scopes (e.g. `repo`, `workflow`).
- **`GITHUB_REPOSITORY`** (optional) — `owner/repo`; default `Lasikiewicz/onyx`. Set this when running against a fork (e.g. `youruser/onyx`).
- **`GITHUB_ISSUE_NUMBER`** (optional) — Used by `post-pr-comment.js` only; default `3`.

Do not put tokens in `.env` or commit them; set them in your shell (e.g. `$env:GHTOKEN = 'ghp_xxx'` in PowerShell). See [CONTRIBUTING.md](CONTRIBUTING.md#maintainer-only-scripts) for more.

## Disabled Features (Security)

The project contains a few features that are implemented but intentionally disabled until reviewed and validated:

- **Suspend/Resume Feature** — Implemented in `main/ProcessSuspendService.ts`, but disabled by default due to potential system-level side effects and admin requirements. See `docs/SUSPEND_FEATURE_QUICK_REFERENCE.md` for details.
- **Steam Playtime Sync** — Playtime synchronization and display logic exists but is disabled by default. See `docs/STEAM_PLAYTIME_QUICK_REFERENCE.md` for details.

These features are gated behind explicit enablement steps and require additional testing and documentation before being turned on in production.

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

## Community

- **Main website:** [https://onyxlauncher.co.uk/](https://onyxlauncher.co.uk/)
- Discord and Ko-fi links in the app and on the website point to the official Onyx project. If you fork the repository and publish your own builds, you can replace these links in the app (e.g. in Settings) and in the `website/` source.

## Contributing and community docs

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — How to run the app, get API keys, and submit PRs (including required checks).
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — Community standards and enforcement.
- **[SECURITY.md](SECURITY.md)** — How to report security vulnerabilities (do not open public issues for security-sensitive bugs).

## License

MIT — see [LICENSE](LICENSE) for the full text.
