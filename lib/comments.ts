import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { decryptText, encryptText } from './crypto';

export interface Comment {
  id: string;
  noteId: string;
  authorUid: string;
  text: string;
  createdAt: number;
}

// noteId -> comments (oldest first). End-to-end encrypted, like notes.
export type CommentMap = Record<string, Comment[]>;

export const MAX_COMMENT_LENGTH = 500;

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : Date.now();
}

export function subscribeComments(key: CryptoKey, cb: (map: CommentMap) => void): () => void {
  const q = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
  let generation = 0;
  return onSnapshot(q, (snap) => {
    const seq = ++generation;
    void Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        if (typeof data.cipher !== 'string' || typeof data.iv !== 'string') return null;
        try {
          const text = await decryptText(key, { ct: data.cipher, iv: data.iv });
          return {
            id: d.id,
            noteId: data.noteId as string,
            authorUid: data.authorUid as string,
            text,
            createdAt: toMillis(data.createdAt),
          } satisfies Comment;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (seq !== generation) return;
      const map: CommentMap = {};
      for (const c of entries) {
        if (!c) continue;
        (map[c.noteId] ??= []).push(c);
      }
      cb(map);
    });
  });
}

export async function addComment(
  noteId: string,
  authorUid: string,
  text: string,
  key: CryptoKey,
): Promise<void> {
  const cipher = await encryptText(key, text);
  await addDoc(collection(db, 'comments'), {
    noteId,
    authorUid,
    cipher: cipher.ct,
    iv: cipher.iv,
    createdAt: serverTimestamp(),
  });
}
