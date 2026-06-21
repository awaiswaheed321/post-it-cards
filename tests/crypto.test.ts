import { describe, it, expect } from 'vitest';
import {
  deriveKey, encryptText, decryptText, makeVerifier, checkVerifier,
  exportKeyB64, importKeyB64, randomSaltB64,
} from '../lib/crypto';

describe('crypto', () => {
  it('round-trips text with the same passphrase + salt', async () => {
    const salt = randomSaltB64();
    const key = await deriveKey('correct horse battery', salt);
    const c = await encryptText(key, 'hello 💛 you');
    expect(await decryptText(key, c)).toBe('hello 💛 you');
  });

  it('produces ciphertext that does not contain the plaintext', async () => {
    const key = await deriveKey('pw', randomSaltB64());
    const c = await encryptText(key, 'secret-message');
    expect(c.ct).not.toContain('secret');
  });

  it('uses a fresh IV per encryption', async () => {
    const key = await deriveKey('pw', randomSaltB64());
    const a = await encryptText(key, 'same');
    const b = await encryptText(key, 'same');
    expect(a.iv).not.toEqual(b.iv);
    expect(a.ct).not.toEqual(b.ct);
  });

  it('cannot decrypt with the wrong passphrase', async () => {
    const salt = randomSaltB64();
    const right = await deriveKey('right-phrase', salt);
    const wrong = await deriveKey('wrong-phrase', salt);
    const c = await encryptText(right, 'secret');
    await expect(decryptText(wrong, c)).rejects.toBeTruthy();
  });

  it('verifier matches only for the same derived key', async () => {
    const salt = randomSaltB64();
    const right = await deriveKey('right-phrase', salt);
    const wrong = await deriveKey('wrong-phrase', salt);
    const v = await makeVerifier(right);
    expect(await checkVerifier(right, v)).toBe(true);
    expect(await checkVerifier(wrong, v)).toBe(false);
  });

  it('exported key re-imports and still decrypts (device cache path)', async () => {
    const key = await deriveKey('pw', randomSaltB64());
    const c = await encryptText(key, 'roundtrip');
    const reimported = await importKeyB64(await exportKeyB64(key));
    expect(await decryptText(reimported, c)).toBe('roundtrip');
  });
});
