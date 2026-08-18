# mykalender-ai — AI proxy (Cloudflare Worker)

Server-side proxy for the AI Schedule Generator. Keeps the upstream API key off
the client: the web app sends a Firebase ID token, the worker verifies it and
forwards the request upstream with the secret key.

Upstream is **Groq** (`openai/gpt-oss-120b`). It was GitHub Models until
2026-07-29; GitHub announced that service's retirement for 2026-07-30, so it
moved. Groq is also free-tier and OpenAI-compatible, so only the base URL, the
model name and the secret name changed.

## Deploy (one-time)

Needs a (free) Cloudflare account and a Groq API key from
https://console.groq.com (free tier, no card).

```bash
cd worker
npm install

# 1. Log in to Cloudflare (opens a browser)
npx wrangler login

# 2. Store the Groq key as a secret (paste when prompted)
npx wrangler secret put GROQ_API_KEY

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
- `GROQ_API_KEY` — the Groq key, stored as a Wrangler secret.

## Local dev

```bash
echo "GROQ_API_KEY=gsk_xxx" > .dev.vars   # gitignored
npx wrangler dev
```

## Checking the upstream

`./verify-upstream.sh` sends the real schema and a real Indonesian prompt
straight to Groq, bypassing the worker and Firebase. It is the fastest way to
tell "the model or the API changed" apart from "our auth broke".

```bash
GROQ_API_KEY=gsk_xxx ./verify-upstream.sh
```

## Two things that look wrong until you know why

**Reminder offsets are strings in the JSON schema, not integers.** Groq's
constrained decoder drops the separator between elements of an unconstrained
integer array. Asking for two reminders returns `[144060]` instead of
`[1440, 60]`, and the client then snaps that to a single 1440 — the second
reminder disappears silently. With an enum of strings it is correct on every
run, and with no `response_format` at all it is also correct, so the fault is
in the decoder rather than the model. `normalizeEvent` coerces with `Number()`,
so nothing downstream noticed the change. Do not "tidy" these back to integers.

**Only the gpt-oss models are candidates.** `llama-3.3-70b-versatile` and
`qwen/qwen3.6-27b` reject `response_format: json_schema` outright. Between the
two that work, 120b got relative dates ("Selasa terdekat") right where 20b
returned a Saturday.
