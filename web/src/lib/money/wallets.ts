import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Wallet, WalletInput } from "./types";

function walletsCol(uid: string) {
  return collection(db, "users", uid, "wallets");
}

export async function createWallet(
  uid: string,
  input: WalletInput,
): Promise<string> {
  const ref = await addDoc(walletsCol(uid), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateWallet(
  uid: string,
  walletId: string,
  patch: Partial<WalletInput>,
): Promise<void> {
  await updateDoc(doc(walletsCol(uid), walletId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWallet(
  uid: string,
  walletId: string,
): Promise<void> {
  await deleteDoc(doc(walletsCol(uid), walletId));
}

export function subscribeWallets(
  uid: string,
  cb: (wallets: Wallet[]) => void,
): () => void {
  const q = query(walletsCol(uid), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Wallet));
  });
}
