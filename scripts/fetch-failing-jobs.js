(async () => {
  const token = process.env.GHTOKEN;
  if (!token) {
    console.error('GHTOKEN not set');
    process.exit(1);
  }
  const repo = process.env.GITHUB_REPOSITORY || 'Lasikiewicz/onyx';
  const [owner, repoName] = repo.includes('/') ? repo.split('/') : ['Lasikiewicz', 'onyx'];
  const workflowFile = 'credentials-migration.yml';
  const branch = 'fix/security/credentials-storage';

  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
  };

  try {
    // Try to find recent runs for the repo and filter by branch/workflow name
    const allRunsRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/actions/runs?per_page=100`, { headers });
    const allRunsJson = await allRunsRes.json();
    const runs = (allRunsJson.workflow_runs || []).filter(r => r.head_branch === branch || (r.name && r.name.toLowerCase().includes('credentials')) || (r.workflow_id && String(r.workflow_id).toLowerCase().includes('credentials')));

    if (!runs || runs.length === 0) {
      console.log('No workflow runs found matching branch or credentials name. Listing recent runs for inspection:');
      (allRunsJson.workflow_runs || []).slice(0, 10).forEach(r => console.log('  run:', r.id, 'name:', r.name, 'branch:', r.head_branch, 'conclusion:', r.conclusion));
      process.exit(0);
    }

    const failingRun = runs.find(r => r.conclusion !== 'success') || runs[0];
    console.log('Found run:', failingRun.id, 'name:', failingRun.name, 'branch:', failingRun.head_branch, 'status:', failingRun.status, 'conclusion:', failingRun.conclusion, 'event:', failingRun.event, 'created_at:', failingRun.created_at);

    // get jobs for the run
    const jobsRes = await fetch(failingRun.jobs_url, { headers });
    const jobsJson = await jobsRes.json();
    if (!jobsJson.jobs || jobsJson.jobs.length === 0) {
      console.log('No jobs found for run', failingRun.id);
      process.exit(0);
    }

    const failingJobs = jobsJson.jobs.filter(j => j.conclusion !== 'success');
    console.log(`Total jobs: ${jobsJson.total_count}, failing: ${failingJobs.length}`);

    for (const job of failingJobs) {
      console.log('\n--- Job:', job.name, 'id:', job.id, 'conclusion:', job.conclusion, 'status:', job.status); 
      if (job.steps && job.steps.length) {
        for (const step of job.steps) {
          const status = `${step.name} -> status=${step.status} conclusion=${step.conclusion}`;
          console.log('  ', status);
          // If step has outputs, show first 3 lines of 'outputs' or 'error' if available
        }
      }
      // Show the logs_url for further inspection
      console.log('  logs_url:', job.logs_url);
    }

    // Also list all checks for the PR to give overall context
    const prsRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/3/checks`, { headers }).catch(()=>null);
    // fallback: use checks API by ref? We'll instead list check runs for the head SHA
    const headSha = failingRun.head_sha;
    const checksRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/commits/${headSha}/check-runs`, { headers });
    const checksJson = await checksRes.json();
    if (checksJson.check_runs) {
      console.log('\nOverall check runs for head sha:');
      checksJson.check_runs.forEach(cr => console.log(`  ${cr.name} - status=${cr.status} conclusion=${cr.conclusion}`));
    }

    // Optionally trigger a rerun if caller passed --rerun
    if (process.argv.includes('--rerun') || process.argv.includes('-r')) {
      console.log('\n--rerun flag detected: requesting a rerun for the failing run...');
      try {
        const rerunRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/actions/runs/${failingRun.id}/rerun`, {
          method: 'POST',
          headers
        });
        if (rerunRes.status === 204) {
          console.log('Rerun requested successfully. Polling for completion...');
          // Poll for completion
          const sleep = ms => new Promise(r => setTimeout(r, ms));
          let attempts = 0;
          let runInfo = null;
          while (attempts < 60) { // up to ~10 minutes
            const runRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/actions/runs/${failingRun.id}`, { headers });
            runInfo = await runRes.json();
            if (!runInfo || runInfo.status === 'completed') break;
            attempts++;
            await sleep(10000);
          }
          if (runInfo) {
            console.log('Rerun completed or timed out. New status:', runInfo.status, 'conclusion:', runInfo.conclusion);
            // Fetch jobs for the updated run
            const jobsRes2 = await fetch(runInfo.jobs_url, { headers });
            const jobsJson2 = await jobsRes2.json();
            const failingJobs2 = (jobsJson2.jobs || []).filter(j => j.conclusion !== 'success');
            console.log(`Total jobs after rerun: ${jobsJson2.total_count}, failing: ${failingJobs2.length}`);
            for (const job of failingJobs2) {
              console.log('\n--- Job:', job.name, 'id:', job.id, 'conclusion:', job.conclusion, 'status:', job.status);
              if (job.steps && job.steps.length) {
                for (const step of job.steps) {
                  const status = `${step.name} -> status=${step.status} conclusion=${step.conclusion}`;
                  console.log('  ', status);
                }
              }
              console.log('  logs_url:', job.logs_url);
            }
          }
        } else {
          const body = await rerunRes.text();
          console.error('Failed to trigger rerun:', rerunRes.status, body);
        }
      } catch (rerunErr) {
        console.error('Error requesting rerun:', rerunErr);
      }
    }

  } catch (err) {
    console.error('Error fetching workflow runs or jobs:', err);
    process.exit(1);
  }
})();