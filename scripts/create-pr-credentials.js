(async () => {
  const token = process.env.GHTOKEN;
  if (!token) {
    console.error('GHTOKEN environment variable is not set');
    process.exit(1);
  }

  const body = {
    title: 'chore(security): migrate APICredentials to OS keyring (keytar) with migration path and test',
    body: `Summary:\n- Add Keytar to store API credentials in OS secure credential store when available.\n- Migrate any existing plaintext credentials from electron-store into the OS keyring on startup.\n- Add \`scripts/test-credentials-migration.js\` to validate migration locally and a Windows workflow to run it in CI.\n\nTesting:\n- \`npm run test:credentials\` (skip if Keytar not installed locally)\n- Windows CI job \`Credentials Migration Test\` runs on PRs to verify migration.\n\nNotes: This keeps a fallback to electron-store when Keytar is unavailable, but the intent is to rely on OS secure stores when possible.`,
    head: 'fix/security/credentials-storage',
    base: 'master'
  };

  try {
    const resp = await fetch('https://api.github.com/repos/Lasikiewicz/onyx/pulls', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (resp.ok) {
      console.log('PR created:', data.html_url);
    } else {
      console.error('Failed to create PR:', data);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error creating PR:', err.message || err);
    process.exit(1);
  }
})();