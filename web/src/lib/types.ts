import { Timestamp } from "firebase/firestore";

export type EventSource = "manual" | "gcal" | "gcal-holiday";

export type AlarmMode = "alarm" | "notification";

export const ALARM_MODE_OPTIONS: { value: AlarmMode; label: string; description: string }[] = [
  {
    value: "alarm",
    label: "Alarm beneran",
    description: "Bunyi keras, layar full-screen, getar, sampai di-matikan.",
  },
  {
    value: "notification",
    label: "Notifikasi biasa",
    description: "Heads-up notif standar, gak loud, gak full-screen.",
  },
];

export const INDONESIAN_HOLIDAY_CALENDAR_ID =
  "id.indonesian#holiday@group.v.calendar.google.com";

export type RecurrencePreset =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly";

export const RECURRENCE_OPTIONS: { value: RecurrencePreset; label: string }[] = [
  { value: "none", label: "Tidak berulang" },
  { value: "daily", label: "Setiap hari" },
  { value: "weekdays", label: "Hari kerja (Sen-Jum)" },
  { value: "weekly", label: "Setiap minggu" },
  { value: "monthly", label: "Setiap bulan" },
];

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Timestamp;
  end: Timestamp;
  allDay: boolean;
  reminderOffsetMinutes: number;
  // Multiple reminders per event. When present (non-empty) this is the source
  // of truth; legacy events without it fall back to [reminderOffsetMinutes].
  reminderOffsetsMinutes?: number[];
  source: EventSource;
  gcalEventId?: string;
  accountEmail?: string;
  recurrence?: RecurrencePreset;
  alarmMode?: AlarmMode;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CalendarEventInput = Omit<
  CalendarEvent,
  "id" | "createdAt" | "updatedAt"
>;

export const REMINDER_OPTIONS = [
  { label: "Tepat waktu", value: 0 },
  { label: "5 menit sebelum", value: 5 },
  { label: "10 menit sebelum", value: 10 },
  { label: "20 menit sebelum", value: 20 },
  { label: "30 menit sebelum", value: 30 },
  { label: "1 jam sebelum", value: 60 },
  { label: "1 hari sebelum", value: 60 * 24 },
] as const;

/**
 * The reminder offsets that actually apply to an event. Returns [] for events
 * opted out of alarms (reminderOffsetMinutes < 0, e.g. imported holidays).
 * Falls back to the single legacy field when the array isn't set.
 */
export function effectiveReminderOffsets(e: {
  reminderOffsetMinutes: number;
  reminderOffsetsMinutes?: number[];
}): number[] {
  if (e.reminderOffsetMinutes < 0) return [];
  const arr = e.reminderOffsetsMinutes?.length
    ? e.reminderOffsetsMinutes
    : [e.reminderOffsetMinutes];
  return [...new Set(arr)].filter((n) => n >= 0).sort((a, b) => a - b);
}
