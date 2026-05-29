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
import type { CustomCategory } from "./categories";
import type { TransactionType } from "./types";

export type CustomCategoryInput = Omit<CustomCategory, "id">;

function categoriesCol(uid: string) {
  return collection(db, "users", uid, "categories");
}

export function subscribeCategories(
  uid: string,
  cb: (categories: CustomCategory[]) => void,
): () => void {
  const q = query(categoriesCol(uid), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          label: data.label as string,
          kind: data.kind as TransactionType,
          color: data.color as string,
          icon: (data.icon as string) ?? "tag",
        };
      }),
    );
  });
}

export async function createCategory(
  uid: string,
  input: CustomCategoryInput,
): Promise<void> {
  await addDoc(categoriesCol(uid), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCategory(
  uid: string,
  id: string,
  input: CustomCategoryInput,
): Promise<void> {
  await updateDoc(doc(categoriesCol(uid), id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(categoriesCol(uid), id));
}
