import { createFileRoute } from "@tanstack/react-router";
import { Bell, BellRing, Check, Globe, Link2, Loader2, Monitor, Moon, Palette, ShieldCheck, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { syncGoogleCalendar } from "../../lib/gcal-sync";
import {
  notificationPermission,
  notify,
  requestNotificationPermission,
} from "../../lib/notifications";
import { usePreferences } from "../../lib/preferences";
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
  const { weekStart, setWeekStart, notifSound, setNotifSound } = usePreferences();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [notifPermission, setNotifPermission] = useState(notificationPermission());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNotifPermission(notificationPermission());
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") {
      notify("Notifikasi aktif", {
        body: "myKalender akan kasih kabar kalau ada jadwal baru.",
        tag: "mykalender-test",
      });
    }
  }

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
      const result = await syncGoogleCalendar(user.uid, 365);
      const holidayText = result.holidaysImported
        ? ` + ${result.holidaysImported} hari libur`
        : "";
      const summary = `${result.imported} jadwal di-import${holidayText}. ${result.skipped} di-skip.`;
      setSyncMessage({ ok: true, text: summary });
      notify("Sync Google Calendar selesai", {
        body: summary,
        tag: "mykalender-sync",
        silent: true,
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
          <div className="px-4 py-3 bg-canvas flex items-center justify-between gap-3">
            <span className="text-sm text-body">Mulai minggu di</span>
            <div className="inline-flex items-center rounded-md border border-hairline overflow-hidden">
              <button
                type="button"
                onClick={() => setWeekStart(0)}
                className={`px-3 py-1 text-xs font-medium transition ${
                  weekStart === 0
                    ? "bg-ink text-on-primary"
                    : "text-body hover:bg-surface-soft hover:text-ink"
                }`}
              >
                Minggu
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(1)}
                className={`px-3 py-1 text-xs font-medium transition border-l border-hairline ${
                  weekStart === 1
                    ? "bg-ink text-on-primary"
                    : "text-body hover:bg-surface-soft hover:text-ink"
                }`}
              >
                Senin
              </button>
            </div>
          </div>
          <Row label="Bahasa" value="Bahasa Indonesia" />
        </SettingSection>

        <SettingSection icon={<Bell size={16} />} title="Default reminder">
          <Row label="Offset alarm bawaan" value="20 menit sebelum" />
          <Row label="Suara alarm" value="Default sistem" />
        </SettingSection>

        <SettingSection icon={<BellRing size={16} />} title="Notifikasi browser">
          <div className="px-4 py-3 bg-canvas">
            {notifPermission === "unsupported" ? (
              <p className="text-sm text-muted">
                Browser-mu gak support Notification API. Coba Chrome / Firefox /
                Safari versi modern.
              </p>
            ) : notifPermission === "denied" ? (
              <>
                <p className="text-sm text-body mb-1">Notifikasi diblokir</p>
                <p className="text-xs text-muted">
                  Buka pengaturan situs di browser (ikon kunci di address bar) →
                  cari "Notifications" → ubah ke Allow.
                </p>
              </>
            ) : notifPermission === "granted" ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-body mb-0.5">Notifikasi aktif</p>
                    <p className="text-xs text-muted">
                      Kamu bakal dapet notif saat ada jadwal baru atau sync
                      selesai.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success px-2 py-1 rounded-full bg-success/10">
                    <Check size={12} />
                    Aktif
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-hairline">
                  <div className="flex items-center gap-2">
                    {notifSound ? (
                      <Volume2 size={14} className="text-muted" />
                    ) : (
                      <VolumeX size={14} className="text-muted" />
                    )}
                    <div>
                      <p className="text-sm text-body">Bunyi notifikasi</p>
                      <p className="text-xs text-muted">
                        {notifSound
                          ? "Notifikasi pakai suara default browser."
                          : "Notifikasi muncul tanpa bunyi."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifSound(!notifSound)}
                    role="switch"
                    aria-checked={notifSound}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      notifSound ? "bg-ink" : "bg-hairline"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-canvas transition ${
                        notifSound ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-body mb-1">Aktifkan notifikasi web</p>
                <p className="text-xs text-muted mb-3">
                  Saat ada jadwal baru dari device lain atau sync selesai, kamu
                  bakal dapet notif browser meski tab gak aktif.
                </p>
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold hover:bg-primary-active transition"
                >
                  <BellRing size={14} />
                  Aktifkan notifikasi
                </button>
              </>
            )}
          </div>
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
