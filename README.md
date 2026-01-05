# Electron React Vite TypeScript App

A modern Electron application built with React, TypeScript, Vite, and Tailwind CSS.

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

To build the application:

```bash
npm run build
```

This compiles both the main process and the renderer, then you can run:

```bash
npm run electron:build
```

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

- `npm run dev` - Start Vite dev server only
- `npm run build` - Build both main and renderer (validates icons automatically)
- `npm run electron:dev` - Run in development mode
- `npm run electron:build` - Run built application
- `npm run electron` - Run Electron (requires built files)
- `npm run generate-icons` - Generate all icon formats from `resources/icon.svg`
- `npm run validate-icons` - Validate that all required icon files exist and are valid
- `npm run dist` - Build distribution package (generates and validates icons automatically)

## IPC Communication

The app uses ContextBridge for secure IPC communication. The preload script exposes safe APIs to the renderer process. You can extend `main/preload.ts` to add more IPC channels as needed.

## Window Configuration

- Size: 1200x800 pixels
- Resizable: Yes
- Minimum size: 800x600 pixels
- Theme: Dark background (#1a1a1a)
