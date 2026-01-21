(async () => {
  const token = process.env.GHTOKEN;
  if (!token) {
    console.error('GHTOKEN not set');
    process.exit(1);
  }
  const body = {
    body: `CI failure summary:\n\n- The Windows workflow for credentials migration failed during the **Install dependencies** step, which caused all subsequent steps to be skipped.\n\nActions I took (on branch \`fix/security/credentials-storage\`):\n- Made the Install step \`continue-on-error: true\` so diagnostics and subsequent tests always run.\n- Added a diagnostic step that attempts \`npm i keytar\` and prints whether \`require('keytar')\` loads.\n- Added deterministic mocked tests: \`test:credentials:mock\` and \`test:credentials:service-mock\` that run regardless of native-keytar availability.\n\nRequested action:\n- Please re-run the CI for this PR (there is a "Re-run jobs" button in the Actions tab or the workflow run). After the rerun I will fetch the diagnostic output and triage the exact install error.\n\nLocal debug steps you can run now:\n- \`npm ci\` (check for install errors)\n- \`npm run test:credentials:mock\` (mocked migration test - must pass on all environments)\n- \`npm run test:credentials:service-mock\` (tests APICredentialsService behavior using a fake keytar)\n\nIf keytar fails to build locally (Windows), install the Visual Studio Build Tools with the C++ workload and retry \`npm ci\`. If you want, I can walk you through this step-by-step.\n\nI will watch the rerun and post a short fix plan once I can see the install logs. If you'd like me to trigger a rerun or fetch the failing job logs automatically, I can do that (I may ask for a short-lived token with Actions access).\n\nThanks — I’ll follow up as soon as the rerun completes and provide a triage report with suggested fixes and PR checklist items.`
  };

  const res = await fetch('https://api.github.com/repos/Lasikiewicz/onyx/issues/3/comments', {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (res.ok) {
    console.log('Comment posted:', json.html_url || json.url);
  } else {
    console.error('Failed to post comment:', json);
    process.exit(1);
  }
})();