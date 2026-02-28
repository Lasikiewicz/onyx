/**
 * Build, then run Electron with ONYX_FORCE_OPTIMIZE=1 so image optimization
 * starts automatically. Stdout/stderr are written to debug-logs/crash-run.log
 * and echoed to the console so you can capture the crash.
 * Usage: node scripts/run-optimize-capture.js (run from repo root after npm run build)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logDir = path.join(process.cwd(), 'debug-logs');
const logPath = path.join(logDir, 'crash-run.log');

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logStream = fs.createWriteStream(logPath, { flags: 'a' });
logStream.write(`\n[${new Date().toISOString()}] run started (ONYX_FORCE_OPTIMIZE=1)\n`);

const electron = require('electron');
const child = spawn(electron, ['.'], {
  cwd: process.cwd(),
  env: { ...process.env, ONYX_FORCE_OPTIMIZE: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

function tee(data, isStderr) {
  const s = data.toString();
  logStream.write(s);
  if (isStderr) process.stderr.write(s);
  else process.stdout.write(s);
}

child.stdout.on('data', (d) => tee(d, false));
child.stderr.on('data', (d) => tee(d, true));

child.on('exit', (code, signal) => {
  logStream.write(`[${new Date().toISOString()}] exit code=${code} signal=${signal}\n`);
  logStream.end();
  process.exit(code != null ? code : (signal === 'SIGTERM' ? 0 : 1));
});

child.on('error', (err) => {
  logStream.write(`[${new Date().toISOString()}] spawn error: ${err.message}\n`);
  logStream.end();
  process.exit(1);
});

console.error(`Logging to ${logPath} (optimization log: debug-logs/optimization.log)`);
