import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  createElement,
} from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type WeekStart = 0 | 1; // 0 = Minggu (Sunday), 1 = Senin (Monday)

interface PreferencesShape {
  weekStart: WeekStart;
  notifSound: boolean;
}

const DEFAULT_PREFERENCES: PreferencesShape = {
  weekStart: 0,
  notifSound: true,
};

const STORAGE_KEY = "mykalender:preferences";

interface PreferencesContextValue extends PreferencesShape {
  setWeekStart: (value: WeekStart) => void;
  setNotifSound: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  ...DEFAULT_PREFERENCES,
  setWeekStart: () => {},
  setNotifSound: () => {},
});

function readLocal(): PreferencesShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<PreferencesShape>;
    return {
      weekStart: parsed.weekStart === 1 ? 1 : 0,
      notifSound: parsed.notifSound === false ? false : true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writeLocal(prefs: PreferencesShape): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<PreferencesShape>(() => readLocal());

  // Hydrate from Firestore when the user signs in.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let cancelled = false;
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data();
        if (!data) return;
        const remoteWeekStart = data.weekStart;
        const remoteNotifSound = data.notifSound;
        setPrefs((prev) => {
          const next = { ...prev };
          let changed = false;
          if ((remoteWeekStart === 0 || remoteWeekStart === 1) && remoteWeekStart !== prev.weekStart) {
            next.weekStart = remoteWeekStart as WeekStart;
            changed = true;
          }
          if (typeof remoteNotifSound === "boolean" && remoteNotifSound !== prev.notifSound) {
            next.notifSound = remoteNotifSound;
            changed = true;
          }
          if (!changed) return prev;
          writeLocal(next);
          return next;
        });
      })
      .catch(() => {
        // ignore. Local copy stays in effect.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setWeekStart = useCallback((value: WeekStart) => {
    setPrefs((prev) => {
      const next = { ...prev, weekStart: value };
      writeLocal(next);
      const uid = auth.currentUser?.uid;
      if (uid) {
        setDoc(doc(db, "users", uid), { weekStart: value }, { merge: true }).catch(
          () => {},
        );
      }
      return next;
    });
  }, []);

  const setNotifSound = useCallback((value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, notifSound: value };
      writeLocal(next);
      const uid = auth.currentUser?.uid;
      if (uid) {
        setDoc(doc(db, "users", uid), { notifSound: value }, { merge: true }).catch(
          () => {},
        );
      }
      return next;
    });
  }, []);

  return createElement(
    PreferencesContext.Provider,
    { value: { ...prefs, setWeekStart, setNotifSound } },
    children,
  );
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}

export function getNotifSoundFromStorage(): boolean {
  return readLocal().notifSound;
}
