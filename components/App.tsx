'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AuthUser, Note, UserProfile } from '@/lib/types';
import { subscribeNotes, subscribeProfiles, createNote, setLastSeen } from '@/lib/notes';
import { subscribeReactions, setReaction, type ReactionMap } from '@/lib/reactions';
import { unseenCount } from '@/lib/note-logic';
import { encryptText } from '@/lib/crypto';
import { Deck } from './Deck';
import { Compose } from './Compose';

export function App({
  user, encKey, onSignOut, onLock,
}: {
  user: AuthUser;
  encKey: CryptoKey;
  onSignOut: () => void;
  onLock: () => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [lastSeenBaseline, setLastSeenBaseline] = useState<number>(Date.now());

  useEffect(() => {
    setLastSeenBaseline(Date.now());
    const unsubNotes = subscribeNotes(encKey, (n) => { setNotes(n); setLoading(false); });
    const unsubProfiles = subscribeProfiles(setProfiles);
    const unsubReactions = subscribeReactions(encKey, setReactions);
    void setLastSeen(user.uid);
    return () => { unsubNotes(); unsubProfiles(); unsubReactions(); };
  }, [user.uid, encKey]);

  const unseen = useMemo(
    () => unseenCount(notes, user.uid, lastSeenBaseline),
    [notes, user.uid, lastSeenBaseline],
  );

  const onReact = async (noteId: string, emoji: string) => {
    const mine = reactions[noteId]?.[user.uid];
    const next = mine === emoji ? null : emoji;
    // Optimistic: reflect the tap instantly; the subscription confirms it shortly.
    setReactions((prev) => {
      const forNote = { ...(prev[noteId] ?? {}) };
      if (next === null) delete forNote[user.uid];
      else forNote[user.uid] = next;
      return { ...prev, [noteId]: forNote };
    });
    try {
      await setReaction(noteId, user.uid, next, encKey);
    } catch (err) {
      console.error('reaction failed', err);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-4 py-6 sm:py-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold leading-none sm:text-3xl">
          <span className="text-cream">Post-It</span>{' '}
          <span className="bg-gradient-to-r from-amber via-pink to-violet bg-clip-text text-transparent">Cards</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onLock}
            title="forget the phrase on this device"
            className="chip px-3 py-1.5 font-body text-xs font-bold text-cream/70 transition hover:bg-white/10 hover:text-cream"
          >
            lock 🔒
          </button>
          <button
            onClick={onSignOut}
            className="chip px-3 py-1.5 font-body text-xs font-bold text-cream/70 transition hover:bg-white/10 hover:text-cream"
          >
            sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col justify-center py-2">
        {loading ? (
          <div className="grid place-items-center py-16 font-display text-3xl text-cream/45">
            <span className="animate-sway">loading…</span>
          </div>
        ) : (
          <Deck
            notes={notes}
            profiles={profiles}
            reactions={reactions}
            myUid={user.uid}
            unseen={unseen}
            onReact={onReact}
          />
        )}
      </div>

      <div className="sticky bottom-3 mt-auto">
        {composing ? (
          <div className="animate-rise">
            <Compose
              onSend={async (text, color) => {
                const cipher = await encryptText(encKey, text);
                await createNote(user.uid, { cipher, color, style: {} });
                setComposing(false);
              }}
            />
            <button
              onClick={() => setComposing(false)}
              className="mx-auto mt-3 block font-body text-xs font-bold text-cream/55 underline underline-offset-4 hover:text-cream"
            >
              never mind
            </button>
          </div>
        ) : (
          <button onClick={() => setComposing(true)} className="btn-candy w-full py-3.5 text-base">
            ✏️ leave a note
          </button>
        )}
      </div>
    </main>
  );
}
