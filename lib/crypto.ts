// End-to-end encryption primitives (Web Crypto API — works in browser and Node 20+).
//
// Model: a shared passphrase, agreed out-of-band by the two people, is stretched
// with PBKDF2 into an AES-GCM-256 key. The passphrase and key never leave the
// device; Firebase only ever stores ciphertext + IV + a non-secret salt/verifier.

export interface Cipher {
  ct: string; // base64 ciphertext (includes the GCM auth tag)
  iv: string; // base64 12-byte nonce
}

const VERIFIER_PLAINTEXT = 'post-it-cards-verifier-v1';
const PBKDF2_ITERATIONS = 210000;

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomSaltB64(): string {
  return bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so the derived key can be cached on-device
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<Cipher> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { ct: bytesToB64(new Uint8Array(ctBuf)), iv: bytesToB64(iv) };
}

export async function decryptText(key: CryptoKey, cipher: Cipher): Promise<string> {
  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(cipher.iv) },
    key,
    b64ToBytes(cipher.ct),
  );
  return dec.decode(ptBuf);
}

// A verifier lets a second device confirm it derived the *same* key (correct
// passphrase) without the server ever seeing the passphrase or key.
export async function makeVerifier(key: CryptoKey): Promise<Cipher> {
  return encryptText(key, VERIFIER_PLAINTEXT);
}

export async function checkVerifier(key: CryptoKey, verifier: Cipher): Promise<boolean> {
  try {
    return (await decryptText(key, verifier)) === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

export async function exportKeyB64(key: CryptoKey): Promise<string> {
  return bytesToB64(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

export async function importKeyB64(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    b64ToBytes(b64),
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}
