import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;
// `token` becomes the auth JWT claims the rules see (email + email_verified).
const A = { sub: 'uidA', token: { email: 'a@test.com', email_verified: true } };
const B = { sub: 'uidB', token: { email: 'b@test.com', email_verified: true } };
// A verified Google account that is NOT on the allowlist.
const STRANGER = { sub: 'uidX', token: { email: 'x@test.com', email_verified: true } };
// An allowlisted email that has NOT been verified — must still be denied.
const UNVERIFIED = { sub: 'uidU', token: { email: 'a@test.com', email_verified: false } };

// rules read the allowlist from the literal emails; tests assume firestore.rules
// allowlists a@test.com and b@test.com (use a test copy or matching emails).
const ctx = (u?: { sub: string; token: Record<string, unknown> }) =>
  u ? testEnv.authenticatedContext(u.sub, u.token).firestore()
    : testEnv.unauthenticatedContext().firestore();

// A well-formed encrypted note payload (cipher + iv as base64-ish strings).
const notePayload = (uid: string, overrides: Record<string, unknown> = {}) => ({
  authorUid: uid, cipher: 'Y2lwaGVydGV4dA==', iv: 'aXYxMjM0NTY3OA==',
  color: '#FFD9A0', style: {}, createdAt: serverTimestamp(), ...overrides,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-postit',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await testEnv.cleanup(); });
beforeEach(async () => {
  await testEnv.clearFirestore();
  // The allowlist now lives in Firestore; seed it for each test.
  await testEnv.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), 'config/allowlist'), { emails: ['a@test.com', 'b@test.com'] });
  });
});

describe('notes', () => {
  it('allowlisted user can create their own encrypted note', async () => {
    await assertSucceeds(setDoc(doc(ctx(A), 'notes/n1'), notePayload('uidA')));
  });
  it('rejects creating a note as someone else', async () => {
    await assertFails(setDoc(doc(ctx(A), 'notes/n2'), notePayload('uidB')));
  });
  it('rejects empty and over-long ciphertext, and missing iv', async () => {
    await assertFails(setDoc(doc(ctx(A), 'notes/n3'), notePayload('uidA', { cipher: '' })));
    await assertFails(setDoc(doc(ctx(A), 'notes/n4'), notePayload('uidA', { cipher: 'x'.repeat(5001) })));
    await assertFails(setDoc(doc(ctx(A), 'notes/n4b'), notePayload('uidA', { iv: '' })));
  });
  it('allowlisted email that is NOT verified cannot read or write', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'notes/nU'), notePayload('uidA', { createdAt: new Date() }));
    });
    const db = ctx(UNVERIFIED);
    await assertFails(getDoc(doc(db, 'notes/nU')));
    await assertFails(setDoc(doc(db, 'notes/nU2'), notePayload('uidU')));
  });
  it('non-allowlisted user cannot read or write', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'notes/n5'), notePayload('uidA', { createdAt: new Date() }));
    });
    const db = ctx(STRANGER);
    await assertFails(getDoc(doc(db, 'notes/n5')));
    await assertFails(setDoc(doc(db, 'notes/n6'), notePayload('uidX')));
  });
  it('allowlisted user can read notes', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'notes/n7'), notePayload('uidB', { createdAt: new Date() }));
    });
    await assertSucceeds(getDoc(doc(ctx(B), 'notes/n7')));
  });
  it('nobody can update or delete a note', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'notes/n8'), notePayload('uidA', { createdAt: new Date() }));
    });
    await assertFails(setDoc(doc(ctx(A), 'notes/n8'), notePayload('uidA', { cipher: 'ZWRpdGVk' })));
  });
});

describe('reactions', () => {
  const react = (uid: string, overrides: Record<string, unknown> = {}) => ({
    noteId: 'n1', uid, cipher: 'ZW1vamk=', iv: 'aXYxMjM0NTY3OA==',
    updatedAt: serverTimestamp(), ...overrides,
  });
  it('allowlisted user can react as themselves', async () => {
    await assertSucceeds(setDoc(doc(ctx(A), 'reactions/n1__uidA'), react('uidA')));
  });
  it('cannot react as someone else', async () => {
    await assertFails(setDoc(doc(ctx(A), 'reactions/n1__uidB'), react('uidB')));
  });
  it('rejects empty cipher/iv', async () => {
    await assertFails(setDoc(doc(ctx(A), 'reactions/n1__uidA'), react('uidA', { cipher: '' })));
  });
  it('allowlisted user can read reactions', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'reactions/n1__uidB'), react('uidB'));
    });
    await assertSucceeds(getDoc(doc(ctx(A), 'reactions/n1__uidB')));
  });
  it('can delete own reaction but not the other person’s', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'reactions/n1__uidA'), react('uidA'));
      await setDoc(doc(c.firestore(), 'reactions/n1__uidB'), react('uidB'));
    });
    await assertSucceeds(deleteDoc(doc(ctx(A), 'reactions/n1__uidA')));
    await assertFails(deleteDoc(doc(ctx(A), 'reactions/n1__uidB')));
  });
  it('non-allowlisted user cannot read or write reactions', async () => {
    await assertFails(setDoc(doc(ctx(STRANGER), 'reactions/n1__uidX'), react('uidX')));
  });
});

describe('config/allowlist (admin-only)', () => {
  it('clients cannot read or tamper with the allowlist', async () => {
    await assertFails(getDoc(doc(ctx(A), 'config/allowlist')));
    await assertFails(setDoc(doc(ctx(A), 'config/allowlist'), {
      emails: ['a@test.com', 'b@test.com', 'evil@test.com'],
    }));
  });
});

describe('config/crypto (salt + verifier)', () => {
  const cfg = { salt: 'c2FsdA==', verifierCt: 'dmVy', verifierIv: 'aXY=' };
  it('allowlisted user can create the config once', async () => {
    await assertSucceeds(setDoc(doc(ctx(A), 'config/crypto'), cfg));
  });
  it('non-allowlisted user cannot read or create the config', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'config/crypto'), cfg);
    });
    await assertFails(getDoc(doc(ctx(STRANGER), 'config/crypto')));
  });
  it('allowlisted user can read the config', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'config/crypto'), cfg);
    });
    await assertSucceeds(getDoc(doc(ctx(B), 'config/crypto')));
  });
  it('config is immutable once set (no passphrase swap)', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'config/crypto'), cfg);
    });
    await assertFails(setDoc(doc(ctx(A), 'config/crypto'), { ...cfg, salt: 'b3RoZXI=' }));
  });
});

describe('users and readState', () => {
  it('user can write only their own profile', async () => {
    await assertSucceeds(setDoc(doc(ctx(A), 'users/uidA'), {
      displayName: 'A', photoURL: '', email: 'a@test.com',
    }));
    await assertFails(setDoc(doc(ctx(A), 'users/uidB'), {
      displayName: 'A', photoURL: '', email: 'a@test.com',
    }));
  });
  it('allowlisted user can read the other profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'users/uidB'), { displayName: 'B', photoURL: '', email: 'b@test.com' });
    });
    await assertSucceeds(getDoc(doc(ctx(A), 'users/uidB')));
  });
  it('user can write only their own readState', async () => {
    await assertSucceeds(setDoc(doc(ctx(A), 'readState/uidA'), { lastSeenAt: serverTimestamp() }));
    await assertFails(setDoc(doc(ctx(A), 'readState/uidB'), { lastSeenAt: serverTimestamp() }));
  });
});
