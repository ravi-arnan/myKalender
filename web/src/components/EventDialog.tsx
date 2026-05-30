import { Bell, Calendar, Clock, CloudUpload, FileText, Repeat, Volume2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Timestamp } from "firebase/firestore";
import {
  formatDateInput,
  formatTimeInput,
  parseDateTimeInput,
} from "../lib/date-utils";
import { ALARM_MODE_OPTIONS, RECURRENCE_OPTIONS, REMINDER_OPTIONS } from "../lib/types";
import type {
  AlarmMode,
  CalendarEvent,
  CalendarEventInput,
  RecurrencePreset,
} from "../lib/types";

interface EventDialogProps {
  initialDate: Date;
  existing?: CalendarEvent;
  onClose: () => void;
  onSave: (
    input: CalendarEventInput,
    options: { pushToGcal: boolean },
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function EventDialog({
  initialDate,
  existing,
  onClose,
  onSave,
  onDelete,
}: EventDialogProps) {
  const startDate = existing ? existing.start.toDate() : initialDate;
  const endDate = existing
    ? existing.end.toDate()
    : new Date(initialDate.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [date, setDate] = useState(formatDateInput(startDate));
  const [startTime, setStartTime] = useState(formatTimeInput(startDate));
  const [endTime, setEndTime] = useState(formatTimeInput(endDate));
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(() => {
    const arr = existing?.reminderOffsetsMinutes?.length
      ? existing.reminderOffsetsMinutes
      : [existing?.reminderOffsetMinutes ?? 20];
    return [...new Set(arr)].filter((n) => n >= 0).sort((a, b) => a - b);
  });
  function toggleReminder(value: number) {
    setReminderOffsets((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value].sort((a, b) => a - b),
    );
  }
  const [recurrence, setRecurrence] = useState<RecurrencePreset>(
    existing?.recurrence ?? "none",
  );
  const [pushToGcal, setPushToGcal] = useState(
    Boolean(existing?.gcalEventId && existing?.source === "manual"),
  );
  const [alarmMode, setAlarmMode] = useState<AlarmMode>(
    existing?.alarmMode ?? "alarm",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGcalImport = existing?.source === "gcal";
  const alreadyPushed = Boolean(existing?.gcalEventId && existing?.source === "manual");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Judul wajib diisi");
      return;
    }

    const startDt = allDay
      ? parseDateTimeInput(date, "00:00")
      : parseDateTimeInput(date, startTime);
    const endDt = allDay
      ? parseDateTimeInput(date, "23:59")
      : parseDateTimeInput(date, endTime);

    if (endDt < startDt) {
      setError("Jam selesai harus setelah jam mulai");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          start: Timestamp.fromDate(startDt),
          end: Timestamp.fromDate(endDt),
          allDay,
          reminderOffsetMinutes: reminderOffsets.length
            ? Math.min(...reminderOffsets)
            : 20,
          reminderOffsetsMinutes: reminderOffsets.length ? reminderOffsets : [20],
          source: existing?.source ?? "manual",
          gcalEventId: existing?.gcalEventId,
          recurrence: recurrence === "none" ? undefined : recurrence,
          alarmMode,
        },
        { pushToGcal },
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Hapus jadwal ini?")) return;
    setSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-canvas rounded-xl shadow-2xl w-full max-w-md border border-hairline overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h3 className="font-display text-lg text-ink">
            {existing ? "Edit jadwal" : "Jadwal baru"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1.5 rounded-md hover:bg-surface-soft transition"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="Judul jadwal"
              className="w-full px-0 py-1 border-0 border-b border-hairline focus:outline-none focus:border-ink text-lg text-ink placeholder:text-muted-soft bg-transparent"
            />
          </div>

          <div className="space-y-3">
            <Field icon={<Calendar size={16} />} label="Tanggal">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-body cursor-pointer pl-7">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="accent-ink"
              />
              Sepanjang hari
            </label>

            {allDay ? null : (
              <Field icon={<Clock size={16} />} label="Waktu">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
                  />
                </div>
              </Field>
            )}

            <Field icon={<Bell size={16} />} label="Alarm">
              <div className="flex flex-wrap gap-1.5">
                {REMINDER_OPTIONS.map((opt) => {
                  const active = reminderOffsets.includes(opt.value);
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleReminder(opt.value)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition ${
                        active
                          ? "bg-ink text-on-primary border-ink"
                          : "bg-canvas text-body border-hairline hover:border-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted mt-1.5">
                Pilih satu atau beberapa — alarm berbunyi di tiap waktu.
              </p>
            </Field>

            <Field icon={<Repeat size={16} />} label="Pengulangan">
              <select
                value={recurrence}
                onChange={(e) =>
                  setRecurrence(e.target.value as RecurrencePreset)
                }
                className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas"
              >
                {RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field icon={<Volume2 size={16} />} label="Mode pengingat">
              <div className="grid grid-cols-2 gap-2">
                {ALARM_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAlarmMode(opt.value)}
                    className={`text-left rounded-md border px-3 py-2 transition ${
                      alarmMode === opt.value
                        ? "border-ink bg-ink text-on-primary"
                        : "border-hairline text-body hover:bg-surface-soft hover:text-ink"
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p
                      className={`text-[10px] leading-tight mt-0.5 ${
                        alarmMode === opt.value ? "opacity-80" : "text-muted"
                      }`}
                    >
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </Field>

            {isGcalImport ? null : (
              <Field icon={<CloudUpload size={16} />} label="Google Calendar">
                <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushToGcal}
                    onChange={(e) => setPushToGcal(e.target.checked)}
                    className="accent-ink"
                  />
                  <span>
                    {alreadyPushed
                      ? "Tetap sinkron dengan Google Calendar"
                      : "Sinkronkan ke Google Calendar"}
                  </span>
                </label>
                <p className="text-[11px] text-muted-soft mt-1">
                  {alreadyPushed
                    ? "Uncheck untuk hapus dari Google Calendar (tetap ada di sini)."
                    : "Jadwal ini akan tampil juga di kalender utama Google kamu."}
                </p>
              </Field>
            )}

            <Field icon={<FileText size={16} />} label="Catatan">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Tambah deskripsi (opsional)"
                className="w-full px-3 py-2 rounded-md border border-hairline focus:outline-none focus:border-ink text-sm text-ink bg-canvas resize-none placeholder:text-muted-soft"
              />
            </Field>
          </div>

          {error ? <p className="text-sm text-error">{error}</p> : null}
        </div>

        <div className="px-5 py-4 border-t border-hairline flex items-center justify-between gap-3 bg-surface-soft">
          {existing && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="text-sm font-medium text-error hover:underline disabled:opacity-50"
            >
              Hapus
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-body hover:text-ink rounded-md hover:bg-canvas transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-on-primary hover:bg-primary-active transition disabled:opacity-60"
            >
              {submitting ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 mt-2.5 text-muted">{icon}</div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-muted mb-1">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}
