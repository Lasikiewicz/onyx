const { execSync } = require('child_process');
try {
  const result = execSync('git grep "window.ipcRenderer" -- ./renderer', { encoding: 'utf8' });
  if (result && result.trim().length > 0) {
    console.error('Raw ipc usage detected in renderer files:\n', result);
    process.exit(1);
  }
  console.log('No raw window.ipcRenderer references found in renderer.');
} catch (err) {
  // git grep exits with code 1 when no matches are found
  if (err && err.status === 1) {
    console.log('No raw window.ipcRenderer references found in renderer.');
    process.exit(0);
  }
  console.error('Error running check-no-raw-ipc:', err.message || err);
  process.exit(1);
}