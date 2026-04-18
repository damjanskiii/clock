# DamjanskiOS Clock Handoff

## Project goal
Build `clock.damjanski.com` as a production-ready web app that continuously shows the current `America/New_York` time as a freshly AI-generated clock image.

## Current product scope
- V1 implemented: EST-only experience using a square generated clock image, minute-based regeneration, tab-title updates, centered black-background layout, and info modal.
- Production metadata implemented: share title/copy, OG/Twitter image, canonical URL, and external favicon.
- Active production target moved to Vercel for now so V1 can run on a modern Node platform immediately; DreamHost shared hosting remains documented as a blocked runtime path.
- Current V1 behavior now pre-generates upcoming minute images up to 2 minutes ahead for active sessions, auto-swaps the displayed image without reload, keeps seconds out of prompts, and uses the updated modal copy.
- V2 not implemented yet: scaffold only for viewport-aware generation, fullscreen mode, and explicit loading states.

## Architecture decisions
- Stack: Next.js App Router, TypeScript, React.
- Image generation runs server-side through the OpenAI API.
- V1 uses a minute-keyed rolling in-memory cache with in-flight request deduping.
- Client computes `America/New_York` minute boundaries, updates the tab title, fetches the current minute image, and prefetches the next minute shortly before the boundary.
- Active sessions now keep a small rolling future buffer: after the current minute is available, the client prefetches the next 2 minute-images ahead of time so the correct image is ready at the boundary whenever possible.
- No permanent image reuse: each absolute minute gets a fresh generation, then old minute entries are discarded from memory.
- OpenAI model choice follows current official docs and is configurable in one place. Current default: `gpt-image-1.5`.
- The image route is Node runtime, dynamic, and `no-store`.

## Completed
- Reviewed current project requirements.
- Verified current OpenAI image docs before implementation.
- Chosen V1 architecture and V2 preparation strategy.
- Created this handoff file.
- Scaffolded a Next.js 16 / React 19 / TypeScript project.
- Implemented V1 homepage UI, modal, and black-background centered layout.
- Implemented shared `America/New_York` time utilities and prompt builder.
- Implemented server-side OpenAI image generation route and rolling cache.
- Implemented client-side minute loop, tab-title updates, and next-minute prefetch.
- Added `README.md`, `.env.example`, and deployment-oriented package scripts.
- Added social metadata for `https://clock.damjanski.com/`, including share title `WHAT:TIME:IS:IT`, share copy `The DamjaskiOS Clock`, generated OG/Twitter image routes, and the requested remote favicon.
- Configured standalone output and start command for DreamHost-friendly Node deployment.
- Added a DreamHost packaging script that prepares a clean upload bundle in `deploy/dreamhost`.
- Added GitHub Actions deployment scaffolding for DreamHost shared hosting via Passenger.
- Verified the DreamHost Passenger deployment bundle shape: root `server.js`, `server.standalone.js`, `.next/`, `node_modules/`, `.htaccess`, and server-only `.env.local`.
- Verified the DreamHost server has the `dreamhost-github-actions` public key installed in `~/.ssh/authorized_keys`.
- Verified the DreamHost shared-hosting system Node is only `v12.22.9`, which is too old for Next.js 16.
- Updated the GitHub Actions deployment approach to bundle a modern Node runtime with the app and point Passenger at that bundled binary.
- Verified that both bundled Node 24 and official Node 20 Linux runtimes can print `node -v` on DreamHost shared hosting but crash when starting the app with a V8 fatal error in `OS::SetPermissions`.
- Successfully smoke-tested a live OpenAI image generation request locally with a real API key; `/api/clock` returned a valid `1024x1024` PNG.
- Verified `npm run lint` and `npm run build`.
- Linked the repo to a Vercel project named `clock` under `Damjanski's projects`.
- Deployed the app to Vercel production and confirmed `/`, `/opengraph-image`, and `/twitter-image` respond publicly.
- Identified the live Vercel blocker: malformed production OpenAI env vars (`OPENAI_API_KEY` was only 3 characters; the image config vars included embedded newline characters from an earlier CLI prompt mistake).
- Corrected the Vercel production OpenAI env vars and hardened the image API route with `maxDuration`, exact-byte binary responses, and a tight requestable-minute window.
- Updated the prompt template to explicitly avoid seconds.
- Centered the `WHAT:TIME:IS:IT` social image text vertically and horizontally.
- Updated the V1 popup copy to: `This clock currently generates on EST only. A new clock is generated every minute to match the current time. More time zones coming soon.`
- Reworked the live client loop so the page auto-updates without reload and pre-generates the next 2 minute-images for active visitors.

## In progress
- Deploying the latest Vercel build that includes the new popup copy, centered share image text, explicit no-seconds prompt wording, and the 2-minute-ahead pre-generation behavior.

## Left to do
- Finish the Vercel validation pass by confirming the newest deployed frontend keeps auto-updating and that future-minute pre-generation is happening as expected in an active browser session.
- Point `clock.damjanski.com` to the Vercel project once the live Vercel deployment is confirmed stable.
- Decide whether DreamHost should later act only as DNS/domain management or whether a VPS/Dedicated migration is still desired.
- Implement V2 viewport-aware generation and fullscreen loading flow.

## Deployment notes
- Active temporary production host: Vercel project `clock`.
- Target custom domain: `https://clock.damjanski.com/`.
- DreamHost shared-host Passenger deployment remains blocked by platform/runtime constraints; use Vercel for a working Node runtime now.
- OpenAI API key must be provided via environment variables.
- Image route should run in the Node runtime, not Edge.
- The official OpenAI docs currently describe `gpt-image-1.5` as the latest and most advanced image generation model.
- OpenAI may require API Organization Verification before GPT Image usage.
- DreamHost startup uses Passenger with root `server.js`, which loads `.env.local` via a tiny built-in fs loader and then starts `server.standalone.js`.
- GitHub Actions now needs to bundle a Linux Node runtime into `deploy/dreamhost/.node-runtime` because DreamHost's system Node is too old for the app.
- Bundling a newer Node runtime into the app directory is not sufficient on DreamHost shared hosting so far: direct app startup still crashes in V8 before Next.js code runs.
- Local standalone runs can load `.env.local`; GitHub Actions writes `.env.local` on the DreamHost host from repository secrets.
- DreamHost upload bundle target: `deploy/dreamhost/`
- GitHub Actions workflow target: `.github/workflows/deploy-dreamhost.yml`

## Environment variables needed
- `OPENAI_API_KEY`
- `OPENAI_IMAGE_MODEL` optional override
- `OPENAI_IMAGE_QUALITY` optional override
- `OPENAI_IMAGE_SIZE` optional override

## Run locally
- `npm install`
- `npm run dev`

## Deploy
- `npm run build`
- `npm run package:dreamhost`
- `npm run start`
- For GitHub Actions deployment, add `DREAMHOST_HOST`, `DREAMHOST_USER`, `DREAMHOST_SSH_KEY`, and `OPENAI_API_KEY` as repository secrets.

## Known issues / caveats
- In-memory caching is per server process, so separate instances do not share minute state.
- First load for a minute may briefly show a loading or previous-image fallback while generation completes.
- Costs scale with continuous image generation; the prefetch window must stay conservative.
- The app is EST-only by product direction, but implementation uses the canonical `America/New_York` timezone identifier.
- Social metadata intentionally uses the provided share copy spelling: `The DamjaskiOS Clock`.
- The SSH secret issue was resolved by replacing `DREAMHOST_SSH_KEY` with the unencrypted private key from `~/.ssh/dreamhost_github_actions`.
- DreamHost shared hosting currently exposes `/usr/bin/node` as `v12.22.9`, so Passenger must be pointed at a bundled modern Node runtime for this app to boot.
- DreamHost's own current docs say Node.js apps are supported on VPS and Dedicated servers, not Shared hosting.
- The current blocker appears to be DreamHost shared-host security/runtime constraints around modern Node/V8 executable memory permissions, not the Next.js app bundle shape itself.
- The temporary OpenAI key used during debugging was pasted into chat and should be rotated again after the site is stable.

## Recommended next steps
- Recommended primary path: keep the current Next.js app and move runtime hosting to a Node-friendly environment, ideally DreamHost VPS if staying within DreamHost matters, or another managed Node host if speed matters most.
- Recommended fallback if DreamHost Shared is non-negotiable: pivot V1 to a static site plus a minute-based server-side generator job that writes the latest image and metadata on a schedule.
- Not recommended except as a short experiment: spend more time on Passenger/V8 workarounds on DreamHost Shared. The evidence now points to a platform limitation rather than an app-bundle bug.

## V2 notes / scaffolding status
- Planned seams: viewport-aware size selection, fullscreen layout mode, loading overlay, and alternate question-mark styling.
- Shared `America/New_York` time and prompt utilities will be reused for V2.
- `lib/clock-variants.ts` already contains the V2 popup copy and question-mark color.
- `lib/server/clock-image-service.ts` has TODO markers where viewport-driven generation metadata should be added.
