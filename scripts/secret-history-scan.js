// NOTE: This file intentionally contains literal examples of known leaked tokens used by our detection tools.
// The secret scanner will skip this file to avoid self-matching of detector patterns.
const { execSync } = require('child_process');
const patterns = [
  /xlji4pwi9ky847t2mc9iyx5w29kdeo/, // known leaked secret (detector example)
  /28m77brcpxywpuw6k9kg3rh6vzprvd/,  // known leaked client id (detector example)
];

try {
  const commits = execSync('git rev-list --all', { encoding: 'utf8' }).trim().split(/\r?\n/);
  let found = 0;
  for (const sha of commits) {
    for (const pat of patterns) {
      try {
        const out = execSync(`git grep -n -e "${pat.source}" ${sha}`, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
        if (out && out.trim()) {
          console.log(`Match for pattern /${pat.source}/ in commit ${sha}:`);
          console.log(out.split(/\r?\n/).slice(0,5).join('\n'));
          found++;
        }
      } catch (err) {
        // git grep returns non-zero when no matches; ignore
      }
    }
  }

  if (found === 0) {
    console.log('No historical matches found for known patterns.');
    process.exit(0);
  } else {
    console.error(`Found ${found} historical matches. Please investigate and rotate any exposed secrets.`);
    process.exit(2);
  }
} catch (err) {
  console.error('Error running git history scan:', err.message || err);
  process.exit(1);
}