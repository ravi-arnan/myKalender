import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * A monthly spending limit for one expense category. Keyed by categoryId as the
 * document id so there is at most one budget per category (simple upsert).
 */
export interface Budget {
  /** Doc id == categoryId. */
  id: string;
  categoryId: string;
  amount: number;
}

function budgetsCol(uid: string) {
  return collection(db, "users", uid, "budgets");
}

/** Create or update the budget for a category. amount<=0 removes it. */
export async function setBudget(
  uid: string,
  categoryId: string,
  amount: number,
): Promise<void> {
  const ref = doc(budgetsCol(uid), categoryId);
  if (amount <= 0) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(
    ref,
    { categoryId, amount, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function subscribeBudgets(
  uid: string,
  cb: (budgets: Budget[]) => void,
): () => void {
  return onSnapshot(budgetsCol(uid), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Budget));
  });
}
