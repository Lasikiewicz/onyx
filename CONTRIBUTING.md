# Contributing to Onyx

Thank you for your interest in contributing to Onyx. This document covers how to get started and what to expect.

## Development setup

1. **Install dependencies**: `npm install`
2. **Run the app**: `npm run electron:dev`

Onyx is an **Electron application**. It does not run in a normal browser; use `npm run electron:dev` for local development. The Vite dev server and Electron are started together.

## API keys (user-obtained)

Onyx does **not** ship with any API keys. To use metadata features (game info, artwork), you must obtain your own keys and configure them in the app (Settings > APIs) or via environment variables. See [.env.example](.env.example) and the README for:

- IGDB (Client ID + Client Secret)
- RAWG (API Key)
- SteamGridDB (API Key)

Do **not** commit real API credentials to the repository. The project runs a secret scan in CI; see [scripts/secret-scan.js](scripts/secret-scan.js).

## Branch and pull request expectations

- Development and PRs typically target the **master** branch.
- Alpha and production releases use the **develop** and **main** branches (see README for the release workflow).

## Checks before submitting

Before opening a PR, run:

- **Build**: `npm run build`
- **Secret scan**: `npm run scan:secrets` — must pass; do not commit API keys, tokens, or literal secrets (see [scripts/secret-scan.js](scripts/secret-scan.js)).
- **Raw IPC check**: `npm run check:no-raw-ipc` — must pass; the renderer must not use `window.ipcRenderer` directly (see [scripts/check-no-raw-ipc.js](scripts/check-no-raw-ipc.js)).

CI runs these checks on PRs. There is no project-wide lint or format script; follow existing code style in the files you change.

## Code and security

- **Secrets**: Never commit API keys, tokens, or passwords. Use `.env` locally (gitignored) and document only placeholders in `.env.example`.
- **IPC**: Use only the APIs exposed via the preload script (ContextBridge). Do not use `window.ipcRenderer` directly in the renderer; the check-no-raw-ipc script will fail.

## Maintainer-only scripts

Scripts under `scripts/` that call the GitHub API (e.g. `create-pr.js`, `list-runs.js`, `post-pr-comment.js`, `fetch-failing-jobs.js`, `create-pr-credentials.js`) are intended for the canonical repository maintainers. They use `GHTOKEN` from the environment and may use `GITHUB_REPOSITORY` (or similar) for owner/repo; see the script files or README for usage.

## Forks publishing their own builds

If you fork Onyx and publish your own installers, change the app ID and publish configuration so they do not conflict with the official app:

- In `main/main.ts` and `electron-builder.config.js`, use your own app ID (e.g. `com.yourusername.onyx` instead of `com.lasikiewicz.onyx`).
- In `electron-builder.config.js`, set `publish.owner` and `publish.repo` to your GitHub user/org and repo name.

Thank you for contributing.
