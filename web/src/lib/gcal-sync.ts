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

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface CalendarListResponse {
  items?: GoogleCalendarEvent[];
}

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

async function fetchPrimaryEvents(token: string, daysAhead: number) {
  const now = new Date();
  const max = new Date();
  max.setDate(now.getDate() + daysAhead);

  const url = new URL(`${CALENDAR_API_BASE}/calendars/primary/events`);
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("timeMax", max.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "200");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(
      `Google Calendar API error: ${response.status} ${response.statusText}`,
    );
  }
  const data = (await response.json()) as CalendarListResponse;
  return data.items ?? [];
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
  daysAhead: number = 30,
): Promise<SyncResult> {
  const events = await fetchPrimaryEvents(accessToken, daysAhead);
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
 * Convenience for the primary signed-in user. Uses the access token cached
 * during Firebase Auth sign-in, refreshing it via signInWithPopup if expired.
 */
export async function syncGoogleCalendar(
  uid: string,
  daysAhead: number = 30,
): Promise<SyncResult> {
  let token = getCachedAccessToken();
  if (!token) {
    const result = await signInWithPopup(auth, googleProvider);
    cacheAccessTokenFromCredential(result);
    token = getCachedAccessToken();
  }
  if (!token) throw new Error("Gagal mendapatkan access token Google");

  const email = auth.currentUser?.email;
  if (!email) throw new Error("User belum sign-in");

  return syncCalendarForAccount(uid, token, email, daysAhead);
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
