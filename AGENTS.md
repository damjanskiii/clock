# AGENTS.md

## Deployment notes

- This project deploys to DreamHost shared hosting with Passenger.
- The remote app root is `/home/dh_nacbxf/clock.damjanski.com`.
- DreamHost uses `.htaccess` plus a Passenger startup file, not a Node app UI.
- `next.config.ts` must keep `output: "standalone"`.
- The root `server.js` is a tiny wrapper that loads `.env.local` or `.env` using built-in Node `fs`, then starts `server.standalone.js`.
- `scripts/package-dreamhost.mjs` prepares `deploy/dreamhost/` from the Next standalone build.

## GitHub Actions deployment

- Workflow: `.github/workflows/deploy-dreamhost.yml`
- Trigger: push to `main` or manual `workflow_dispatch`
- Expected GitHub secrets:
  - `DREAMHOST_HOST`
  - `DREAMHOST_USER`
  - `DREAMHOST_SSH_KEY`
  - `OPENAI_API_KEY`

## Remote layout

The DreamHost app root should contain:

- `.htaccess`
- `.next/`
- `node_modules/`
- `package.json`
- `server.js`
- `server.standalone.js`
- `.env.local`
- `tmp/restart.txt`

## Operational reminders

- Never commit or print the real OpenAI key.
- Do not put secrets in client code.
- Do not add `<Directory>` blocks to `.htaccess`.
- If debugging production, inspect the deployed `server.js`, `.htaccess`, and `.env.local` presence before changing app code.
