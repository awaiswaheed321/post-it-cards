'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AuthUser, Note, UserProfile } from '@/lib/types';
import { subscribeNotes, subscribeProfiles, createNote, setLastSeen } from '@/lib/notes';
import { subscribeReactions, setReaction, type ReactionMap } from '@/lib/reactions';
import { subscribeComments, addComment, type CommentMap } from '@/lib/comments';
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
  const [comments, setComments] = useState<CommentMap>({});
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [lastSeenBaseline, setLastSeenBaseline] = useState<number>(Date.now());

  useEffect(() => {
    setLastSeenBaseline(Date.now());
    const unsubNotes = subscribeNotes(encKey, (n) => { setNotes(n); setLoading(false); });
    const unsubProfiles = subscribeProfiles(setProfiles);
    const unsubReactions = subscribeReactions(encKey, setReactions);
    const unsubComments = subscribeComments(encKey, setComments);
    void setLastSeen(user.uid);
    return () => { unsubNotes(); unsubProfiles(); unsubReactions(); unsubComments(); };
  }, [user.uid, encKey]);

  const unseen = useMemo(
    () => unseenCount(notes, user.uid, lastSeenBaseline),
    [notes, user.uid, lastSeenBaseline],
  );

  const onReact = async (targetId: string, emoji: string) => {
    const mine = reactions[targetId]?.[user.uid];
    const next = mine === emoji ? null : emoji;
    // Optimistic: reflect the tap instantly; the subscription confirms it shortly.
    setReactions((prev) => {
      const forTarget = { ...(prev[targetId] ?? {}) };
      if (next === null) delete forTarget[user.uid];
      else forTarget[user.uid] = next;
      return { ...prev, [targetId]: forTarget };
    });
    try {
      await setReaction(targetId, user.uid, next, encKey);
    } catch (err) {
      console.error('reaction failed', err);
    }
  };

  // Close the compose modal on Escape.
  useEffect(() => {
    if (!composing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setComposing(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [composing]);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col gap-5 px-4 py-6 sm:py-8">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold leading-none sm:text-2xl">
          <span className="text-cream">Post-It</span>{' '}
          <span className="bg-gradient-to-r from-amber via-pink to-violet bg-clip-text text-transparent">Cards</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setComposing(true)}
            aria-label="add a note"
            className="btn-candy px-3.5 py-1.5 text-sm"
          >
            ✏️ note
          </button>
          <button
            onClick={onLock}
            title="forget the phrase on this device"
            aria-label="lock"
            className="chip px-2.5 py-1.5 font-body text-xs font-bold text-cream/70 transition hover:bg-white/10 hover:text-cream"
          >
            🔒
          </button>
          <button
            onClick={onSignOut}
            aria-label="sign out"
            className="chip px-2.5 py-1.5 font-body text-xs font-bold text-cream/70 transition hover:bg-white/10 hover:text-cream"
          >
            ↪
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
            comments={comments}
            myUid={user.uid}
            unseen={unseen}
            onReact={onReact}
            onAddComment={(noteId, text) => addComment(noteId, user.uid, text, encKey)}
          />
        )}
      </div>

      {composing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setComposing(false)}
        >
          <div className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="animate-rise relative z-10 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <Compose
              onSend={async (text, color) => {
                const cipher = await encryptText(encKey, text);
                await createNote(user.uid, { cipher, color, style: {} });
                setComposing(false);
              }}
            />
            <button
              onClick={() => setComposing(false)}
              className="mx-auto mt-3 block font-body text-xs font-bold text-cream/70 underline underline-offset-4 hover:text-cream"
            >
              cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
