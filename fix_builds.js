const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.pnpm = pkg.pnpm || {};
pkg.pnpm.onlyBuiltDependencies = [
  "electron",
  "esbuild",
  "ffmpeg-static",
  "sharp",
  "electron-winstaller",
  "keytar"
];
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
