import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ConnectedAccount {
  email: string;
  name?: string;
  picture?: string;
  addedAt?: Timestamp;
  lastSyncedAt?: Timestamp;
}

function accountsCol(uid: string) {
  return collection(db, "users", uid, "connectedAccounts");
}

/** Doc id is the account's email (URL-safe enough for Firestore). */
function accountDocId(email: string): string {
  return email.toLowerCase();
}

export async function upsertConnectedAccount(
  uid: string,
  account: { email: string; name?: string; picture?: string },
): Promise<void> {
  await setDoc(
    doc(accountsCol(uid), accountDocId(account.email)),
    {
      email: account.email,
      name: account.name ?? null,
      picture: account.picture ?? null,
      addedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function markAccountSynced(uid: string, email: string): Promise<void> {
  await setDoc(
    doc(accountsCol(uid), accountDocId(email)),
    { lastSyncedAt: serverTimestamp() },
    { merge: true },
  );
}

export function subscribeConnectedAccounts(
  uid: string,
  cb: (accounts: ConnectedAccount[]) => void,
): () => void {
  return onSnapshot(accountsCol(uid), (snap) => {
    const list = snap.docs.map((d) => ({ ...(d.data() as ConnectedAccount) }));
    cb(list);
  });
}

/**
 * Removes a connected account and deletes all of that account's synced events
 * from /users/{uid}/events. Manual events (source="manual") are untouched.
 */
export async function disconnectAccount(uid: string, email: string): Promise<void> {
  // Delete events for this account.
  const eventsCol = collection(db, "users", uid, "events");
  const q = query(
    eventsCol,
    where("source", "==", "gcal"),
    where("accountEmail", "==", email.toLowerCase()),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  for (const d of snap.docs) batch.delete(d.ref);
  batch.delete(doc(accountsCol(uid), accountDocId(email)));
  await batch.commit();
}
