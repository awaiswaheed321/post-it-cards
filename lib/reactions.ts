import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { decryptText, encryptText } from './crypto';

// targetId (a note id OR a comment id) -> (uid -> emoji). End-to-end encrypted.
export type ReactionMap = Record<string, Record<string, string>>;

const reactionId = (targetId: string, uid: string) => `${targetId}__${uid}`;

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
          return { targetId: data.targetId as string, uid: data.uid as string, emoji };
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (seq !== generation) return;
      const map: ReactionMap = {};
      for (const e of entries) {
        if (!e) continue;
        (map[e.targetId] ??= {})[e.uid] = e.emoji;
      }
      cb(map);
    });
  });
}

// Set, change, or clear (emoji === null) the user's reaction on a note or comment.
export async function setReaction(
  targetId: string,
  uid: string,
  emoji: string | null,
  key: CryptoKey,
): Promise<void> {
  const ref = doc(db, 'reactions', reactionId(targetId, uid));
  if (emoji === null) {
    await deleteDoc(ref);
    return;
  }
  const cipher = await encryptText(key, emoji);
  await setDoc(ref, { targetId, uid, cipher: cipher.ct, iv: cipher.iv, updatedAt: serverTimestamp() });
}
