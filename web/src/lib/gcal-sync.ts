import { signInWithPopup } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import {
  auth,
  cacheAccessTokenFromCredential,
  getCachedAccessToken,
  googleProvider,
} from "./firebase";
import { upsertEventById } from "./firestore-events";
import { markAccountSynced } from "./connected-accounts";
import { INDONESIAN_HOLIDAY_CALENDAR_ID } from "./types";

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface CalendarListResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
}

interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_DAYS_AHEAD = 365;

async function fetchCalendarEvents(
  token: string,
  calendarId: string,
  daysAhead: number,
): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const max = new Date();
  max.setDate(now.getDate() + daysAhead);

  const all: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.set("timeMin", now.toISOString());
    url.searchParams.set("timeMax", max.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(
        `Google Calendar API error (${calendarId}): ${response.status} ${response.statusText}`,
      );
    }
    const data = (await response.json()) as CalendarListResponse;
    all.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

function toTimestamp(value: { dateTime?: string; date?: string } | undefined):
  | { ts: Timestamp; allDay: boolean }
  | null {
  if (!value) return null;
  if (value.dateTime) {
    return { ts: Timestamp.fromDate(new Date(value.dateTime)), allDay: false };
  }
  if (value.date) {
    return {
      ts: Timestamp.fromDate(new Date(`${value.date}T00:00:00`)),
      allDay: true,
    };
  }
  return null;
}

export interface SyncResult {
  imported: number;
  skipped: number;
  holidaysImported?: number;
}

/**
 * Syncs Google Calendar events for one specific account. The caller provides
 * the OAuth access token and the account's email — both come from either
 * Firebase Auth (primary user) or GIS (additional connected accounts).
 */
export async function syncCalendarForAccount(
  uid: string,
  accessToken: string,
  accountEmail: string,
  daysAhead: number = DEFAULT_DAYS_AHEAD,
): Promise<SyncResult> {
  const events = await fetchCalendarEvents(accessToken, "primary", daysAhead);
  const normalizedEmail = accountEmail.toLowerCase();

  let imported = 0;
  let skipped = 0;

  for (const ev of events) {
    if (ev.status === "cancelled") {
      skipped += 1;
      continue;
    }
    const start = toTimestamp(ev.start);
    const end = toTimestamp(ev.end);
    if (!start || !end) {
      skipped += 1;
      continue;
    }
    const docId = `gcal_${normalizedEmail}_${ev.id}`;
    await upsertEventById(uid, docId, {
      title: ev.summary?.trim() || "(tanpa judul)",
      description: ev.description?.trim() || undefined,
      start: start.ts,
      end: end.ts,
      allDay: start.allDay,
      reminderOffsetMinutes: 20,
      source: "gcal",
      gcalEventId: ev.id,
      accountEmail: normalizedEmail,
    });
    imported += 1;
  }

  await markAccountSynced(uid, normalizedEmail).catch(() => {
    // best-effort, account may not be in connectedAccounts (primary user)
  });

  return { imported, skipped };
}

/**
 * Imports Indonesian national holidays from Google's public calendar. Stored
 * with source="gcal-holiday" so the alarm scheduler can skip them — we want
 * holidays visible in the calendar but not waking anyone up at midnight.
 */
export async function syncIndonesianHolidays(
  uid: string,
  accessToken: string,
  daysAhead: number = DEFAULT_DAYS_AHEAD,
): Promise<{ imported: number; skipped: number }> {
  const events = await fetchCalendarEvents(
    accessToken,
    INDONESIAN_HOLIDAY_CALENDAR_ID,
    daysAhead,
  );
  let imported = 0;
  let skipped = 0;

  for (const ev of events) {
    if (ev.status === "cancelled") {
      skipped += 1;
      continue;
    }
    const start = toTimestamp(ev.start);
    const end = toTimestamp(ev.end);
    if (!start || !end) {
      skipped += 1;
      continue;
    }
    const docId = `gcal_holiday_${ev.id}`;
    await upsertEventById(uid, docId, {
      title: ev.summary?.trim() || "(libur)",
      description: ev.description?.trim() || undefined,
      start: start.ts,
      end: end.ts,
      allDay: start.allDay,
      // Sentinel value: alarm scheduler skips events with negative offset.
      reminderOffsetMinutes: -1,
      source: "gcal-holiday",
      gcalEventId: ev.id,
      accountEmail: "holidays",
    });
    imported += 1;
  }

  return { imported, skipped };
}

async function ensurePrimaryToken(): Promise<string> {
  let token = getCachedAccessToken();
  if (!token) {
    const result = await signInWithPopup(auth, googleProvider);
    cacheAccessTokenFromCredential(result);
    token = getCachedAccessToken();
  }
  if (!token) throw new Error("Gagal mendapatkan access token Google");
  return token;
}

/**
 * Convenience for the primary signed-in user. Syncs both their main calendar
 * and the Indonesian national holidays calendar, both 1 year ahead.
 */
export async function syncGoogleCalendar(
  uid: string,
  daysAhead: number = DEFAULT_DAYS_AHEAD,
): Promise<SyncResult> {
  const token = await ensurePrimaryToken();
  const email = auth.currentUser?.email;
  if (!email) throw new Error("User belum sign-in");

  const primary = await syncCalendarForAccount(uid, token, email, daysAhead);
  // Holidays are best-effort: if the user hasn't subscribed to the calendar or
  // the API call fails, we still consider the main sync a success.
  let holidaysImported = 0;
  try {
    const result = await syncIndonesianHolidays(uid, token, daysAhead);
    holidaysImported = result.imported;
  } catch (e) {
    console.warn("Holidays sync gagal:", e);
  }

  return { ...primary, holidaysImported };
}

function toGcalDateField(
  ts: { toDate: () => Date },
  allDay: boolean,
): { dateTime?: string; date?: string } {
  const d = ts.toDate();
  if (allDay) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return { date: `${y}-${m}-${day}` };
  }
  return { dateTime: d.toISOString() };
}

/** Creates a new event on the primary user's Google Calendar. Returns gcalEventId. */
export async function pushEventToGcal(input: {
  title: string;
  description?: string;
  start: { toDate: () => Date };
  end: { toDate: () => Date };
  allDay: boolean;
}): Promise<string> {
  const token = await ensurePrimaryToken();
  const body: GoogleCalendarEventInput = {
    summary: input.title,
    description: input.description,
    start: toGcalDateField(input.start, input.allDay),
    end: toGcalDateField(input.end, input.allDay),
  };
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(`GCal push error: ${response.status} ${response.statusText}`);
  }
  const created = (await response.json()) as GoogleCalendarEvent;
  return created.id;
}

export async function updateGcalEvent(
  gcalEventId: string,
  input: {
    title: string;
    description?: string;
    start: { toDate: () => Date };
    end: { toDate: () => Date };
    allDay: boolean;
  },
): Promise<void> {
  const token = await ensurePrimaryToken();
  const body: GoogleCalendarEventInput = {
    summary: input.title,
    description: input.description,
    start: toGcalDateField(input.start, input.allDay),
    end: toGcalDateField(input.end, input.allDay),
  };
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(gcalEventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok && response.status !== 410) {
    // 410 Gone = already deleted, treat as success
    throw new Error(`GCal update error: ${response.status}`);
  }
}

export async function deleteGcalEvent(gcalEventId: string): Promise<void> {
  const token = await ensurePrimaryToken();
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(gcalEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok && response.status !== 410 && response.status !== 404) {
    throw new Error(`GCal delete error: ${response.status}`);
  }
}
