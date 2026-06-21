'use client';

import { useState } from 'react';

export function UnlockScreen({
  mode, onSubmit, onSignOut, error, busy,
}: {
  mode: 'create' | 'unlock';
  onSubmit: (passphrase: string) => void;
  onSignOut: () => void;
  error: string;
  busy: boolean;
}) {
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const creating = mode === 'create';
  const mismatch = creating && confirm.length > 0 && pass !== confirm;
  const canSubmit = pass.length >= 4 && (!creating || pass === confirm) && !busy;

  const submit = () => { if (canSubmit) onSubmit(pass); };
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };

  // Mask via CSS instead of switching input type, so revealing never resets the
  // caret. (text-security works on Chrome/Safari/Edge.)
  const maskStyle = { WebkitTextSecurity: show ? 'none' : 'disc' } as React.CSSProperties;
  const fieldProps = {
    type: 'text' as const,
    autoComplete: 'off' as const,
    autoCapitalize: 'off' as const,
    autoCorrect: 'off' as const,
    spellCheck: false,
  };

  return (
    <main className="grid min-h-[100dvh] place-items-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="animate-drop-in mb-8 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-pink via-coral to-violet text-3xl shadow-[0_16px_34px_-10px_rgba(140,123,255,0.7)]">
          🔐
        </div>
        <h1 className="animate-rise font-display text-4xl font-bold text-cream">
          {creating ? 'set your secret phrase' : 'unlock the board'}
        </h1>
        <p className="animate-rise mt-3 font-hand text-xl leading-snug text-creamdim [animation-delay:0.1s]">
          {creating
            ? 'pick a phrase you both agree on. it never leaves your device — if you both forget it, the notes are gone for good.'
            : 'type the phrase the two of you agreed on.'}
        </p>

        <div className="animate-rise mt-8 w-full [animation-delay:0.18s]">
          <div className="relative mb-3">
            <input
              {...fieldProps}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={creating ? undefined : onEnter}
              placeholder="secret phrase"
              autoFocus
              style={maskStyle}
              className="field-soft w-full px-4 py-3.5 pr-12 font-body"
            />
            <button
              type="button"
              // Don't steal focus from the input — keeps the mobile keyboard open.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'hide phrase' : 'show phrase'}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-lg transition hover:bg-white/10"
            >
              {show ? '🙈' : '👁️'}
            </button>
          </div>
          {creating && (
            <input
              {...fieldProps}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={onEnter}
              placeholder="type it again"
              style={maskStyle}
              className="field-soft mb-3 w-full px-4 py-3.5 font-body"
            />
          )}

          <div className="mb-3 h-4 font-body text-xs font-bold text-pink">
            {mismatch ? "those don't match yet" : error}
          </div>

          <button onClick={submit} disabled={!canSubmit} className="btn-candy w-full py-3.5 text-base">
            {busy ? 'working…' : creating ? 'lock it in' : 'unlock'}
          </button>
        </div>

        <button
          onClick={onSignOut}
          className="mt-6 font-body text-xs font-bold text-creamdim underline underline-offset-4 hover:text-cream"
        >
          sign out
        </button>
      </div>
    </main>
  );
}
