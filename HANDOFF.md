# DamjanskiOS Clock Handoff

## Project goal
Build `clock.damjanski.com` as a production-ready web app that continuously shows the current `America/New_York` time as a freshly AI-generated clock image.

## Current product scope
- V1 implemented: EST-only experience using a square generated clock image, minute-based regeneration, tab-title updates, centered black-background layout, and info modal.
- Production metadata implemented: share title/copy, OG/Twitter image, canonical URL, and external favicon.
- V2 not implemented yet: scaffold only for viewport-aware generation, fullscreen mode, and explicit loading states.

## Architecture decisions
- Stack: Next.js App Router, TypeScript, React.
- Image generation runs server-side through the OpenAI API.
- V1 uses a minute-keyed rolling in-memory cache with in-flight request deduping.
- Client computes `America/New_York` minute boundaries, updates the tab title, fetches the current minute image, and prefetches the next minute shortly before the boundary.
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
- Successfully smoke-tested a live OpenAI image generation request locally with a real API key; `/api/clock` returned a valid `1024x1024` PNG.
- Verified `npm run lint` and `npm run build`.

## In progress
- Ready for deployment to DreamHost once the production environment variables are set on the host.

## Left to do
- Set `OPENAI_API_KEY` in the deployment environment.
- Smoke-test live generation latency with a real API key.
- Implement V2 viewport-aware generation and fullscreen loading flow.
- Put the project in a real git repository and add a GitHub remote before creating branches/PRs.

## Deployment notes
- Target deployment: `https://clock.damjanski.com/`.
- Expected hosting: Vercel or any Node-compatible Next.js host.
- OpenAI API key must be provided via environment variables.
- Image route should run in the Node runtime, not Edge.
- The official OpenAI docs currently describe `gpt-image-1.5` as the latest and most advanced image generation model.
- OpenAI may require API Organization Verification before GPT Image usage.
- Current production start command: `npm run start`, which launches `.next/standalone/server.js`.
- Local standalone runs can load `.env.local`; hosted environments should also set the same variables directly in their app config.
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
- `npx vercel`
- `npx vercel --prod`
- Or deploy the repo to Vercel through the dashboard with the required environment variables set.
- For GitHub Actions deployment, add `DREAMHOST_HOST`, `DREAMHOST_USER`, `DREAMHOST_SSH_KEY`, and `OPENAI_API_KEY` as repository secrets.

## Known issues / caveats
- In-memory caching is per server process, so separate instances do not share minute state.
- First load for a minute may briefly show a loading or previous-image fallback while generation completes.
- Costs scale with continuous image generation; the prefetch window must stay conservative.
- The app is EST-only by product direction, but implementation uses the canonical `America/New_York` timezone identifier.
- Social metadata intentionally uses the provided share copy spelling: `The DamjaskiOS Clock`.
- This working directory is not currently a git repository, so no branch or PR could be created from here.

## Recommended next steps
- Set the production environment variables and test real minute turnover.
- Tune `CLOCK_PREFETCH_LEAD_MS` if image generation latency needs more headroom.
- Implement V2 sizing and loading flow using the existing variant and service seams.

## V2 notes / scaffolding status
- Planned seams: viewport-aware size selection, fullscreen layout mode, loading overlay, and alternate question-mark styling.
- Shared `America/New_York` time and prompt utilities will be reused for V2.
- `lib/clock-variants.ts` already contains the V2 popup copy and question-mark color.
- `lib/server/clock-image-service.ts` has TODO markers where viewport-driven generation metadata should be added.
