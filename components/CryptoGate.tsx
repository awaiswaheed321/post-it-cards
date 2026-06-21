'use client';

import { useEffect, useState } from 'react';
import type { AuthUser } from '@/lib/types';
import { subscribeCryptoConfig, createCryptoConfig, type CryptoConfig } from '@/lib/crypto-store';
import { deriveKey, makeVerifier, checkVerifier, randomSaltB64 } from '@/lib/crypto';
import { UnlockScreen } from './UnlockScreen';
import { App } from './App';

// Gate between auth and the app. The derived encryption key lives ONLY in memory
// (React state) — it is never written to disk. So the passphrase is required on
// every fresh load (reload / new tab / sign-in) and is gone the moment you sign
// out or lock. That's a deliberate second layer of security on top of Google auth.
export function CryptoGate({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [config, setConfig] = useState<CryptoConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return subscribeCryptoConfig((cfg) => { setConfig(cfg); setConfigLoaded(true); });
  }, []);

  async function handleSubmit(passphrase: string) {
    setBusy(true);
    setError('');
    try {
      if (!config) {
        // First-time setup: establish salt + verifier for the board.
        const salt = randomSaltB64();
        const k = await deriveKey(passphrase, salt);
        const verifier = await makeVerifier(k);
        try {
          await createCryptoConfig({ salt, verifier });
        } catch {
          // The other person set it up first; the subscription will deliver the
          // real config — ask them to enter the agreed phrase against it.
          setError('the board was just set up — enter the agreed phrase.');
          return;
        }
        setKey(k);
      } else {
        // Returning: derive against the stored salt and verify.
        const k = await deriveKey(passphrase, config.salt);
        if (await checkVerifier(k, config.verifier)) setKey(k);
        else setError('that phrase doesn’t match. try again.');
      }
    } catch {
      setError('something went wrong. try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!configLoaded) {
    return (
      <main className="grid min-h-[100dvh] place-items-center font-display text-3xl text-cream/40">
        <span className="animate-sway">…</span>
      </main>
    );
  }
  if (!key) {
    return (
      <UnlockScreen
        mode={config ? 'unlock' : 'create'}
        onSubmit={handleSubmit}
        onSignOut={onSignOut}
        error={error}
        busy={busy}
      />
    );
  }
  return <App user={user} encKey={key} onSignOut={onSignOut} onLock={() => setKey(null)} />;
}
