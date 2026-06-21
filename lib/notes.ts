import {
  collection, doc, addDoc, setDoc, onSnapshot, orderBy, query, serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { decryptText, type Cipher } from './crypto';
import type { Note, UserProfile } from './types';

export interface NewNote {
  cipher: Cipher;
  color: string;
  style: Record<string, unknown>;
}

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

// Subscribe to the shared deck, newest first, decrypting each note's content with
// the provided key. Returns an unsubscribe fn. A note that fails to decrypt (or a
// legacy plaintext note) is handled gracefully rather than crashing the deck.
export function subscribeNotes(key: CryptoKey, cb: (notes: Note[]) => void): () => void {
  const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
  // Decryption is async; guard against a slower earlier snapshot resolving after
  // a newer one and clobbering it. Each snapshot is a full set, so applying only
  // the latest is correct.
  let generation = 0;
  return onSnapshot(q, (snap) => {
    const seq = ++generation;
    void Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        let text: string;
        if (typeof data.cipher === 'string' && typeof data.iv === 'string') {
          try {
            text = await decryptText(key, { ct: data.cipher, iv: data.iv });
          } catch {
            text = '🔒 can’t decrypt this one';
          }
        } else {
          text = typeof data.text === 'string' ? data.text : '';
        }
        return {
          id: d.id,
          authorUid: data.authorUid,
          text,
          color: data.color,
          style: data.style ?? {},
          createdAt: toMillis(data.createdAt),
        } satisfies Note;
      }),
    ).then((notes) => {
      if (seq === generation) cb(notes);
    });
  });
}

export async function createNote(authorUid: string, note: NewNote): Promise<void> {
  await addDoc(collection(db, 'notes'), {
    authorUid,
    cipher: note.cipher.ct,
    iv: note.cipher.iv,
    color: note.color,
    style: note.style ?? {},
    createdAt: serverTimestamp(),
  });
}

export function subscribeProfiles(cb: (profiles: UserProfile[]) => void): () => void {
  return onSnapshot(collection(db, 'users'), (snap) => {
    cb(snap.docs.map((d) => ({
      uid: d.id,
      displayName: d.data().displayName ?? 'Someone',
      photoURL: d.data().photoURL ?? '',
      email: d.data().email ?? '',
    })));
  });
}

export async function setLastSeen(uid: string): Promise<void> {
  await setDoc(doc(db, 'readState', uid), { lastSeenAt: serverTimestamp() }, { merge: true });
}
