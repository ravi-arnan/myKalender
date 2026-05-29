import { BellRing, Plus, Search, Smartphone } from "lucide-react";
import { useState } from "react";
import { MiniMonth } from "./MiniMonth";

interface SidebarProps {
  miniViewDate: Date;
  selectedDate: Date;
  onMiniChangeMonth: (delta: number) => void;
  onMiniSelectDate: (d: Date) => void;
  onCreate: () => void;
  onQuickAlarm: (minutesFromNow: number) => Promise<void>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const QUICK_PRESETS = [5, 15, 30, 60];

export function Sidebar({
  miniViewDate,
  selectedDate,
  onMiniChangeMonth,
  onMiniSelectDate,
  onCreate,
  onQuickAlarm,
  searchQuery,
  onSearchChange,
}: SidebarProps) {
  const [busyPreset, setBusyPreset] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleQuick(preset: number) {
    setBusyPreset(preset);
    setFeedback(null);
    try {
      await onQuickAlarm(preset);
      setFeedback(`Alarm di-set ${preset} menit lagi`);
      window.setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback("Gagal bikin alarm cepat");
      window.setTimeout(() => setFeedback(null), 3000);
    } finally {
      setBusyPreset(null);
    }
  }

  return (
    <aside className="w-64 border-r border-hairline bg-canvas flex flex-col">
      <div className="p-4">
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary-active transition shadow-sm"
        >
          <Plus size={16} />
          Tambah jadwal
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BellRing size={12} className="text-muted" />
          <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Alarm cepat
          </h4>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleQuick(preset)}
              disabled={busyPreset !== null}
              className="text-xs font-semibold rounded-md border border-hairline py-1.5 hover:bg-surface-soft hover:text-ink transition disabled:opacity-50"
              title={`Alarm ${preset} menit dari sekarang`}
            >
              {preset < 60 ? `${preset}m` : `${preset / 60}j`}
            </button>
          ))}
        </div>
        {feedback ? (
          <p className="text-[11px] text-muted mt-2">{feedback}</p>
        ) : null}
      </div>

      <div className="px-3 pb-3">
        <MiniMonth
          viewDate={miniViewDate}
          selectedDate={selectedDate}
          onChangeMonth={onMiniChangeMonth}
          onSelectDate={onMiniSelectDate}
        />
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari jadwal"
            className="w-full pl-8 pr-3 py-2 rounded-md bg-surface-card text-sm text-ink placeholder:text-muted focus:outline-none focus:bg-canvas focus:ring-1 focus:ring-hairline"
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-hairline">
        <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
          Kalender saya
        </h4>
        <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
          <input
            type="checkbox"
            defaultChecked
            className="w-3.5 h-3.5 accent-ink rounded"
          />
          <span className="text-sm text-body group-hover:text-ink">Pribadi</span>
        </label>
      </div>

      <div className="mt-auto p-4 border-t border-hairline">
        <div className="rounded-lg bg-surface-card p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Smartphone size={14} className="text-ink" />
            <span className="text-xs font-semibold text-ink">
              Alarm aktif di HP
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Setiap jadwal kamu input di sini akan bunyi seperti alarm di HP
            Android yang sudah terhubung.
          </p>
        </div>
      </div>
    </aside>
  );
}
