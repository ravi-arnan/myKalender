import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { fetchUpcomingEvents } from "../lib/firestore-events";
import type { CalendarEvent } from "../lib/types";

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatWhen(ev: CalendarEvent): string {
  const start = ev.start.toDate();
  return ev.allDay ? `${dateFmt.format(start)} · Seharian` : dateTimeFmt.format(start);
}

/**
 * Command-palette style search over all upcoming events (not just the month in
 * view). Picking a result jumps the calendar to that event and opens it.
 */
export function SearchOverlay({
  uid,
  onClose,
  onSelect,
}: {
  uid: string;
  onClose: () => void;
  onSelect: (ev: CalendarEvent) => void;
}) {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetchUpcomingEvents(uid)
      .then((list) => {
        if (active) setEvents(list);
      })
      .catch((e) => console.warn("Gagal memuat jadwal untuk pencarian:", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false),
    );
  }, [events, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-hairline bg-canvas shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          className="flex items-center gap-2 px-4 border-b border-hairline"
          onSubmit={(e) => {
            e.preventDefault();
            if (results[0]) onSelect(results[0]);
          }}
        >
          <Search size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari jadwal mendatang…"
            className="flex-1 py-3.5 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-ink hover:bg-surface-soft transition shrink-0"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </form>

        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-sm text-muted text-center">Memuat…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted text-center">
              {query.trim()
                ? `Tidak ada jadwal cocok dengan "${query.trim()}"`
                : "Belum ada jadwal mendatang."}
            </p>
          ) : (
            <ul className="py-1">
              {results.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(ev)}
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-soft transition flex flex-col gap-0.5"
                  >
                    <span className="text-sm text-ink font-medium truncate">
                      {ev.title || "(Tanpa judul)"}
                    </span>
                    <span className="text-xs text-muted">{formatWhen(ev)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
