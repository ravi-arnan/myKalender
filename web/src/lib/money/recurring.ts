import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { currentYM } from "./bills";
import { upsertTransactionById } from "./transactions";

/**
 * A recurring income/expense template (e.g. salary, a subscription). Unlike a
 * Bill — which reminds you with an alarm and waits for "Tandai lunas" — a
 * recurring transaction auto-posts a transaction on its monthly due date with
 * no confirmation. There's no server cron, so posting is a catch-up that runs
 * when the money screen loads (see {@link postDueRecurring}).
 */
export interface RecurringTransaction {
  id: string;
  name: string;
  type: "income" | "expense";
  /** Positive integer rupiah; `type` carries the sign. */
  amount: number;
  walletId: string;
  categoryId: string;
  /** 1-31, clamped to the month length when posting. */
  dayOfMonth: number;
  note?: string;
  /** When false, posting is paused (the template is kept). */
  active: boolean;
  /** "YYYY-MM" of the last month auto-posted; prevents double posting. */
  lastPostedYM?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type RecurringTransactionInput = Omit<
  RecurringTransaction,
  "id" | "lastPostedYM" | "createdAt" | "updatedAt"
>;

function recurringCol(uid: string) {
  return collection(db, "users", uid, "recurringTransactions");
}

export async function createRecurring(
  uid: string,
  input: RecurringTransactionInput,
): Promise<string> {
  const data: Record<string, unknown> = {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.note === undefined) delete data.note;
  const ref = await addDoc(recurringCol(uid), data);
  return ref.id;
}

export async function updateRecurring(
  uid: string,
  id: string,
  patch: Partial<RecurringTransactionInput & { lastPostedYM: string }>,
): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) {
    data[k] = v === undefined ? deleteField() : v;
  }
  await updateDoc(doc(recurringCol(uid), id), data);
}

export async function deleteRecurring(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(recurringCol(uid), id));
}

export function subscribeRecurring(
  uid: string,
  cb: (items: RecurringTransaction[]) => void,
): () => void {
  const q = query(recurringCol(uid), orderBy("dayOfMonth", "asc"));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as RecurringTransaction,
      ),
    );
  });
}

/** The day this month a template posts, clamped to the month's length. */
export function dueDayThisMonth(dayOfMonth: number, now = new Date()): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.min(dayOfMonth, lastDay);
}

/**
 * Posts this month's occurrence for any active template whose due day has
 * arrived and that hasn't been posted yet. Idempotent: the transaction id is
 * `recur_{id}_{YM}`, so re-runs (or a concurrent web+Android run) don't double
 * post. Stamps `lastPostedYM` so the UI can show "posted this month".
 */
export async function postDueRecurring(
  uid: string,
  items: RecurringTransaction[],
  now = new Date(),
): Promise<void> {
  const ym = currentYM(now);
  for (const rt of items) {
    if (!rt.active) continue;
    if (rt.lastPostedYM === ym) continue;
    const day = dueDayThisMonth(rt.dayOfMonth, now);
    if (now.getDate() < day) continue; // due day not reached yet
    const dueDate = new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0, 0);
    await upsertTransactionById(uid, `recur_${rt.id}_${ym}`, {
      type: rt.type,
      amount: rt.amount,
      walletId: rt.walletId,
      categoryId: rt.categoryId,
      date: Timestamp.fromDate(dueDate),
      note: rt.note ?? rt.name,
    });
    await updateRecurring(uid, rt.id, { lastPostedYM: ym });
  }
}
