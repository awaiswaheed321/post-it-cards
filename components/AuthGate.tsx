'use client';

import { useEffect, useState } from 'react';
import type { AuthUser } from '@/lib/types';
import { onAuthChange, signIn, signOut, upsertProfile } from '@/lib/auth';
import { SignInScreen } from './SignInScreen';
import { NotInvited } from './NotInvited';
import { CryptoGate } from './CryptoGate';

type Access = 'checking' | 'allowed' | 'denied';

export function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<Access>('checking');

  useEffect(() => {
    return onAuthChange(async (u) => {
      setUser(u);
      setReady(true);
      if (!u) {
        setAccess('checking');
        return;
      }
      setAccess('checking');
      // The allowlist is enforced server-side (Firestore rules). Probe it by
      // writing our own profile: permission-denied => not invited. Any other
      // failure, let them through and let the live data layer surface it.
      try {
        await upsertProfile(u);
        setAccess('allowed');
      } catch (err) {
        const code = (err as { code?: string }).code;
        setAccess(code === 'permission-denied' ? 'denied' : 'allowed');
      }
    });
  }, []);

  if (!ready || (user && access === 'checking')) {
    return (
      <main className="grid min-h-screen place-items-center font-display text-4xl text-cream/40">
        <span className="animate-sway">…</span>
      </main>
    );
  }
  if (!user) return <SignInScreen onSignIn={() => void signIn()} />;
  if (access === 'denied') return <NotInvited onSignOut={() => void signOut()} />;
  return <CryptoGate user={user} onSignOut={() => void signOut()} />;
}
