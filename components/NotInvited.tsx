'use client';

export function NotInvited({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div className="flex flex-col items-center">
        <div
          className="candy-card animate-drop-in mb-9 max-w-xs rotate-2 px-9 py-8 text-grape"
          style={{ backgroundColor: '#FF93B6', ['--glow' as string]: '#FF93B6' }}
        >
          <span className="sticker animate-wiggle">💔</span>
          <p className="font-display text-3xl font-bold">just for two 💛</p>
          <p className="mt-3 font-hand text-xl text-grape/80">
            this little board is full — that account isn’t on the guest list.
          </p>
        </div>
        <button
          onClick={onSignOut}
          className="font-body text-sm font-bold text-creamdim underline underline-offset-4 transition hover:text-cream"
        >
          sign out &amp; try another
        </button>
      </div>
    </main>
  );
}
