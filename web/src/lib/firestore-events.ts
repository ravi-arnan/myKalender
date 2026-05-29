import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CalendarEvent, CalendarEventInput } from "./types";

function eventsCol(uid: string) {
  return collection(db, "users", uid, "events");
}

export async function createEvent(
  uid: string,
  input: CalendarEventInput,
): Promise<string> {
  const ref = await addDoc(eventsCol(uid), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(
  uid: string,
  eventId: string,
  patch: Partial<CalendarEventInput>,
): Promise<void> {
  await updateDoc(doc(eventsCol(uid), eventId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEvent(
  uid: string,
  eventId: string,
): Promise<void> {
  await deleteDoc(doc(eventsCol(uid), eventId));
}

/**
 * Upserts an event at a deterministic doc id. Used by GCal sync so that
 * re-syncing the same event updates instead of creating duplicates.
 */
export async function upsertEventById(
  uid: string,
  eventId: string,
  input: CalendarEventInput,
): Promise<void> {
  await setDoc(
    doc(eventsCol(uid), eventId),
    {
      ...input,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeEventsInRange(
  uid: string,
  rangeStart: Date,
  rangeEnd: Date,
  cb: (events: CalendarEvent[]) => void,
): () => void {
  const q = query(
    eventsCol(uid),
    where("start", ">=", Timestamp.fromDate(rangeStart)),
    where("start", "<=", Timestamp.fromDate(rangeEnd)),
    orderBy("start", "asc"),
  );
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CalendarEvent,
    );
    cb(events);
  });
}
