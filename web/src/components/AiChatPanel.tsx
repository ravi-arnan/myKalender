import { Timestamp } from "firebase/firestore";
import {
  ArrowUp,
  Check,
  CloudUpload,
  Clock,
  Loader2,
  Repeat,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { auth } from "../lib/firebase";
import {
  aiEventToDates,
  parseSchedulePrompt,
  type AiParsedEvent,
} from "../lib/ai-schedule";
import { createEvent, updateEvent } from "../lib/firestore-events";
import { pushEventToGcal } from "../lib/gcal-sync";

const EXAMPLE_PROMPTS = [
  "Senin-Jumat saya kuliah Kalkulus jam 8-10 pagi",
  "Selasa dan Kamis gym jam 5 sore selama 1 jam",
  "Meeting BEM tiap Sabtu jam 10",
];

const REFINE_HINTS = [
  "Ubah jam jadi 9 pagi",
  "Tambah reminder 1 jam sebelum",
  "Hapus yang gym",
];

const RECURRENCE_LABEL: Record<AiParsedEvent["recurrence"], string> = {
  none: "Sekali",
  daily: "Tiap hari",
  weekdays: "Hari kerja",
  weekly: "Tiap minggu",
  monthly: "Tiap bulan",
};

const GCAL_TOGGLE_KEY = "mykalender:ai-gcal-toggle";
const SLIDE_MS = 220;

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      events?: AiParsedEvent[];
      selection?: boolean[];
      applied?: boolean;
    }
  | { id: string; role: "error"; text: string };

interface AiChatPanelProps {
  onClose: () => void;
}

export function AiChatPanel({ onClose }: AiChatPanelProps) {
  const user = auth.currentUser!;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [pushToGcal, setPushToGcal] = useState(() => {
    try {
      return localStorage.getItem(GCAL_TOGGLE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // Trigger slide-in on next frame so the initial render starts off-screen.
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-grow the input with its content (WhatsApp-style), capped at a max
  // height beyond which it scrolls.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, SLIDE_MS);
  }, [onClose]);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, generating]);

  useEffect(() => {
    try {
      localStorage.setItem(GCAL_TOGGLE_KEY, pushToGcal ? "1" : "0");
    } catch {
      // ignore
    }
  }, [pushToGcal]);

  // Latest unapplied assistant events feed back into the next AI call as
  // context, so follow-ups like "ubah jam jadi 9 pagi" can refine them.
  function latestUnappliedEvents(): AiParsedEvent[] | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.events && !m.applied) {
        return m.events;
      }
    }
    return undefined;
  }

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || generating) return;
    const context = latestUnappliedEvents();
    setMessages((m) => [
      ...m,
      { id: randomId(), role: "user", text: prompt },
    ]);
    setInput("");
    setGenerating(true);
    try {
      const events = await parseSchedulePrompt(prompt, context);
      setMessages((m) => [
        ...m,
        {
          id: randomId(),
          role: "assistant",
          text:
            events.length === 0
              ? "Saya gak nemu event yang bisa dijadwalkan. Coba kasih detail jam, tanggal, atau pola pengulangan."
              : context
                ? `Update: jadwal sekarang jadi ${events.length} item.`
                : `Saya susun ${events.length} jadwal berikut. Centang yang mau ditambahkan, lalu klik Tambah.`,
          events: events.length > 0 ? events : undefined,
          selection: events.map(() => true),
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: randomId(),
          role: "error",
          text: err instanceof Error ? err.message : "Gagal memanggil AI",
        },
      ]);
    } finally {
      setGenerating(false);
    }
  }, [input, generating, messages]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleEventSelection(msgId: string, eventIndex: number) {
    setMessages((m) =>
      m.map((msg) => {
        if (msg.id !== msgId || msg.role !== "assistant" || !msg.selection) {
          return msg;
        }
        const next = msg.selection.slice();
        next[eventIndex] = !next[eventIndex];
        return { ...msg, selection: next };
      }),
    );
  }

  async function handleApply(msgId: string) {
    const msg = messages.find(
      (m) => m.id === msgId && m.role === "assistant",
    ) as Extract<ChatMessage, { role: "assistant" }> | undefined;
    if (!msg || !msg.events || !msg.selection) return;
    const picked = msg.events.filter((_, i) => msg.selection![i]);
    if (picked.length === 0) return;
    setApplyingId(msgId);
    let created = 0;
    let pushed = 0;
    const failures: string[] = [];

    for (const ev of picked) {
      const { start, end } = aiEventToDates(ev);
      const startTs = Timestamp.fromDate(start);
      const endTs = Timestamp.fromDate(end);
      try {
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
            // GCal push failure: keep Firestore event.
          }
        }
      } catch (err) {
        failures.push(
          `${ev.title}: ${err instanceof Error ? err.message : "gagal"}`,
        );
      }
    }

    const parts = [`${created} jadwal ditambahkan`];
    if (pushToGcal) parts.push(`${pushed} pushed ke Google Calendar`);
    if (failures.length) {
      parts.push(`${failures.length} gagal (${failures.join("; ")})`);
    }

    setMessages((m) => {
      const marked = m.map((msg) =>
        msg.id === msgId && msg.role === "assistant"
          ? { ...msg, applied: true }
          : msg,
      );
      return [
        ...marked,
        {
          id: randomId(),
          role: "assistant" as const,
          text: parts.join(", ") + ".",
        },
      ];
    });
    setApplyingId(null);
  }

  function handleReset() {
    setMessages([]);
    setInput("");
  }

  const hasContext = latestUnappliedEvents() !== undefined;

  return (
    <>
      <div
        className={`fixed inset-0 bg-ink/20 backdrop-blur-sm z-30 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      <aside
        className={`fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-canvas border-l border-hairline shadow-2xl z-40 flex flex-col transition-transform ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ transitionDuration: `${SLIDE_MS}ms` }}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-hairline">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-ink text-on-primary">
              <Sparkles size={14} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink leading-none">
                AI Jadwal
              </p>
              <p className="text-[10px] text-muted-soft mt-0.5">
                gpt-4o-mini via GitHub Models
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={handleReset}
                className="text-muted hover:text-ink p-1.5 rounded-md hover:bg-surface-soft transition"
                aria-label="Reset percakapan"
                title="Reset percakapan"
              >
                <RotateCcw size={14} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleClose}
              className="text-muted hover:text-ink p-1.5 rounded-md hover:bg-surface-soft transition"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <EmptyState
              prompts={EXAMPLE_PROMPTS}
              title="Susun jadwal lewat AI"
              body="Tulis aktivitas mingguan dalam bahasa natural. Saya pecah jadi event terstruktur lengkap dengan recurring dan reminder."
              onPick={(p) => setInput(p)}
            />
          ) : (
            <ul className="space-y-3">
              {messages.map((msg) => (
                <li key={msg.id}>
                  {msg.role === "user" ? (
                    <UserBubble text={msg.text} />
                  ) : msg.role === "error" ? (
                    <ErrorBubble text={msg.text} />
                  ) : (
                    <AssistantBubble
                      message={msg}
                      applying={applyingId === msg.id}
                      onToggleEvent={(i) => toggleEventSelection(msg.id, i)}
                      onApply={() => handleApply(msg.id)}
                    />
                  )}
                </li>
              ))}
              {generating ? (
                <li>
                  <LoadingBubble />
                </li>
              ) : null}
            </ul>
          )}
        </div>

        <div className="border-t border-hairline">
          {hasContext && !generating ? (
            <RefineHints
              hints={REFINE_HINTS}
              onPick={(h) => setInput(h)}
            />
          ) : null}
          {messages.length > 0 ? (
            <div className="px-4 py-2 border-b border-hairline">
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushToGcal}
                  onChange={(e) => setPushToGcal(e.target.checked)}
                  className="accent-ink"
                />
                <CloudUpload size={12} />
                Sinkron ke Google Calendar saat tambah
              </label>
            </div>
          ) : null}
          <div className="p-3">
            <div className="rounded-lg border border-hairline focus-within:border-ink transition bg-canvas">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasContext
                    ? "Refine lagi, misal: ubah jam jadi 9 pagi..."
                    : "Ketik rencana kamu..."
                }
                rows={1}
                disabled={generating}
                className="w-full px-3 py-2.5 text-sm text-ink bg-transparent placeholder:text-muted-soft focus:outline-none resize-none overflow-y-auto"
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[10px] text-muted-soft">
                  Enter kirim, Shift+Enter baris baru
                </span>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={generating || !input.trim()}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-ink text-on-primary disabled:opacity-30 hover:bg-primary-active transition"
                  aria-label="Kirim"
                >
                  {generating ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ArrowUp size={13} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function EmptyState({
  prompts,
  title,
  body,
  onPick,
}: {
  prompts: string[];
  title: string;
  body: string;
  onPick: (p: string) => void;
}) {
  return (
    <div className="text-center py-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-soft mb-3">
        <Sparkles size={20} className="text-ink" />
      </div>
      <p className="text-sm font-medium text-ink mb-1">{title}</p>
      <p className="text-xs text-muted leading-relaxed max-w-xs mx-auto mb-5">
        {body}
      </p>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-soft mb-2">
        Contoh prompt
      </p>
      <div className="flex flex-col gap-1.5 max-w-xs mx-auto">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="text-left text-xs text-body bg-surface-soft hover:bg-surface-card rounded-md px-3 py-2 transition"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function RefineHints({
  hints,
  onPick,
}: {
  hints: string[];
  onPick: (h: string) => void;
}) {
  return (
    <div className="px-3 py-2 border-b border-hairline flex items-center gap-1.5 overflow-x-auto">
      <span className="text-[10px] text-muted-soft uppercase tracking-wider shrink-0">
        Refine
      </span>
      {hints.map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => onPick(h)}
          className="shrink-0 text-[11px] text-body bg-surface-soft hover:bg-surface-card rounded-full px-2.5 py-1 transition"
        >
          {h}
        </button>
      ))}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink text-on-primary px-3.5 py-2 text-sm whitespace-pre-wrap break-words">
        {text}
      </div>
    </div>
  );
}

function ErrorBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-error/10 text-error px-3.5 py-2 text-sm">
        {text}
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-surface-soft px-3.5 py-2.5 text-sm text-muted inline-flex items-center gap-2">
        <Loader2 size={12} className="animate-spin" />
        Memikirkan...
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  applying,
  onToggleEvent,
  onApply,
}: {
  message: Extract<ChatMessage, { role: "assistant" }>;
  applying: boolean;
  onToggleEvent: (index: number) => void;
  onApply: () => void;
}) {
  const hasEvents = (message.events?.length ?? 0) > 0;
  const selected = message.selection ?? [];
  const selectedCount = selected.filter(Boolean).length;

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        <div className="rounded-2xl rounded-bl-md bg-surface-soft px-3.5 py-2 text-sm text-body">
          {message.text}
        </div>
        {hasEvents ? (
          <div className="rounded-xl border border-hairline bg-canvas overflow-hidden">
            <ul className="divide-y divide-hairline">
              {message.events!.map((ev, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onToggleEvent(i)}
                    disabled={message.applied || applying}
                    className={`w-full text-left px-3 py-2.5 transition flex items-start gap-2.5 ${
                      selected[i] ? "bg-canvas" : "bg-surface-soft opacity-60"
                    } disabled:cursor-not-allowed hover:bg-surface-card`}
                  >
                    <span
                      className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded shrink-0 ${
                        selected[i]
                          ? "bg-ink text-on-primary"
                          : "border border-hairline"
                      }`}
                    >
                      {selected[i] ? <Check size={10} /> : null}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink truncate">
                        {ev.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-muted">
                        <span className="inline-flex items-center gap-0.5">
                          <Clock size={9} />
                          {formatEventTime(ev)}
                        </span>
                        {ev.recurrence !== "none" ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Repeat size={9} />
                            {RECURRENCE_LABEL[ev.recurrence]}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-hairline px-3 py-2 bg-surface-soft/50 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">
                {selectedCount} dari {message.events!.length} dipilih
              </span>
              <button
                type="button"
                onClick={onApply}
                disabled={message.applied || applying || selectedCount === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-on-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary-active transition disabled:opacity-40"
              >
                {applying ? (
                  <>
                    <Loader2 size={11} className="animate-spin" />
                    Menambah...
                  </>
                ) : message.applied ? (
                  <>
                    <Check size={11} />
                    Sudah ditambah
                  </>
                ) : (
                  <>
                    <Check size={11} />
                    Tambah {selectedCount}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatEventTime(ev: AiParsedEvent): string {
  const [y, m, d] = ev.startDate.split("-").map(Number);
  const dateStr = new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (ev.allDay) return `${dateStr} sepanjang hari`;
  return `${dateStr}, ${ev.startTime}-${ev.endTime}`;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
