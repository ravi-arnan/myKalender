import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { createEvent, deleteEvent, updateEvent } from "../firestore-events";
import { createTransaction } from "./transactions";
import type { AlarmMode, CalendarEventInput } from "../types";
import type { Timestamp as TS } from "firebase/firestore";

/**
 * A recurring bill. Each bill owns a linked monthly CalendarEvent (in the
 * shared `events` collection) so the existing alarm/reminder pipeline — web
 * notifications and Android AlarmManager — fires it with no extra code.
 * Marking a bill paid records an expense transaction.
 */
export interface Bill {
  id: string;
  name: string;
  amount: number;
  walletId: string;
  categoryId: string;
  /** Day of month the bill is due (1–31; clamped to month length). */
  dayOfMonth: number;
  reminderOffsetMinutes: number;
  alarmMode: AlarmMode;
  /** Id of the linked CalendarEvent that drives the alarm. */
  eventId: string;
  /** "YYYY-MM" of the last month this bill was marked paid. */
  lastPaidYM?: string;
  createdAt: TS;
  updatedAt: TS;
}

/** eventId is managed internally; lastPaidYM is set by markBillPaid. */
export type BillInput = Omit<
  Bill,
  "id" | "eventId" | "lastPaidYM" | "createdAt" | "updatedAt"
>;

function billsCol(uid: string) {
  return collection(db, "users", uid, "bills");
}

export function currentYM(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Next future date matching dayOfMonth, at the given hour (default 09:00). */
export function nextDueDate(dayOfMonth: number, atHour = 9, now = new Date()): Date {
  const build = (year: number, month: number) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(dayOfMonth, lastDay), atHour, 0, 0, 0);
  };
  let due = build(now.getFullYear(), now.getMonth());
  if (due.getTime() <= now.getTime()) {
    due = build(now.getFullYear(), now.getMonth() + 1); // rolls over Dec→Jan
  }
  return due;
}

/** Builds the CalendarEvent that drives a bill's recurring alarm. */
function billEventInput(input: BillInput): CalendarEventInput {
  const start = nextDueDate(input.dayOfMonth);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    title: `Tagihan: ${input.name}`,
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
    allDay: false,
    reminderOffsetMinutes: input.reminderOffsetMinutes,
    source: "manual",
    recurrence: "monthly",
    alarmMode: input.alarmMode,
  };
}

export async function createBill(uid: string, input: BillInput): Promise<string> {
  // Create the linked alarm event first so we can store its id on the bill.
  const eventId = await createEvent(uid, billEventInput(input));
  const ref = await addDoc(billsCol(uid), {
    ...input,
    eventId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBill(
  uid: string,
  billId: string,
  eventId: string,
  input: BillInput,
): Promise<void> {
  // Keep the linked event in sync (recomputes next due date from dayOfMonth).
  await updateEvent(uid, eventId, billEventInput(input));
  await updateDoc(doc(billsCol(uid), billId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBill(uid: string, bill: Bill): Promise<void> {
  await deleteEvent(uid, bill.eventId);
  await deleteDoc(doc(billsCol(uid), bill.id));
}

/** Records the bill as an expense for this month and stamps lastPaidYM. */
export async function markBillPaid(uid: string, bill: Bill): Promise<void> {
  await createTransaction(uid, {
    type: "expense",
    amount: bill.amount,
    walletId: bill.walletId,
    categoryId: bill.categoryId,
    date: Timestamp.now(),
    note: `Bayar ${bill.name}`,
  });
  await updateDoc(doc(billsCol(uid), bill.id), {
    lastPaidYM: currentYM(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeBills(
  uid: string,
  cb: (bills: Bill[]) => void,
): () => void {
  const q = query(billsCol(uid), orderBy("dayOfMonth", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bill));
  });
}
