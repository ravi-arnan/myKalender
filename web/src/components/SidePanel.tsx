import {
  BellRing,
  Check,
  Download,
  Plus,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import type { CalendarEvent } from "../lib/types";
import { formatTime } from "../lib/date-utils";

type ActivePanel = null | "bell" | "phone";

interface SidePanelProps {
  events: CalendarEvent[];
  onQuickAdd: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onOpenAi: () => void;
  aiActive: boolean;
}

export function SidePanel({
  events,
  onQuickAdd,
  onEventClick,
  onOpenAi,
  aiActive,
}: SidePanelProps) {
  const [active, setActive] = useState<ActivePanel>(null);

  function toggle(panel: Exclude<ActivePanel, null>) {
    setActive((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
      <aside className="w-14 border-l border-hairline bg-canvas flex flex-col items-center py-3 gap-2 relative">
        <PanelIcon
          label="Tambah cepat"
          icon={<Plus size={18} />}
          onClick={onQuickAdd}
        />
        <PanelIcon
          label="AI Jadwal"
          icon={<Sparkles size={18} />}
          active={aiActive}
          onClick={onOpenAi}
        />
        <PanelIcon
          label="Status alarm HP"
          icon={<Smartphone size={18} />}
          active={active === "phone"}
          onClick={() => toggle("phone")}
        />
        <PanelIcon
          label="Pengingat"
          icon={<BellRing size={18} />}
          active={active === "bell"}
          onClick={() => toggle("bell")}
        />
      </aside>

      {active === "bell" || active === "phone" ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setActive(null)}
          />
          <div className="absolute right-16 top-16 w-80 max-h-[70vh] overflow-y-auto rounded-lg border border-hairline bg-canvas shadow-xl z-40">
            {active === "bell" ? (
              <BellPanel
                events={events}
                onClose={() => setActive(null)}
                onEventClick={(ev) => {
                  setActive(null);
                  onEventClick(ev);
                }}
              />
            ) : (
              <PhonePanel onClose={() => setActive(null)} />
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

function PanelIcon({
  label,
  icon,
  onClick,
  active = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-9 h-9 rounded-md flex items-center justify-center transition ${
        active
          ? "bg-ink text-on-primary"
          : "text-muted hover:text-ink hover:bg-surface-soft"
      }`}
    >
      {icon}
    </button>
  );
}

function PanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
      <h4 className="font-display text-base text-ink">{title}</h4>
      <button
        type="button"
        onClick={onClose}
        className="text-muted hover:text-ink p-1 rounded-md hover:bg-surface-soft transition"
        aria-label="Tutup"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function BellPanel({
  events,
  onClose,
  onEventClick,
}: {
  events: CalendarEvent[];
  onClose: () => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const now = Date.now();
  const upcoming = events
    .filter((e) => e.start.toDate().getTime() >= now)
    .filter((e) => e.source !== "gcal-holiday")
    .sort((a, b) => a.start.toDate().getTime() - b.start.toDate().getTime())
    .slice(0, 6);

  return (
    <>
      <PanelHeader title="Pengingat mendatang" onClose={onClose} />
      {upcoming.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-muted mb-1">Tidak ada jadwal mendatang</p>
          <p className="text-xs text-muted-soft">
            Tambah jadwal lewat tombol + di header.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {upcoming.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => onEventClick(ev)}
                className="w-full text-left px-4 py-3 hover:bg-surface-soft transition"
              >
                <p className="text-sm font-medium text-ink truncate">
                  {ev.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted">
                    {formatRelative(ev.start.toDate())}
                  </span>
                  {ev.reminderOffsetMinutes >= 0 ? (
                    <span className="text-[10px] text-muted-soft inline-flex items-center gap-1">
                      <BellRing size={10} />
                      {formatOffset(ev.reminderOffsetMinutes)}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PhonePanel({ onClose }: { onClose: () => void }) {
  return (
    <>
      <PanelHeader title="Alarm di HP" onClose={onClose} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success px-2 py-1 rounded-full bg-success/10">
            <Check size={11} />
            Web tersinkron
          </span>
        </div>
        <p className="text-sm text-body leading-relaxed mb-3">
          Notifikasi web hanya muncul saat tab terbuka. Untuk reminder yang
          benar-benar bunyi keras dan tampil full-screen di lock screen,
          install app Android.
        </p>
        <a
          href="https://github.com/ravi-arnan/myKalender/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold hover:bg-primary-active transition"
        >
          <Download size={14} />
          Download APK
        </a>
        <div className="mt-4 pt-3 border-t border-hairline">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Setup di HP
          </p>
          <ol className="text-xs text-muted space-y-1.5 list-decimal pl-4">
            <li>Install APK dan login dengan akun Google yang sama</li>
            <li>Onboarding sheet bantu aktifkan permission MIUI</li>
            <li>Aktifkan Autostart + Other permissions di Settings</li>
            <li>Jadwal dari web langsung sync dan dijadwal sebagai alarm</li>
          </ol>
        </div>
      </div>
    </>
  );
}

function formatOffset(minutes: number): string {
  if (minutes === 0) return "tepat waktu";
  if (minutes < 60) return `${minutes}m sebelum`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}j sebelum`;
  return `${Math.floor(minutes / 1440)}h sebelum`;
}

function formatRelative(d: Date): string {
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 60) {
    if (diffMin < 1) return "sebentar lagi";
    return `${diffMin} menit lagi · ${formatTime(d)}`;
  }
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lagi · ${formatTime(d)}`;
  const sameDay = isSameLocalDay(d, now);
  const tomorrow = isSameLocalDay(d, new Date(now.getTime() + 86_400_000));
  if (sameDay) return `Hari ini · ${formatTime(d)}`;
  if (tomorrow) return `Besok · ${formatTime(d)}`;
  return `${d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })} · ${formatTime(d)}`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
