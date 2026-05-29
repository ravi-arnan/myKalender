// Google Identity Services token client wrapper.
// Uses the same web OAuth client ID as Firebase Auth (project-level shared).
// Loaded via <script src="https://accounts.google.com/gsi/client"> in index.html.

const WEB_CLIENT_ID =
  "335438803237-f5j7scbeqm3u2vfl24hhmbmhckjf0bbq.apps.googleusercontent.com";
const CALENDAR_SCOPES =
  "https://www.googleapis.com/auth/calendar.readonly openid email profile";

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GsiTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
}

interface GsiOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (response: TokenResponse) => void;
  }) => GsiTokenClient;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GsiOauth2 } };
  }
}

async function waitForGis(timeoutMs = 5000): Promise<GsiOauth2> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const oauth2 = window.google?.accounts?.oauth2;
    if (oauth2) return oauth2;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Google Identity Services belum siap. Refresh halaman.");
}

/**
 * Opens Google's account picker and resolves with an access token for the
 * picked account. Use `hint` to bias picker toward a specific email (e.g., when
 * re-syncing a previously connected account).
 */
export async function requestAccessTokenForAccount(hint?: string): Promise<string> {
  const oauth2 = await waitForGis();
  return new Promise((resolve, reject) => {
    let client: GsiTokenClient | null = null;
    try {
      client = oauth2.initTokenClient({
        client_id: WEB_CLIENT_ID,
        scope: CALENDAR_SCOPES,
        prompt: hint ? "" : "select_account",
        callback: (response) => {
          if (response.error) {
            reject(
              new Error(response.error_description || response.error),
            );
            return;
          }
          if (!response.access_token) {
            reject(new Error("Access token kosong"));
            return;
          }
          resolve(response.access_token);
        },
      });
    } catch (e) {
      reject(e);
      return;
    }
    client.requestAccessToken(hint ? { hint } : undefined);
  });
}

export interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

export async function fetchGoogleUserInfo(token: string): Promise<GoogleUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    throw new Error(`Gagal ambil info akun Google: ${response.status}`);
  }
  return response.json();
}
