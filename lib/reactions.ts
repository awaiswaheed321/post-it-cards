import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { decryptText, encryptText } from './crypto';

// noteId -> (uid -> emoji). Reactions are end-to-end encrypted, just like notes.
export type ReactionMap = Record<string, Record<string, string>>;

const reactionId = (noteId: string, uid: string) => `${noteId}__${uid}`;

export function subscribeReactions(key: CryptoKey, cb: (map: ReactionMap) => void): () => void {
  let generation = 0;
  return onSnapshot(collection(db, 'reactions'), (snap) => {
    const seq = ++generation;
    void Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        if (typeof data.cipher !== 'string' || typeof data.iv !== 'string') return null;
        try {
          const emoji = await decryptText(key, { ct: data.cipher, iv: data.iv });
          return { noteId: data.noteId as string, uid: data.uid as string, emoji };
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (seq !== generation) return;
      const map: ReactionMap = {};
      for (const e of entries) {
        if (!e) continue;
        (map[e.noteId] ??= {})[e.uid] = e.emoji;
      }
      cb(map);
    });
  });
}

// Set, change, or clear (emoji === null) the current user's reaction on a note.
export async function setReaction(
  noteId: string,
  uid: string,
  emoji: string | null,
  key: CryptoKey,
): Promise<void> {
  const ref = doc(db, 'reactions', reactionId(noteId, uid));
  if (emoji === null) {
    await deleteDoc(ref);
    return;
  }
  const cipher = await encryptText(key, emoji);
  await setDoc(ref, { noteId, uid, cipher: cipher.ct, iv: cipher.iv, updatedAt: serverTimestamp() });
}
