import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import {
  type ConnectedAccount,
  disconnectAccount,
  subscribeConnectedAccounts,
  upsertConnectedAccount,
} from "../../lib/connected-accounts";
import { syncCalendarForAccount } from "../../lib/gcal-sync";
import { fetchGoogleUserInfo, requestAccessTokenForAccount } from "../../lib/gis";

export const Route = createFileRoute("/_app/accounts")({
  component: AccountsPage,
});

interface Message {
  ok: boolean;
  text: string;
}

function AccountsPage() {
  const user = auth.currentUser!;
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [adding, setAdding] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    return subscribeConnectedAccounts(user.uid, setAccounts);
  }, [user.uid]);

  async function handleAddAccount() {
    setAdding(true);
    setMessage(null);
    try {
      const token = await requestAccessTokenForAccount();
      const info = await fetchGoogleUserInfo(token);
      if (info.email.toLowerCase() === user.email?.toLowerCase()) {
        setMessage({
          ok: false,
          text: "Akun itu sudah jadi akun utama. Pilih akun lain.",
        });
        return;
      }
      await upsertConnectedAccount(user.uid, {
        email: info.email,
        name: info.name,
        picture: info.picture,
      });
      const result = await syncCalendarForAccount(
        user.uid,
        token,
        info.email,
        365,
      );
      setMessage({
        ok: true,
        text: `${info.email} terhubung. ${result.imported} jadwal di-import.`,
      });
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Gagal menambah akun",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleSyncAccount(account: ConnectedAccount) {
    setBusyEmail(account.email);
    setMessage(null);
    try {
      const token = await requestAccessTokenForAccount(account.email);
      const result = await syncCalendarForAccount(
        user.uid,
        token,
        account.email,
        30,
      );
      setMessage({
        ok: true,
        text: `${account.email}: ${result.imported} jadwal di-import.`,
      });
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Sync gagal",
      });
    } finally {
      setBusyEmail(null);
    }
  }

  async function handleDisconnect(account: ConnectedAccount) {
    if (
      !confirm(
        `Putus koneksi ${account.email}? Semua jadwal yang di-import dari akun ini akan dihapus.`,
      )
    ) {
      return;
    }
    setBusyEmail(account.email);
    setMessage(null);
    try {
      await disconnectAccount(user.uid, account.email);
      setMessage({
        ok: true,
        text: `${account.email} terputus.`,
      });
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Gagal memutus akun",
      });
    } finally {
      setBusyEmail(null);
    }
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        <h2 className="font-display text-3xl text-ink mb-2">Akun terhubung</h2>
        <p className="text-sm text-muted mb-8">
          Sambungkan beberapa akun Google supaya jadwal dari semua kalendermu
          jadi satu tampilan di sini.
        </p>

        {message ? (
          <div
            className={`mb-6 px-4 py-3 rounded-md text-sm border ${
              message.ok
                ? "bg-success/10 border-success/30 text-success"
                : "bg-error/10 border-error/30 text-error"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <section className="mb-8">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Akun utama
          </h3>
          <div className="border border-hairline rounded-lg overflow-hidden">
            <PrimaryAccountRow user={user} />
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Akun tambahan
            </h3>
            <button
              type="button"
              onClick={handleAddAccount}
              disabled={adding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:underline disabled:opacity-50"
            >
              {adding ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
              Tambah akun
            </button>
          </div>
          {accounts.length === 0 ? (
            <div className="border border-dashed border-hairline rounded-lg p-6 text-center">
              <p className="text-sm text-muted mb-1">Belum ada akun tambahan</p>
              <p className="text-xs text-muted-soft">
                Klik "Tambah akun" untuk sambungkan kalendar dari akun Google
                lain.
              </p>
            </div>
          ) : (
            <div className="border border-hairline rounded-lg overflow-hidden divide-y divide-hairline">
              {accounts.map((acc) => (
                <ConnectedAccountRow
                  key={acc.email}
                  account={acc}
                  busy={busyEmail === acc.email}
                  onSync={() => handleSyncAccount(acc)}
                  onDisconnect={() => handleDisconnect(acc)}
                />
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-soft">
          Tiap sync, kamu akan diminta pilih akun Google di popup. Token akses
          tidak disimpan permanen — hanya metadata akun (email, nama, foto)
          yang tersimpan di Firestore. Disconnect akan hapus semua jadwal yang
          di-import dari akun itu.
        </p>
      </div>
    </main>
  );
}

function PrimaryAccountRow({
  user,
}: {
  user: { displayName: string | null; email: string | null; photoURL: string | null };
}) {
  const name = user.displayName ?? user.email ?? "";
  const email = user.email ?? "";
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-canvas">
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          className="w-10 h-10 rounded-full bg-surface-card"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-ink text-on-primary text-sm font-semibold flex items-center justify-center">
          {(name || "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{name}</p>
        <p className="text-xs text-muted truncate">{email}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success px-2 py-1 rounded-full bg-success/10">
        <Check size={12} />
        Utama
      </span>
    </div>
  );
}

function ConnectedAccountRow({
  account,
  busy,
  onSync,
  onDisconnect,
}: {
  account: ConnectedAccount;
  busy: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-canvas">
      {account.picture ? (
        <img
          src={account.picture}
          alt=""
          className="w-10 h-10 rounded-full bg-surface-card"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-ink text-on-primary text-sm font-semibold flex items-center justify-center">
          {(account.name || account.email).charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">
          {account.name || account.email}
        </p>
        <p className="text-xs text-muted truncate">
          {account.email}
          {account.lastSyncedAt
            ? ` · sync terakhir ${account.lastSyncedAt
                .toDate()
                .toLocaleString("id-ID")}`
            : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onSync}
        disabled={busy}
        className="p-2 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition disabled:opacity-50"
        title="Sync sekarang"
        aria-label="Sync"
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
      </button>
      <button
        type="button"
        onClick={onDisconnect}
        disabled={busy}
        className="p-2 rounded-md text-muted hover:text-error hover:bg-error/10 transition disabled:opacity-50"
        title="Putus koneksi"
        aria-label="Disconnect"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
