import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { AuthUser } from './types';

const provider = new GoogleAuthProvider();

function toAuthUser(u: User): AuthUser {
  return {
    uid: u.uid,
    email: (u.email ?? '').toLowerCase(),
    displayName: u.displayName ?? 'Someone',
    photoURL: u.photoURL ?? '',
  };
}

export async function signIn(): Promise<void> {
  await signInWithPopup(auth, provider);
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  return fbOnAuthStateChanged(auth, (u) => cb(u ? toAuthUser(u) : null));
}

// Mirror the signed-in user's Google profile into users/{uid} so both people's
// name/photo are available to render the from→to header.
export async function upsertProfile(user: AuthUser): Promise<void> {
  await setDoc(
    doc(db, 'users', user.uid),
    { displayName: user.displayName, photoURL: user.photoURL, email: user.email },
    { merge: true },
  );
}
