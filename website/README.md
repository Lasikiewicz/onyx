# Onyx Website

Marketing site for [Onyx](https://onyxlauncher.co.uk/) — the premium unified game library. Built with Astro.

## Post-deploy verification

After deploying the latest site (e.g. to Cloudflare Pages), verify:

1. **Hero section** — “Download for Windows” links to `https://github.com/Lasikiewicz/onyx/releases`. “Visit website” links to `https://onyxlauncher.co.uk/`.
2. **Footer** — “Download for Windows” links to `https://github.com/Lasikiewicz/onyx/releases`. “Join Discord” links to `https://discord.gg/m2dgd4ZUPu`.

Open [https://onyxlauncher.co.uk/](https://onyxlauncher.co.uk/), click each button, and confirm the correct destination in a new tab.

## Deploy to Cloudflare Pages

**“Push website live”** = build website, push to git `master`, then deploy via wrangler. Do **not** merge to `main` (that triggers the Electron app build). From repo root:

```bash
cd website && npm run build
git add -A && git commit -m "website: ..." && git push origin master
cd website && npx wrangler pages deploy dist --project-name=onyx --branch production
```

Log in first if needed: `npx wrangler login`. If the deploy is a preview, promote it to production in the Cloudflare Pages dashboard. Live site: [onyxlauncher.co.uk](https://onyxlauncher.co.uk/), `oynx.pages.dev`.

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
