(async () => {
  const token = process.env.GHTOKEN;
  if (!token) {
    console.error('GHTOKEN environment variable is not set');
    process.exit(1);
  }

  const repo = process.env.GITHUB_REPOSITORY || 'Lasikiewicz/onyx';
  const [owner, repoName] = repo.includes('/') ? repo.split('/') : ['Lasikiewicz', 'onyx'];

  const body = {
    title: 'chore(security): IPC hardening - remove raw ipc exposure, disable suspend API, gate steam playtime sync',
    body: `Summary:\n- Remove raw ipcRenderer exposure from preload and expose a minimal, whitelisted \`electronAPI\` including a safe \`on()\` subscription helper.\n- Disable suspend APIs in preload (return disabled responses).\n- Gate \`steam:syncPlaytime\` to short-circuit when \`syncPlaytime\` is not enabled in Steam app config.\n- Replace renderer usages of \`window.ipcRenderer\` with \`window.electronAPI.on()\` and add a pre-commit check to prevent reintroduction.\n\nTesting:\n- Local secret-scan and short-circuit test added and passing.\n- Added \`check:no-raw-ipc\` script and \`pre-commit\` guard.\n\nNotes: keep Suspend and Playtime disabled by default; adding tests and CI checks for security.`,
    head: 'fix/security/ipc-hardening',
    base: 'master'
  };

  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
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