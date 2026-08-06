const path = require('path');

// Get build profile from environment variable (default to 'production')
const BUILD_PROFILE = process.env.BUILD_PROFILE || 'production';

// Determine configuration based on build profile
const isAlpha = BUILD_PROFILE === 'alpha';

const config = {
  appId: isAlpha ? 'com.lasikiewicz.onyx.alpha' : 'com.lasikiewicz.onyx',
  productName: isAlpha ? 'Onyx Alpha' : 'Onyx',
  directories: {
    output: 'release'
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    requestedExecutionLevel: 'asInvoker',
    executableName: isAlpha ? 'OnyxAlpha' : 'Onyx',
    // Use dots to match GitHub release asset names (e.g. Onyx.Setup.0.3.16.exe)
    artifactName: isAlpha ? "Onyx.Alpha.Setup.${version}.${ext}" : "Onyx.Setup.${version}.${ext}",
    icon: 'build/icon.ico',
    verifyUpdateCodeSignature: false
  },
  linux: {
    // AppImage first: it is the only Linux artifact the in-app updater can replace in place, since
    // .deb/.rpm updates have to go through the system package manager.
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'rpm',
        arch: ['x64']
      }
    ],
    // Lowercase, no spaces: this becomes the binary name on PATH and the .desktop Exec value.
    executableName: isAlpha ? 'onyx-alpha' : 'onyx',
    artifactName: isAlpha ? "Onyx.Alpha.${version}.${ext}" : "Onyx.${version}.${ext}",
    // electron-builder derives the full Linux icon set from this 512x512 PNG.
    icon: 'build/icon.png',
    category: 'Game',
    synopsis: 'The premium unified game library.',
    description: 'Onyx is a unified game library that aggregates games from Steam, Heroic (Epic and GOG), Lutris, Bottles and itch.io.',
    // deb and rpm both require a maintainer in "Name <email>" form, and it is embedded in the
    // published package metadata. Defaults to the project's GitHub noreply address so no personal
    // address is shipped; override with LINUX_MAINTAINER rather than editing this file.
    maintainer: process.env.LINUX_MAINTAINER || 'Lasikiewicz <Lasikiewicz@users.noreply.github.com>',
    desktop: {
      entry: {
        Name: isAlpha ? 'Onyx Alpha' : 'Onyx',
        Categories: 'Game;Utility;',
        // Lets the desktop environment match the window to this launcher entry.
        StartupWMClass: isAlpha ? 'onyx-alpha' : 'onyx'
      }
    }
  },
  // macOS is still out of scope: the app has no signing/notarization setup and no macOS launcher
  // integrations exist.
  mac: null,
  // Disable code signing completely
  forceCodeSigning: false,
  files: [
    'dist/**/*',
    'dist-electron/**/*.js',
    '!dist-electron/**/*.d.ts',
    '!dist-electron/**/*.tsbuildinfo',
    // Include all runtime dependencies; specific native modules are unpacked via asarUnpack
    'node_modules/**/*',
    'package.json',
    'CHANGELOG.md'
  ],
  extraResources: [
    {
      from: 'build/icon.ico',
      to: 'icon.ico'
    },
    {
      from: 'resources/icon.png',
      to: 'icon.png'
    },
    {
      from: 'resources/icon.svg',
      to: 'icon.svg'
    }
  ],
  asar: true,
  asarUnpack: [
    'dist-electron/ImageOptimizerWorker.worker.js',
    'node_modules/sharp/**',
    'node_modules/semver/**',
    'node_modules/detect-libc/**',
    'node_modules/@img/**'
  ],
  compression: 'maximum',
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    perMachine: false,
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,
    shortcutName: isAlpha ? 'Onyx Alpha' : 'Onyx',
    uninstallDisplayName: isAlpha ? 'Onyx Alpha' : 'Onyx',
    include: "build/installer.nsh"
  },
  publish: {
    provider: 'github',
    owner: 'Lasikiewicz',
    repo: 'onyx'
  }
};

module.exports = config;
