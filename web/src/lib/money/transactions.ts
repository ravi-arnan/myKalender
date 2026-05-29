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
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Transaction, TransactionInput } from "./types";

function txCol(uid: string) {
  return collection(db, "users", uid, "transactions");
}

/**
 * Drops keys whose value is `undefined`. Firestore is initialized without
 * `ignoreUndefinedProperties`, so writing an `undefined` field (e.g. an empty
 * optional `note`) would otherwise throw "Unsupported field value: undefined".
 */
function clean<T extends object>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

export async function createTransaction(
  uid: string,
  input: TransactionInput,
): Promise<string> {
  const ref = await addDoc(txCol(uid), {
    ...clean(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTransaction(
  uid: string,
  txId: string,
  patch: Partial<TransactionInput>,
): Promise<void> {
  // On update, an undefined optional field means "remove it" (e.g. user
  // cleared the note) — use deleteField() so the old value doesn't linger.
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) {
    data[k] = v === undefined ? deleteField() : v;
  }
  await updateDoc(doc(txCol(uid), txId), data);
}

export async function deleteTransaction(
  uid: string,
  txId: string,
): Promise<void> {
  await deleteDoc(doc(txCol(uid), txId));
}

/**
 * Subscribes to every transaction, newest first. For a personal app the volume
 * is small enough to load all at once; this powers both the month list (filtered
 * client-side) and wallet balance computation. If volumes ever grow large, this
 * is the place to switch to a range/paginated query plus denormalized balances.
 */
export function subscribeTransactions(
  uid: string,
  cb: (transactions: Transaction[]) => void,
): () => void {
  const q = query(txCol(uid), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction));
  });
}
