'use client';

import { useState } from 'react';
import { NOTE_COLORS, MAX_NOTE_LENGTH } from '@/lib/config';
import { validateNoteText } from '@/lib/note-logic';

const PROMPTS = [
  'write something mushy…',
  'spill the tea ☕',
  'leave a lil smooch 💋',
  'say the unhinged thing 🙃',
  'brag about them…',
  "what's on your mind, lover?",
  'be cute, it’s allowed 💛',
  'tiny love crime 💌',
];

export function Compose({ onSend }: { onSend: (text: string, color: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  const valid = validateNoteText(text, MAX_NOTE_LENGTH).ok;

  async function send() {
    const result = validateNoteText(text, MAX_NOTE_LENGTH);
    if (!result.ok) return;
    setSending(true);
    setError('');
    try {
      await onSend(result.value, color);
      setText('');
    } catch {
      setError("couldn't send — try again");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        className="absolute -inset-4 rounded-[40px] opacity-45 blur-3xl"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div
        className="candy-card relative rotate-[1deg] px-6 pb-4 pt-6 text-grape"
        style={{ backgroundColor: color, ['--glow' as string]: color }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_NOTE_LENGTH}
          rows={3}
          placeholder={prompt}
          className="w-full resize-none bg-transparent font-hand text-2xl leading-snug text-grape placeholder:text-grape/35 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`color ${c}`}
                className={`h-6 w-6 rounded-full border-2 border-white/70 shadow-sm transition hover:scale-110 ${
                  c === color ? 'ring-2 ring-grape/60 ring-offset-1' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={send}
            disabled={!valid || sending}
            className="btn-candy px-5 py-2 text-sm"
          >
            {sending ? 'sending…' : 'send it 💌'}
          </button>
        </div>
        <div className="mt-1.5 flex justify-between font-body text-[11px] font-bold text-grape/55">
          <span className="text-[#c0285a]">{error}</span>
          <span>{text.trim().length}/{MAX_NOTE_LENGTH}</span>
        </div>
      </div>
    </div>
  );
}
