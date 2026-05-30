# mykalender-ai — AI proxy (Cloudflare Worker)

Server-side proxy for the AI Schedule Generator. Keeps the GitHub Models PAT
off the client: the web app sends a Firebase ID token, the worker verifies it
and forwards the request to GitHub Models with the secret PAT.

## Deploy (one-time)

Needs a (free) Cloudflare account and a GitHub PAT with scope `models:read`
(create at https://github.com/settings/tokens).

```bash
cd worker
npm install

# 1. Log in to Cloudflare (opens a browser)
npx wrangler login

# 2. Store the GitHub PAT as a secret (paste when prompted)
npx wrangler secret put GITHUB_MODELS_TOKEN

# 3. Deploy — prints the worker URL, e.g.
#    https://mykalender-ai.<your-subdomain>.workers.dev
npx wrangler deploy
```

Then put that URL in `web/.env.local`:

```
VITE_AI_PROXY_URL=https://mykalender-ai.<your-subdomain>.workers.dev
```

…and rebuild + redeploy the web app (`cd web && pnpm build && cd .. &&
firebase deploy --only hosting`).

## Config

- `wrangler.toml [vars]` — `FIREBASE_PROJECT_ID` and `ALLOWED_ORIGINS`
  (comma-separated CORS allowlist). Not secret.
- `GITHUB_MODELS_TOKEN` — the PAT, stored as a Wrangler secret.

## Local dev

```bash
echo "GITHUB_MODELS_TOKEN=ghp_xxx" > .dev.vars   # gitignored
npx wrangler dev
```
