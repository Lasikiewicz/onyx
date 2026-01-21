(async () => {
  const token = process.env.GHTOKEN;
  if (!token) {
    console.error('GHTOKEN not set');
    process.exit(1);
  }
  const headers = { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' };
  try {
    const res = await fetch('https://api.github.com/repos/Lasikiewicz/onyx/actions/runs?per_page=50', { headers });
    const json = await res.json();
    if (!json.workflow_runs) {
      console.log('No workflow_runs in response', json);
      process.exit(0);
    }
    console.log('Total runs fetched:', json.total_count);
    json.workflow_runs.slice(0, 30).forEach((run, i) => {
      console.log(`#${i + 1}: id=${run.id} name='${run.name}' head_branch=${run.head_branch} path=${run.path || ''} event=${run.event} conclusion=${run.conclusion}`);
    });
  } catch (err) {
    console.error('Error fetching runs:', err);
    process.exit(1);
  }
})();