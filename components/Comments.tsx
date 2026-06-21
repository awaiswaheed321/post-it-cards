'use client';

import { useState } from 'react';
import type { Comment } from '@/lib/comments';
import { MAX_COMMENT_LENGTH } from '@/lib/comments';
import type { UserProfile } from '@/lib/types';

export function Comments({
  comments, profiles, myUid, onAdd,
}: {
  comments: Comment[];
  profiles: UserProfile[];
  myUid: string;
  onAdd: (text: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

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
        onClick={() => setOpen((o) => !o)}
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
            <ul className="mb-2 flex max-h-44 flex-col gap-2 overflow-y-auto pr-1">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-white/5 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-body text-xs font-extrabold text-amber">{nameFor(c.authorUid)}</span>
                    <span className="font-body text-[10px] text-cream/35">
                      {new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words font-hand text-lg leading-snug text-cream/90">{c.text}</p>
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
