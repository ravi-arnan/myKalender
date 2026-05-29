import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { useState } from "react";
import {
  auth,
  cacheAccessTokenFromCredential,
  googleProvider,
  waitForAuthReady,
} from "../lib/firebase";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    // Already signed in? Skip the login screen entirely.
    const user = await waitForAuthReady();
    if (user) throw redirect({ to: "/calendar" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      cacheAccessTokenFromCredential(result);
      navigate({ to: "/calendar" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition"
        >
          <ArrowLeft size={16} />
          Kembali
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <img
            src="/logo.png"
            alt=""
            className="w-14 h-14 rounded-2xl mx-auto mb-6"
          />
          <h1 className="text-3xl text-ink mb-2 text-center">Masuk</h1>
          <p className="text-muted text-center mb-8 text-sm">
            Login dengan akun Google. Akun yang sama dipakai buat alarm di HP.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full rounded-md bg-primary text-on-primary px-5 py-3 text-sm font-semibold hover:bg-primary-active transition disabled:opacity-60"
          >
            {loading ? "Menghubungkan…" : "Lanjutkan dengan Google"}
          </button>
          {error ? (
            <p className="mt-4 text-sm text-error text-center">{error}</p>
          ) : null}
          <p className="mt-8 text-xs text-muted-soft text-center">
            Dengan masuk, kamu setuju kalau jadwalmu disimpan di Firestore (data
            pribadimu sendiri, gak dibagi ke siapa pun).
          </p>
        </div>
      </div>
    </main>
  );
}
