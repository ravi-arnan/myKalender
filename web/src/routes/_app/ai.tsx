import { createFileRoute } from "@tanstack/react-router";
import { Timestamp } from "firebase/firestore";
import {
  CalendarDays,
  Check,
  CloudUpload,
  Clock,
  Loader2,
  Repeat,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { auth } from "../../lib/firebase";
import {
  aiEventToDates,
  parseSchedulePrompt,
  type AiParsedEvent,
} from "../../lib/ai-schedule";
import { createEvent, updateEvent } from "../../lib/firestore-events";
import { pushEventToGcal } from "../../lib/gcal-sync";

export const Route = createFileRoute("/_app/ai")({
  component: AiSchedulePage,
});

const RECURRENCE_LABEL: Record<AiParsedEvent["recurrence"], string> = {
  none: "Sekali",
  daily: "Tiap hari",
  weekdays: "Hari kerja",
  weekly: "Tiap minggu",
  monthly: "Tiap bulan",
};

const REMINDER_LABEL: Record<number, string> = {
  0: "Tepat waktu",
  5: "5 menit sebelum",
  10: "10 menit sebelum",
  20: "20 menit sebelum",
  30: "30 menit sebelum",
  60: "1 jam sebelum",
  1440: "1 hari sebelum",
};

const EXAMPLE_PROMPTS = [
  "Senin sampai Jumat saya kuliah Kalkulus jam 8-10 pagi di Gedung MIPA.",
  "Selasa dan Kamis gym jam 5 sore selama 1 jam.",
  "Meeting BEM tiap Sabtu jam 10 pagi. Deadline tugas Fisika tanggal 20 Juni jam 23:59.",
];

interface Message {
  ok: boolean;
  text: string;
}

function AiSchedulePage() {
  const user = auth.currentUser!;
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [events, setEvents] = useState<AiParsedEvent[] | null>(null);
  const [pushToGcal, setPushToGcal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setMessage(null);
    setEvents(null);
    try {
      const parsed = await parseSchedulePrompt(prompt.trim());
      setEvents(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      if (parsed.length === 0) {
        setMessage({
          ok: false,
          text: "AI tidak menemukan event yang bisa dijadwalkan dari deskripsi tersebut.",
        });
      }
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Gagal memanggil AI",
      });
    } finally {
      setGenerating(false);
    }
  }

  function toggleSelected(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleApply() {
    if (!events) return;
    const picked = events.filter((_, i) => selected.has(i));
    if (picked.length === 0) return;
    setApplying(true);
    setMessage(null);
    let created = 0;
    let pushed = 0;
    const failures: string[] = [];

    for (const ev of picked) {
      const { start, end } = aiEventToDates(ev);
      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);
      try {
        // Firestore first so a downstream GCal failure can't orphan a GCal event.
        const eventId = await createEvent(user.uid, {
          title: ev.title,
          description: ev.description,
          start: startTs,
          end: endTs,
          allDay: ev.allDay,
          reminderOffsetMinutes: ev.reminderOffsetMinutes,
          source: "manual",
          recurrence: ev.recurrence === "none" ? undefined : ev.recurrence,
          alarmMode: "alarm",
        });
        created += 1;
        if (pushToGcal) {
          try {
            const gcalEventId = await pushEventToGcal({
              title: ev.title,
              description: ev.description,
              start: startTs,
              end: endTs,
              allDay: ev.allDay,
            });
            await updateEvent(user.uid, eventId, { gcalEventId });
            pushed += 1;
          } catch {
            // GCal push failure: keep Firestore event, skip the id link.
          }
        }
      } catch (err) {
        failures.push(
          `${ev.title}: ${err instanceof Error ? err.message : "gagal"}`,
        );
      }
    }

    setApplying(false);
    const parts = [`${created} jadwal ditambahkan`];
    if (pushToGcal) parts.push(`${pushed} pushed ke Google Calendar`);
    if (failures.length) parts.push(`${failures.length} gagal`);
    setMessage({
      ok: failures.length === 0,
      text: parts.join(", "),
    });
    if (failures.length === 0) {
      setEvents(null);
      setSelected(new Set());
      setPrompt("");
    }
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-ink text-on-primary">
            <Sparkles size={18} />
          </span>
          <h2 className="font-display text-3xl text-ink">AI Jadwal</h2>
        </div>
        <p className="text-sm text-muted mb-8">
          Ketik rencana kamu dalam bahasa natural. AI bantu pecah jadi event
          terstruktur yang siap masuk kalender.
        </p>

        <div className="border border-hairline rounded-lg overflow-hidden bg-canvas mb-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Contoh: Senin-Jumat kuliah Kalkulus jam 8-10 pagi. Selasa dan Kamis gym jam 5 sore selama 1 jam..."
            rows={5}
            className="w-full px-4 py-3 text-sm text-ink bg-canvas placeholder:text-muted-soft focus:outline-none resize-none"
            disabled={generating || applying}
          />
          <div className="flex items-center justify-between px-4 py-3 border-t border-hairline bg-surface-soft">
            <span className="text-xs text-muted">
              Model: gpt-4o-mini via GitHub Models
            </span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || applying || !prompt.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold hover:bg-primary-active transition disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Memproses…
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {events === null && !generating ? (
          <div className="text-xs text-muted-soft">
            <p className="mb-2 font-semibold text-muted">Contoh prompt:</p>
            <ul className="space-y-1.5">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="text-left text-body hover:text-ink transition"
                  >
                    "{ex}"
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {events && events.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink">
                Preview ({selected.size} dari {events.length} dipilih)
              </h3>
              <button
                type="button"
                onClick={() => setEvents(null)}
                className="text-xs text-muted hover:text-ink transition inline-flex items-center gap-1"
              >
                <X size={12} />
                Batal
              </button>
            </div>
            <ul className="space-y-2 mb-5">
              {events.map((ev, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => toggleSelected(i)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition ${
                      selected.has(i)
                        ? "border-ink bg-canvas"
                        : "border-hairline bg-surface-soft opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0 ${
                          selected.has(i)
                            ? "bg-ink text-on-primary"
                            : "border border-hairline"
                        }`}
                      >
                        {selected.has(i) ? <Check size={12} /> : null}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {ev.title}
                        </p>
                        {ev.description ? (
                          <p className="text-xs text-muted mt-0.5 truncate">
                            {ev.description}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={11} />
                            {formatDate(ev.startDate)}
                          </span>
                          {!ev.allDay ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} />
                              {ev.startTime} - {ev.endTime}
                            </span>
                          ) : (
                            <span className="text-muted-soft">Sepanjang hari</span>
                          )}
                          {ev.recurrence !== "none" ? (
                            <span className="inline-flex items-center gap-1">
                              <Repeat size={11} />
                              {RECURRENCE_LABEL[ev.recurrence]}
                            </span>
                          ) : null}
                          <span className="text-muted-soft">
                            {REMINDER_LABEL[ev.reminderOffsetMinutes] ??
                              `${ev.reminderOffsetMinutes} menit sebelum`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
              <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushToGcal}
                  onChange={(e) => setPushToGcal(e.target.checked)}
                  className="accent-ink"
                  disabled={applying}
                />
                <CloudUpload size={14} className="text-muted" />
                Sinkron ke Google Calendar
              </label>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying || selected.size === 0}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2 text-sm font-semibold hover:bg-primary-active transition disabled:opacity-50"
              >
                {applying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menambahkan…
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Tambah {selected.size} jadwal
                  </>
                )}
              </button>
            </div>
          </>
        ) : null}

        {message ? (
          <p
            className={`mt-4 text-sm ${
              message.ok ? "text-success" : "text-error"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
