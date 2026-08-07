# Onyx Release Workflows

This file is the source of truth for branch promotion and release operations.

## Summary

- Push to git: build + secrets scan + push local `master` to `origin/master`.
- Force to Alpha: version bump and changelog promotion, then force `origin/master` to `origin/develop`.
- Force to Main: force `origin/develop` to `origin/main`.
- Push app live: Push to git -> Force to Alpha -> Force to Main.
- Push website live: build website, push `master`, deploy Cloudflare Pages production branch.

## Global Release Rules

- Run `npm run scan:secrets` before any push.
- Keep `CHANGELOG.md` accurate before commit/push.
- `CHANGELOG.md` must enumerate each user-visible fix or adjustment explicitly. For refactors, prefer one main bullet per parent source file and list the extracted subfiles/components/hooks as child bullets under that parent entry instead of splitting one parent-file cleanup across many top-level bullets.
- If multiple changelog entries in the same release would start with the same prefix or surface label, group them under one parent bullet and use child bullets for the individual changes.
- Any changelog entry written as `- Prefix: detail` should be rewritten as a parent bullet `- Prefix:` followed by child bullets for the detail lines instead of staying as a flat single-line bullet.
- Use terminal commands for git operations.
- Do not use the word "alpha" in commit messages that land on `main`.

## 1) Push to git / Push to git master

1. Ensure `CHANGELOG.md` reflects current user-visible changes. Use `## [Pending]` when present, otherwise add/update the target release section. List each user-visible fix or adjustment as its own bullet. For refactors, group by parent file and list the created/extracted subfiles as child bullets under that file's main bullet. If multiple items share the same prefix or surface label, group them under one parent bullet with child bullets. Rewrite any `- Prefix: detail` pattern into `- Prefix:` plus child bullets.
2. Run `npm run build` and resolve failures.
3. Run `npm run scan:secrets` and resolve failures.
4. Commit and push:

```bash
npm run build
npm run scan:secrets
git add -A
git commit -m "[Summary]"
git push origin master
```

## 2) Force to Alpha

1. Run `npm run increment-build`, then read `version` from [`package.json`](../../package.json).
2. Update `CHANGELOG.md` for the new release `## [X.Y.Z] - YYYY-MM-DD`:
	- If `## [Pending]` exists, promote it.
	- If `## [Pending]` does not exist, add the new section at the top with release bullets.
	- Keep each user-visible fix or adjustment as a separate bullet instead of collapsing them into one summary line.
	- For refactors, group by parent file and list the created/extracted subfiles as child bullets under that file's main bullet.
	- If multiple items share the same prefix or surface label, group them under one parent bullet with child bullets.
	- Rewrite any `- Prefix: detail` pattern into `- Prefix:` plus child bullets.
3. Run `npm run scan:secrets`.
4. Commit with message: `<version> <changes>`.
5. Push and force promote:

```bash
npm run increment-build
npm run scan:secrets
git add package.json CHANGELOG.md
git commit -m "<version> <changes>"
git push origin master
git push origin master:develop --force
```

Result: remote `develop` equals remote `master` and Alpha CI build triggers from `develop`.

## 3) Force to Main

```bash
git fetch origin develop
git push origin origin/develop:main --force
```

Result: remote `main` equals remote `develop` and production CI build triggers from `main`.

## 4) Push app live

Execute these in order:

1. Push to git
2. Force to Alpha
3. Force to Main

## 5) Push website live

```bash
cd website && npm run build
npm run scan:secrets
git add -A
git commit -m "[Summary — e.g. website: ...]"
git push origin master
cd website && npx wrangler pages deploy dist --project-name=onyx --branch=main
```

Deploy to Cloudflare Pages production branch only.

## 6) Rebuild a release without a new commit

A push is not a guaranteed trigger. GitHub throttles webhook delivery during Actions incidents, which
drops the event and leaves the branch promoted but with no build, no tag and no release. Verify after
promoting, and dispatch manually if nothing started:

```bash
gh run list --limit 5
gh workflow run build.yml --ref develop
gh workflow run build.yml --ref main
```

The profile comes from the ref: `develop` builds Alpha (`alpha-v<version>`, prerelease), anything else
builds Production (`v<version>`). A dispatched run tags, deletes any existing release for that tag, and
publishes exactly as a push-triggered run does.

## Auto-update behavior

- Alpha users receive updates from published GitHub pre-releases built from `develop`.
- Production users receive updates from published stable GitHub releases built from `main`.
- Build triggers alone are not sufficient; release artifacts must be published.
