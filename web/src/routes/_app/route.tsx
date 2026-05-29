import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, waitForAuthReady } from "../../lib/firebase";
import { PreferencesProvider } from "../../lib/preferences";
import { hydrateThemeFromFirestore } from "../../lib/theme";
import { NavRail } from "../../components/NavRail";
import { AppLauncher } from "../../components/AppLauncher";
import { BottomNav } from "../../components/BottomNav";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    // Wait for Firebase to hydrate auth state from local storage, then
    // redirect to /login if there's no user.
    const user = await waitForAuthReady();
    if (!user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) navigate({ to: "/login" });
      else hydrateThemeFromFirestore(u.uid);
    });
  }, [navigate]);

  if (!user) return null;

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();

  return (
    <PreferencesProvider>
    <div className="h-screen flex flex-col bg-canvas">
      <header className="h-14 border-b border-hairline px-4 flex items-center justify-between flex-none">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt=""
            className="w-7 h-7 rounded-full"
          />
          <span className="font-display text-lg text-ink">myKalender</span>
        </div>
        <div className="flex items-center gap-2">
          <AppLauncher />
          <div className="w-px h-6 bg-hairline mx-1" />
          <div className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-surface-soft transition">
            <div className="w-7 h-7 rounded-full bg-ink text-on-primary text-xs font-semibold flex items-center justify-center">
              {initial}
            </div>
            <span className="text-xs text-muted hidden md:inline">
              {user.email}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex">
          <NavRail />
        </div>
        <div className="flex-1 flex overflow-hidden">
          <Outlet />
        </div>
      </div>

      <BottomNav />
    </div>
    </PreferencesProvider>
  );
}
