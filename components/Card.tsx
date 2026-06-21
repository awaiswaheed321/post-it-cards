'use client';

import type { Note, UserProfile } from '@/lib/types';

const STICKERS = ['💖', '⭐', '🌸', '✨', '🍓', '🌈', '💫', '🧡'];

function stickerFor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return STICKERS[sum % STICKERS.length];
}

function Avatar({ profile }: { profile?: UserProfile }) {
  if (profile?.photoURL) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={profile.photoURL}
        alt={profile.displayName}
        className="h-7 w-7 rounded-full ring-2 ring-white/80"
      />
    );
  }
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/60 text-sm ring-2 ring-white/70">
      🙂
    </span>
  );
}

export function Card({
  note, author, recipient, animate = true,
}: {
  note: Note;
  author?: UserProfile;
  recipient?: UserProfile;
  animate?: boolean;
}) {
  const when = note.createdAt
    ? new Date(note.createdAt).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '';

  return (
    <div className={`relative mx-auto w-full max-w-sm transform-gpu ${animate ? 'animate-drop-in' : ''}`}>
      {/* vivid colour glow so the card pops off the page (own GPU layer so it
          composites instead of re-rasterising the blur during a swipe) */}
      <div
        className="absolute -inset-5 transform-gpu rounded-[44px] opacity-55 blur-2xl"
        style={{ backgroundColor: note.color }}
        aria-hidden
      />
      <div
        className="candy-card relative -rotate-[1.5deg] px-7 pb-8 pt-9 text-grape"
        style={{ backgroundColor: note.color, ['--glow' as string]: note.color }}
      >
        <span className="sticker animate-wiggle">{stickerFor(note.id)}</span>

        <div className="mb-4 flex items-center justify-between gap-2 font-body text-xs font-extrabold text-grape/70">
          <span className="flex items-center gap-1.5">
            <Avatar profile={author} />
            <span className="max-w-[5.5rem] truncate">{author?.displayName ?? 'Someone'}</span>
          </span>
          <span className="font-display text-base font-semibold text-grape/45">→</span>
          <span className="flex items-center gap-1.5">
            <span className="max-w-[5.5rem] truncate">{recipient?.displayName ?? '…'}</span>
            <Avatar profile={recipient} />
          </span>
        </div>

        <p className="min-h-[5.5rem] whitespace-pre-wrap break-words font-hand text-[1.85rem] leading-snug text-grape">
          {note.text}
        </p>

        <p className="mt-5 text-right font-body text-[11px] font-extrabold uppercase tracking-wide text-grape/45">
          {when}
        </p>
      </div>
    </div>
  );
}
