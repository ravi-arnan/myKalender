import { Timestamp } from "firebase/firestore";

export type EventSource = "manual" | "gcal" | "gcal-holiday";

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
  source: EventSource;
  gcalEventId?: string;
  accountEmail?: string;
  recurrence?: RecurrencePreset;
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
