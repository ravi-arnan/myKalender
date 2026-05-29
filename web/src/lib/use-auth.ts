import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

/**
 * Subscribes to Firebase auth state. Returns the current user (or null) and
 * re-renders on sign-in/sign-out. For public pages that adapt their UI to
 * whether the visitor is already logged in.
 */
export function useAuthUser(): User | null {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}
