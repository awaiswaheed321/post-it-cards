'use client';

import { useEffect, useState } from 'react';
import type { Comment } from '@/lib/comments';
import { MAX_COMMENT_LENGTH } from '@/lib/comments';
import type { ReactionMap } from '@/lib/reactions';
import { REACTIONS } from '@/lib/config';
import type { UserProfile } from '@/lib/types';

export function Comments({
  noteId, open, onToggle, comments, reactions, profiles, myUid, onAdd, onReact,
}: {
  noteId: string;
  open: boolean;
  onToggle: () => void;
  comments: Comment[];
  reactions: ReactionMap;
  profiles: UserProfile[];
  myUid: string;
  onAdd: (text: string) => Promise<void>;
  onReact: (targetId: string, emoji: string) => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // The panel no longer remounts per card, so clear the draft when the card changes.
  useEffect(() => { setText(''); }, [noteId]);

  const nameFor = (uid: string) =>
    uid === myUid ? 'you' : profiles.find((p) => p.uid === uid)?.displayName ?? 'them';

  async function send() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onAdd(value);
      setText('');
    } catch {
      /* keep text so they can retry */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        onClick={onToggle}
        className="chip mx-auto flex items-center gap-1.5 px-4 py-1.5 font-body text-xs font-bold text-cream/80 transition hover:bg-white/10"
      >
        💬 {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'comments'}
        <span className="text-[10px] text-cream/50">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="animate-rise mt-2 rounded-2xl border border-cream/10 bg-black/20 p-3 backdrop-blur-sm">
          {comments.length === 0 ? (
            <p className="py-3 text-center font-hand text-lg text-cream/45">no comments yet — say something 💬</p>
          ) : (
            <ul className="mb-2 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-white/5 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-body text-xs font-extrabold text-amber">{nameFor(c.authorUid)}</span>
                    <span className="font-body text-[10px] text-cream/35">
                      {new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words font-hand text-lg leading-snug text-cream/90">{c.text}</p>
                  <CommentReactions map={reactions[c.id] ?? {}} myUid={myUid} onReact={(emoji) => onReact(c.id, emoji)} />
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="add a comment…"
              className="field-soft min-w-0 flex-1 px-3 py-2 font-body text-sm"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!text.trim() || sending}
              className="btn-candy shrink-0 px-4 py-2 text-xs"
            >
              {sending ? '…' : 'send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentReactions({
  map, myUid, onReact,
}: {
  map: Record<string, string>;
  myUid: string;
  onReact: (emoji: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const mine = map[myUid];
  const reacted = Object.entries(map); // [uid, emoji]

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {reacted.map(([uid, emoji]) => (
        <span
          key={uid}
          title={uid === myUid ? 'you' : 'them'}
          className={`rounded-full px-1.5 py-0.5 text-sm leading-none ${uid === myUid ? 'bg-white/15' : 'bg-white/5'}`}
        >
          {emoji}
        </span>
      ))}
      {picking ? (
        <span className="flex items-center gap-0.5 rounded-full bg-black/30 px-1 py-0.5">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onReact(emoji); setPicking(false); }}
              className={`grid h-6 w-6 place-items-center rounded-full text-sm transition hover:scale-110 ${
                mine === emoji ? 'bg-white/20' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label="react to comment"
          className="grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs text-cream/55 transition hover:bg-white/10 hover:text-cream"
        >
          ☺
        </button>
      )}
    </div>
  );
}
