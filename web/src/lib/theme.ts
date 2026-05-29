import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "mykalender:theme";

export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "light";
}

export function setThemePreference(theme: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  // Best-effort cross-device sync to Firestore.
  const uid = auth.currentUser?.uid;
  if (uid) {
    setDoc(doc(db, "users", uid), { theme }, { merge: true }).catch(() => {
      // ignore — we have local copy
    });
  }
}

export function applyTheme(theme: ThemePreference): void {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

/**
 * After sign-in, fetch the user's saved theme from Firestore. If found and
 * different from local, applies it and updates localStorage.
 */
export async function hydrateThemeFromFirestore(uid: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const data = snap.data();
    const remote = data?.theme;
    if (remote === "light" || remote === "dark" || remote === "system") {
      if (remote !== getThemePreference()) {
        localStorage.setItem(STORAGE_KEY, remote);
        applyTheme(remote);
      }
    }
  } catch {
    // ignore — local copy is still applied
  }
}

export function initTheme(): void {
  const theme = getThemePreference();
  applyTheme(theme);

  // Re-apply when OS preference changes, but only if user is on "system".
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (getThemePreference() === "system") applyTheme("system");
    });
}
