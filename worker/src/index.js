// Cloudflare Worker: server-side proxy for the GitHub Models AI feature.
//
// Keeps the GitHub PAT (GITHUB_MODELS_TOKEN secret) off the client. The web
// app sends a Firebase ID token instead; this worker verifies it against
// Google's public keys so only signed-in users of *this* Firebase project can
// use the proxy (the worker URL itself is public, in the client bundle).

const UPSTREAM = "https://models.github.ai/inference/chat/completions";
const MODEL = "openai/gpt-4o-mini";
const JWK_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }
    if (!env.GITHUB_MODELS_TOKEN) {
      return json({ error: "Proxy belum dikonfigurasi (secret kosong)" }, 500, cors);
    }

    // Require a valid Firebase ID token from this project.
    const authz = request.headers.get("Authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) {
      return json({ error: "Tidak ada token autentikasi" }, 401, cors);
    }
    try {
      await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
    } catch (e) {
      return json({ error: `Token tidak valid: ${e.message}` }, 401, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Body bukan JSON valid" }, 400, cors);
    }
    // Pin the model server-side so the proxy can't be repurposed.
    body.model = MODEL;

    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_MODELS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allow = allowed.includes(origin) ? origin : allowed[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...extra, "Content-Type": "application/json" },
  });
}

// --- Firebase ID token verification (RS256, Google securetoken JWKs) ---

let jwkCache = null;
let jwkCacheAt = 0;

async function getJwks() {
  const now = Date.now();
  if (jwkCache && now - jwkCacheAt < 3600_000) return jwkCache;
  const res = await fetch(JWK_URL);
  if (!res.ok) throw new Error("gagal ambil public key");
  const { keys } = await res.json();
  jwkCache = keys;
  jwkCacheAt = now;
  return keys;
}

async function verifyFirebaseToken(idToken, projectId) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("format salah");
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(b64urlToString(headerB64));
  const payload = JSON.parse(b64urlToString(payloadB64));

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error("audience salah");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("issuer salah");
  }
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new Error("kedaluwarsa");
  }
  if (!payload.sub) throw new Error("tanpa subject");

  const keys = await getJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("key id tidak dikenal");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(sigB64),
    data,
  );
  if (!ok) throw new Error("signature salah");
  return payload;
}

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    s.length + ((4 - (s.length % 4)) % 4),
    "=",
  );
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToString(s) {
  return new TextDecoder().decode(b64urlToBytes(s));
}
