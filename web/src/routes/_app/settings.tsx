import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, Globe, Link2, Loader2, Monitor, Moon, Palette, ShieldCheck, Sun } from "lucide-react";
import { useState } from "react";
import { auth } from "../../lib/firebase";
import { syncGoogleCalendar } from "../../lib/gcal-sync";
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "../../lib/theme";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [theme, setTheme] = useState<ThemePreference>(() => getThemePreference());
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function handleThemeChange(next: ThemePreference) {
    setTheme(next);
    setThemePreference(next);
  }

  async function handleSyncGcal() {
    const user = auth.currentUser;
    if (!user) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncGoogleCalendar(user.uid, 30);
      setSyncMessage({
        ok: true,
        text: `${result.imported} jadwal berhasil di-import. ${result.skipped} di-skip.`,
      });
    } catch (e) {
      setSyncMessage({
        ok: false,
        text: e instanceof Error ? e.message : "Sync gagal",
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        <h2 className="font-display text-3xl text-ink mb-2">Pengaturan</h2>
        <p className="text-sm text-muted mb-8">
          Atur tampilan, default reminder, dan preferensi lainnya.
        </p>

        <SettingSection icon={<Palette size={16} />} title="Tampilan">
          <div className="px-4 py-3 bg-canvas">
            <p className="text-sm text-body mb-3">Tema</p>
            <div className="grid grid-cols-3 gap-2">
              <ThemeOption
                label="Terang"
                icon={<Sun size={14} />}
                active={theme === "light"}
                onClick={() => handleThemeChange("light")}
              />
              <ThemeOption
                label="Gelap"
                icon={<Moon size={14} />}
                active={theme === "dark"}
                onClick={() => handleThemeChange("dark")}
              />
              <ThemeOption
                label="Sistem"
                icon={<Monitor size={14} />}
                active={theme === "system"}
                onClick={() => handleThemeChange("system")}
              />
            </div>
          </div>
          <Row label="Mulai minggu di" value="Minggu" />
          <Row label="Bahasa" value="Bahasa Indonesia" />
        </SettingSection>

        <SettingSection icon={<Bell size={16} />} title="Default reminder">
          <Row label="Offset alarm bawaan" value="20 menit sebelum" />
          <Row label="Suara alarm" value="Default sistem" />
        </SettingSection>

        <SettingSection icon={<Link2 size={16} />} title="Google Calendar">
          <div className="px-4 py-3 bg-canvas">
            <p className="text-sm text-body mb-1">
              Import jadwal dari Google Calendar
            </p>
            <p className="text-xs text-muted mb-3">
              Ambil event 30 hari ke depan dari kalender utamamu dan jadikan
              alarm di sini. Sync manual setiap kamu mau update.
            </p>
            <button
              type="button"
              onClick={handleSyncGcal}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold hover:bg-primary-active transition disabled:opacity-60"
            >
              {syncing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Mengambil…
                </>
              ) : (
                <>
                  <Link2 size={14} />
                  Sync sekarang
                </>
              )}
            </button>
            {syncMessage ? (
              <p
                className={`mt-3 text-xs ${
                  syncMessage.ok ? "text-success" : "text-error"
                }`}
              >
                {syncMessage.text}
              </p>
            ) : null}
          </div>
        </SettingSection>

        <SettingSection icon={<Globe size={16} />} title="Waktu & lokasi">
          <Row label="Zona waktu" value="Asia/Makassar (WITA)" />
        </SettingSection>

        <SettingSection icon={<ShieldCheck size={16} />} title="Privasi">
          <Row
            label="Data jadwalmu"
            value="Tersimpan di akun pribadi (Firebase Firestore)"
          />
        </SettingSection>

        <p className="text-xs text-muted-soft mt-8">
          Reminder default + bahasa + zona waktu masih placeholder. Form
          interaktif untuk semua field menyusul.
        </p>
      </div>
    </main>
  );
}

function ThemeOption({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition ${
        active
          ? "border-ink bg-ink text-on-primary"
          : "border-hairline text-body hover:bg-surface-soft hover:text-ink"
      }`}
    >
      {active ? <Check size={14} /> : icon}
      {label}
    </button>
  );
}

function SettingSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted">{icon}</span>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="border border-hairline rounded-lg overflow-hidden divide-y divide-hairline">
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-canvas">
      <span className="text-sm text-body">{label}</span>
      <span className="text-sm text-ink font-medium">{value}</span>
    </div>
  );
}
