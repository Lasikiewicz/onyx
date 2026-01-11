const path = require('path');

// Get build profile from environment variable (default to 'production')
const BUILD_PROFILE = process.env.BUILD_PROFILE || 'production';

// Determine configuration based on build profile
const isAlpha = BUILD_PROFILE === 'alpha';

const config = {
  appId: isAlpha ? 'com.lasikiewicz.onyx.alpha' : 'com.lasikiewicz.onyx',
  productName: isAlpha ? 'Onyx Alpha' : 'Onyx',
  directories: {
    output: 'dist'
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.ico',
    signAndEditExecutable: false,
    signingHashAlgorithms: null,
    certificateFile: null,
    certificatePassword: null
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*.js',
    '!dist-electron/**/*.d.ts',
    '!dist-electron/**/*.tsbuildinfo',
    'package.json'
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
  asarUnpack: [],
  compression: 'maximum',
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    include: 'build/installer.nsh'
  },
  publish: {
    provider: 'github',
    owner: 'Lasikiewicz',
    repo: 'oynx'
  }
};

module.exports = config;
