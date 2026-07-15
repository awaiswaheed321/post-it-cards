'use client';

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Note, UserProfile } from '@/lib/types';
import type { ReactionMap } from '@/lib/reactions';
import type { CommentMap } from '@/lib/comments';
import { otherPerson } from '@/lib/note-logic';
import { REACTIONS } from '@/lib/config';
import { Card } from './Card';
import { Comments } from './Comments';

const EMPTY_QUIPS = [
  "no notes yet — someone's gotta make the first move 😏",
  'this board is emptier than my DMs. fix it 💌',
  'be the first to be adorably cringe ✨',
];

export function Deck({
  notes, profiles, reactions, comments, myUid, unseen, onReact, onAddComment,
}: {
  notes: Note[]; // newest first
  profiles: UserProfile[];
  reactions: ReactionMap;
  comments: CommentMap;
  myUid: string;
  unseen: number;
  onReact: (noteId: string, emoji: string) => void;
  onAddComment: (noteId: string, text: string) => Promise<void>;
}) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const foundIndex = currentId ? notes.findIndex((n) => n.id === currentId) : -1;
  const safeIndex = foundIndex >= 0 ? foundIndex : 0;

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  // Which way this gesture is going: 'h' = card swipe (ours), 'v' = scroll/pull-to-
  // refresh (the browser's). Decided once per gesture, on first real movement.
  const dragAxis = useRef<'h' | 'v' | null>(null);
  const [dragX, setDragX] = useState(0);
  // Comments open/closed persists across card swipes (stays open if you left it open).
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [quip] = useState(() => EMPTY_QUIPS[Math.floor(Math.random() * EMPTY_QUIPS.length)]);

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="animate-sway text-6xl drop-shadow-[0_8px_16px_rgba(232,106,152,0.4)]">💌</span>
        <p className="max-w-xs font-display text-2xl font-semibold text-cream/70">{quip}</p>
      </div>
    );
  }

  const meta = (n: Note) => ({
    author: profiles.find((p) => p.uid === n.authorUid),
    recipient: otherPerson(profiles, n.authorUid) ?? profiles.find((p) => p.uid !== n.authorUid),
  });
  const go = (i: number) => setCurrentId(i <= 0 ? null : notes[i].id);

  const center = notes[safeIndex];
  const noteReacts = reactions[center.id] ?? {};
  const myReact = noteReacts[myUid];
  const theirEntry = Object.entries(noteReacts).find(([uid]) => uid !== myUid);
  const theirReact = theirEntry?.[1];
  const theirName = theirEntry
    ? profiles.find((p) => p.uid === theirEntry[0])?.displayName ?? 'them'
    : null;

  const onDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragAxis.current = null;
  };
  const onMove = (e: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (dragAxis.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // too small to judge yet
      dragAxis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    // Horizontal: our card swipe. Vertical: leave it to the browser (card scroll /
    // pull-to-refresh) — touch-action pan-y lets it through, we just don't react.
    if (dragAxis.current === 'h') setDragX(dx);
  };
  const cancelDrag = () => {
    dragStart.current = null;
    dragAxis.current = null;
    setDragX(0);
  };
  const onUp = () => {
    const dx = dragAxis.current === 'h' ? dragX : 0;
    cancelDrag();
    // newer sits on the right, older on the left.
    if (dx < -45 && safeIndex - 1 >= 0) go(safeIndex - 1); // swipe left → newer
    else if (dx > 45 && safeIndex + 1 < notes.length) go(safeIndex + 1); // swipe right → older
  };

  // Over-swiping toward a side with no card: dampen the drag (rubber-band) and
  // glow that edge red to signal "nothing here".
  const atNewest = safeIndex === 0; // nothing newer → right side empty
  const atOldest = safeIndex === notes.length - 1; // nothing older → left side empty
  const emptyRight = atNewest && dragX < 0; // swiping left to reveal the (missing) newer card
  const emptyLeft = atOldest && dragX > 0; // swiping right to reveal the (missing) older card
  const eff = emptyRight || emptyLeft ? dragX * 0.35 : dragX;
  const edgeOpacity = Math.min(Math.abs(dragX) / 130, 0.6);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="h-7">
        {unseen > 0 && safeIndex === 0 && (
          <span className="animate-glow inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber to-rose px-4 py-1.5 font-body text-xs font-extrabold text-[#2a1322] shadow-[0_8px_22px_-6px_rgba(232,106,152,0.7)]">
            💌 {unseen} new {unseen === 1 ? 'note' : 'notes'} for you
          </span>
        )}
      </div>

      {/* Fixed-height viewport so flipping never changes the layout height. Cards
          are a coverflow track: each is positioned by its offset and CSS-transitioned,
          so navigating slides them like turning a page. */}
      <div
        className="relative h-[23rem] w-full max-w-md select-none sm:h-[25rem]"
        // pan-y: vertical touch gestures stay native (scroll inside the card,
        // pull-to-refresh when it's already at the top); horizontal is ours.
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={cancelDrag}
        onPointerLeave={() => { if (dragStart.current !== null) onUp(); }}
      >
        {notes.map((n, i) => {
          const offset = i - safeIndex;
          if (Math.abs(offset) > 2) return null;
          const visible = Math.abs(offset) <= 1;
          // newer (smaller index → negative offset) sits on the RIGHT, older on the LEFT.
          const style: CSSProperties = {
            transform:
              `translate(calc(-50% + ${-offset * 58}% + ${eff}px), -50%)` +
              ` scale(${offset === 0 ? 1 : 0.82}) rotate(${-offset * 5 + eff * 0.015}deg)`,
            opacity: visible ? (offset === 0 ? 1 : 0.5) : 0,
            zIndex: 20 - Math.abs(offset),
            transition: dragStart.current !== null
              ? 'none'
              : 'transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease',
            // The centered card must receive touches so its text can scroll
            // natively (swipes still reach the viewport by bubbling). Side peeks
            // stay inert — they're decoration.
            pointerEvents: offset === 0 ? 'auto' : 'none',
          };
          return (
            <div
              key={n.id}
              className="absolute left-1/2 top-1/2 w-full max-w-sm transform-gpu will-change-transform"
              style={style}
            >
              <Card note={n} animate={false} {...meta(n)} />
            </div>
          );
        })}

        {/* empty-side feedback: red glow when over-swiping past the ends */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-30 w-2/5 rounded-r-3xl"
          style={{
            opacity: emptyRight ? edgeOpacity : 0,
            transition: dragStart.current !== null ? 'none' : 'opacity 0.3s ease',
            background: 'radial-gradient(120% 90% at 100% 50%, rgba(255,70,70,0.85), transparent 70%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-30 w-2/5 rounded-l-3xl"
          style={{
            opacity: emptyLeft ? edgeOpacity : 0,
            transition: dragStart.current !== null ? 'none' : 'opacity 0.3s ease',
            background: 'radial-gradient(120% 90% at 0% 50%, rgba(255,70,70,0.85), transparent 70%)',
          }}
          aria-hidden
        />
      </div>

      {/* reactions — pick yours, see theirs */}
      <div className="flex flex-col items-center gap-2">
        <div className="chip flex items-center gap-0.5 px-2 py-1.5 sm:gap-1">
          {REACTIONS.map((emoji) => {
            const active = myReact === emoji;
            return (
              <button
                key={emoji}
                onClick={() => onReact(center.id, emoji)}
                aria-label={`react ${emoji}`}
                className={`grid h-9 w-9 place-items-center rounded-full text-xl transition ${
                  active ? 'scale-110 bg-white/15' : 'opacity-70 hover:scale-110 hover:opacity-100'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        {(myReact || theirReact) && (
          <div className="flex items-center gap-3 font-body text-xs font-bold text-cream/65">
            {theirReact && (
              <span className="flex items-center gap-1">
                <span className="max-w-[6rem] truncate text-cream/50">{theirName}</span>
                <span className="animate-pop text-base">{theirReact}</span>
              </span>
            )}
            {myReact && (
              <span className="flex items-center gap-1">
                <span className="text-cream/50">you</span>
                <span className="animate-pop text-base">{myReact}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <Comments
        noteId={center.id}
        open={commentsOpen}
        onToggle={() => setCommentsOpen((o) => !o)}
        comments={comments[center.id] ?? []}
        reactions={reactions}
        profiles={profiles}
        myUid={myUid}
        onAdd={(text) => onAddComment(center.id, text)}
        onReact={onReact}
      />

      <div className="flex items-center gap-2 font-body text-sm font-extrabold text-cream">
        <button
          onClick={() => go(safeIndex + 1)}
          disabled={safeIndex >= notes.length - 1}
          className="chip px-4 py-2 transition hover:-translate-x-0.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:translate-x-0"
        >
          ← older
        </button>
        <span className="min-w-[3.5rem] text-center font-hand text-lg font-normal text-creamdim">
          {safeIndex + 1} / {notes.length}
        </span>
        <button
          onClick={() => go(safeIndex - 1)}
          disabled={safeIndex === 0}
          className="chip px-4 py-2 transition hover:translate-x-0.5 hover:bg-white/10 disabled:opacity-30 disabled:hover:translate-x-0"
        >
          newer →
        </button>
      </div>

      <p className="font-hand text-base text-creamdim/70">swipe or use the arrows to flip 👆</p>
    </div>
  );
}
