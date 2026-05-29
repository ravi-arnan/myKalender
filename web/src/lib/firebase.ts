import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type UserCredential } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");

const TOKEN_STORAGE_KEY = "mykalender:gcal_token";
const TOKEN_EXPIRY_KEY = "mykalender:gcal_token_expiry";

export function cacheAccessTokenFromCredential(result: UserCredential): void {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;
  if (!token) return;
  // Google access tokens expire in 1 hour. We subtract 60s as buffer.
  const expiresAt = Date.now() + 60 * 60 * 1000 - 60_000;
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
}

export function getCachedAccessToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) ?? 0);
  if (!token || Date.now() >= expiry) return null;
  return token;
}

export function clearCachedAccessToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}
