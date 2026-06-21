'use client';

import { useEffect, useRef, useState } from 'react';
import type { AuthUser } from '@/lib/types';
import { subscribeCryptoConfig, createCryptoConfig, type CryptoConfig } from '@/lib/crypto-store';
import {
  deriveKey, makeVerifier, checkVerifier, exportKeyB64, importKeyB64, randomSaltB64,
} from '@/lib/crypto';
import { UnlockScreen } from './UnlockScreen';
import { App } from './App';

const CACHE_KEY = 'postit.enckey';

// Gate between auth and the app: ensures the shared encryption key is established
// (first-time setup) or unlocked (returning) before any notes are shown. The key
// lives only in React state + this device's localStorage; it is never sent anywhere.
export function CryptoGate({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [config, setConfig] = useState<CryptoConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const triedCache = useRef(false);
  // If this device has a cached key, show the loader (not the unlock screen) until
  // we've tried to restore it — avoids a flash of "enter your passphrase".
  const [restoring, setRestoring] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem(CACHE_KEY) !== null; }
    catch { return false; }
  });

  useEffect(() => {
    return subscribeCryptoConfig((cfg) => { setConfig(cfg); setConfigLoaded(true); });
  }, []);

  // Once the config is known, try restoring a cached key. Runs exactly once.
  useEffect(() => {
    if (triedCache.current || !configLoaded || key) return;
    triedCache.current = true;
    void (async () => {
      try {
        let cached: string | null = null;
        try { cached = localStorage.getItem(CACHE_KEY); } catch { cached = null; }
        if (cached && config) {
          const k = await importKeyB64(cached);
          if (await checkVerifier(k, config.verifier)) { setKey(k); return; }
        }
        // No cache, stale cache, or no board config yet — drop any stale key.
        if (cached) { try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ } }
      } catch {
        try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
      } finally {
        setRestoring(false);
      }
    })();
  }, [configLoaded, config, key]);

  async function cacheAndSet(k: CryptoKey) {
    try { localStorage.setItem(CACHE_KEY, await exportKeyB64(k)); } catch { /* private mode, etc. */ }
    setKey(k);
  }

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
        await cacheAndSet(k);
      } else {
        // Returning: derive against the stored salt and verify.
        const k = await deriveKey(passphrase, config.salt);
        if (await checkVerifier(k, config.verifier)) await cacheAndSet(k);
        else setError('that phrase doesn’t match. try again.');
      }
    } catch {
      setError('something went wrong. try again.');
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    triedCache.current = true; // don't auto-restore after an explicit lock
    setRestoring(false);
    setKey(null);
  }

  if (!configLoaded || (restoring && !key)) {
    return (
      <main className="grid min-h-screen place-items-center font-display text-3xl text-cream/40">
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
  return <App user={user} encKey={key} onSignOut={onSignOut} onLock={lock} />;
}
