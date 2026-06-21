import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Cipher } from './crypto';

// The non-secret crypto parameters for the shared board, stored once at
// config/crypto: a salt (so both devices derive the same key from the passphrase)
// and a verifier (so a device can confirm it has the correct passphrase). Neither
// reveals the passphrase or the key.
export interface CryptoConfig {
  salt: string;
  verifier: Cipher;
}

const ref = () => doc(db, 'config', 'crypto');

export function subscribeCryptoConfig(cb: (cfg: CryptoConfig | null) => void): () => void {
  return onSnapshot(ref(), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const d = snap.data();
    cb({ salt: d.salt, verifier: { ct: d.verifierCt, iv: d.verifierIv } });
  });
}

// Create-only: if the doc already exists (the other person set up first), the
// rules deny the write and this rejects — the caller falls back to unlocking.
export async function createCryptoConfig(cfg: CryptoConfig): Promise<void> {
  await setDoc(ref(), {
    salt: cfg.salt,
    verifierCt: cfg.verifier.ct,
    verifierIv: cfg.verifier.iv,
  });
}
