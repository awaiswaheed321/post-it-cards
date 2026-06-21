'use client';

export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center p-6">
      <div className="flex flex-col items-center text-center">
        <p className="animate-rise mb-3 font-body text-xs font-extrabold uppercase tracking-[0.35em] text-violet">
          just the two of us
        </p>
        <h1 className="animate-rise font-display text-7xl font-bold leading-[0.92] [animation-delay:0.08s] sm:text-8xl">
          <span className="text-cream">Post-It</span>
          <br />
          <span className="bg-gradient-to-r from-amber via-pink to-violet bg-clip-text text-transparent">Cards</span>
        </h1>
        <p className="animate-rise mt-5 max-w-xs font-hand text-2xl text-creamdim [animation-delay:0.18s]">
          tiny notes, left for each other — soft, secret, and just ours 💌
        </p>

        <button
          onClick={onSignIn}
          className="btn-candy animate-rise mt-10 flex items-center gap-2.5 px-8 py-4 text-lg [animation-delay:0.32s]"
        >
          <GoogleMark /> Sign in with Google
        </button>

        <p className="animate-rise mt-6 font-body text-xs font-bold text-creamdim/70 [animation-delay:0.45s]">
          🔒 end-to-end encrypted · invite-only
        </p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.9 2.5 2.8 6.6 2.8 12S6.9 21.5 12 21.5c5.3 0 8.8-3.7 8.8-9 0-.6-.06-1-.15-1.5H12z" />
      </svg>
    </span>
  );
}
