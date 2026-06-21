# Post-It Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private two-person "post-it cards" web app — a shared chronological deck of notes behind Google sign-in, deployed statically to GitHub Pages.

**Architecture:** Next.js static export (client-side only, mirrors the sibling Portfolio project) talking directly to Firebase Auth + Cloud Firestore from the browser. Pure logic (allowlist, unseen-count, validation) is isolated and unit-tested; Firestore security rules are tested against the emulator; UI is React components polished with the frontend-design skill. The two allowlisted emails are the only human-supplied setup.

**Tech Stack:** Next.js 16 (App Router, `output: 'export'`), React 19, TypeScript, Tailwind CSS, Firebase JS SDK v11 (modular), Vitest, `@firebase/rules-unit-testing` + Firebase emulator, GitHub Actions → GitHub Pages.

---

## File Structure

```
post-it-cards/
  package.json                      # deps + scripts
  next.config.mjs                   # static export config
  tsconfig.json
  tailwind.config.ts
  postcss.config.mjs
  vitest.config.ts
  firebase.json                     # firestore emulator config
  firestore.rules                   # security rules (source of truth for the allowlist server-side)
  .env.example                      # documents required NEXT_PUBLIC_* vars
  .gitignore
  .github/workflows/deploy.yaml     # build + deploy to Pages
  app/
    layout.tsx                      # root layout, fonts, metadata
    page.tsx                        # 'use client' entry: wires AuthGate → App
    globals.css                     # tailwind + base theme
  lib/
    types.ts                        # Note, NoteInput, UserProfile, AuthUser
    config.ts                       # reads NEXT_PUBLIC_* env (firebase config + allowlist)
    allowlist.ts                    # isAllowlisted(email) — pure
    note-logic.ts                   # validateNoteText, unseenCount, otherPerson — pure
    firebase.ts                     # initializes app/auth/db (singleton)
    auth.ts                         # signIn, signOut, onAuthStateChanged wrapper, upsertprofile
    notes.ts                        # subscribeNotes, createNote, subscribeProfiles, setLastSeen
  components/
    SignInScreen.tsx                # "Sign in with Google" landing
    NotInvited.tsx                  # rejection screen for non-allowlisted
    AuthGate.tsx                    # routes between sign-in / not-invited / app
    App.tsx                         # authenticated shell: Deck + Compose + sign-out
    Deck.tsx                        # card stack, flip nav, unseen badge, live updates
    Card.tsx                        # single post-it: from→to header, text, color
    Compose.tsx                     # color picker + text input + send
  tests/
    allowlist.test.ts
    note-logic.test.ts
    rules.test.ts                   # firestore rules via emulator
  README.md                         # setup + deploy instructions
```

**Responsibilities:** `lib/*` is logic and Firebase access (no JSX); `components/*` is presentation + interaction; pure logic lives in `allowlist.ts`/`note-logic.ts` so it's testable without Firebase or a DOM.

---

## Task 1: Scaffold the Next.js static-export project

**Files:**
- Create: `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "post-it-cards",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:rules": "firebase emulators:exec --only firestore \"vitest run tests/rules.test.ts\""
  },
  "dependencies": {
    "firebase": "^11.0.0",
    "next": "^16.2.6",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^4.0.1",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "autoprefixer": "^10",
    "eslint": "^9",
    "eslint-config-next": "^16.2.6",
    "firebase-tools": "^13.0.0",
    "postcss": "^8",
    "tailwindcss": "^3.4.0",
    "typescript": "^5",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `next.config.mjs`** (matches Portfolio's static-export setup)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `postcss.config.mjs`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Create `tailwind.config.ts`** (warm, cozy palette)

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8EE',
        warmth: '#FFE3C2',
        cocoa: '#5B4636',
      },
      fontFamily: {
        hand: ['"Patrick Hand"', 'ui-rounded', 'system-ui', 'cursive'],
      },
      rotate: { 1.5: '1.5deg', '-1.5': '-1.5deg' },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Create `app/globals.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Nunito:wght@400;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-cream text-cocoa;
  font-family: 'Nunito', system-ui, sans-serif;
}
```

- [ ] **Step 7: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Post-It Cards',
  description: 'Little notes, just for the two of us.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create a placeholder `app/page.tsx`** (replaced in Task 10)

```tsx
export default function Home() {
  return <main className="grid min-h-screen place-items-center">Post-It Cards</main>;
}
```

- [ ] **Step 9: Create `.gitignore`**

```
node_modules/
.next/
out/
.env
.env.local
*.log
.firebase/
firebase-debug.log
firestore-debug.log
```

- [ ] **Step 10: Install and verify the build**

Run: `npm install && npm run build`
Expected: build succeeds and produces an `out/` directory with `index.html`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js static-export project with Tailwind"
```

---

## Task 2: Types and config

**Files:**
- Create: `lib/types.ts`, `lib/config.ts`, `.env.example`

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export interface Note {
  id: string;
  authorUid: string;
  text: string;
  color: string;
  style: Record<string, unknown>;
  createdAt: number; // epoch ms (converted from Firestore Timestamp)
}

export type NoteInput = Pick<Note, 'text' | 'color' | 'style'>;

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}
```

- [ ] **Step 2: Create `lib/config.ts`**

```ts
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Comma-separated list of the two allowed emails, lower-cased.
export const allowlistEmails: string[] = (process.env.NEXT_PUBLIC_ALLOWLIST_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const MAX_NOTE_LENGTH = 280;

export const NOTE_COLORS = ['#FFD9A0', '#FFB3BA', '#BAE1FF', '#BAFFC9', '#E5C6FF', '#FFF5BA'];
```

- [ ] **Step 3: Create `.env.example`**

```
# Firebase web config (public — safe to expose; security is enforced by Firestore rules)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# The two allowed sign-in emails, comma separated, e.g. a@gmail.com,b@gmail.com
NEXT_PUBLIC_ALLOWLIST_EMAILS=
```

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/config.ts .env.example
git commit -m "feat: add shared types and env-driven config"
```

---

## Task 3: Pure logic (TDD) — allowlist

**Files:**
- Create: `lib/allowlist.ts`, `tests/allowlist.test.ts`, `vitest.config.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Write the failing test — `tests/allowlist.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isAllowlisted } from '../lib/allowlist';

const ALLOW = ['a@gmail.com', 'b@gmail.com'];

describe('isAllowlisted', () => {
  it('accepts an allowlisted email regardless of case/whitespace', () => {
    expect(isAllowlisted('A@Gmail.com ', ALLOW)).toBe(true);
  });
  it('rejects an unknown email', () => {
    expect(isAllowlisted('stranger@gmail.com', ALLOW)).toBe(false);
  });
  it('rejects null/empty email', () => {
    expect(isAllowlisted(null, ALLOW)).toBe(false);
    expect(isAllowlisted('', ALLOW)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/allowlist.test.ts`
Expected: FAIL — cannot find module `../lib/allowlist`.

- [ ] **Step 4: Implement `lib/allowlist.ts`**

```ts
export function isAllowlisted(email: string | null | undefined, allowlist: string[]): boolean {
  if (!email) return false;
  return allowlist.includes(email.trim().toLowerCase());
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/allowlist.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/allowlist.ts tests/allowlist.test.ts vitest.config.ts
git commit -m "feat: add allowlist check with tests"
```

---

## Task 4: Pure logic (TDD) — note validation, unseen count, other-person

**Files:**
- Create: `lib/note-logic.ts`, `tests/note-logic.test.ts`

- [ ] **Step 1: Write the failing test — `tests/note-logic.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { validateNoteText, unseenCount, otherPerson } from '../lib/note-logic';
import type { Note, UserProfile } from '../lib/types';

const note = (id: string, authorUid: string, createdAt: number): Note => ({
  id, authorUid, createdAt, text: 'hi', color: '#FFD9A0', style: {},
});

describe('validateNoteText', () => {
  it('accepts non-empty text within the cap', () => {
    expect(validateNoteText('hello', 280)).toEqual({ ok: true, value: 'hello' });
  });
  it('trims surrounding whitespace', () => {
    expect(validateNoteText('  hi  ', 280)).toEqual({ ok: true, value: 'hi' });
  });
  it('rejects empty/whitespace-only text', () => {
    expect(validateNoteText('   ', 280).ok).toBe(false);
  });
  it('rejects text longer than the cap', () => {
    expect(validateNoteText('x'.repeat(281), 280).ok).toBe(false);
  });
});

describe('unseenCount', () => {
  const notes = [note('1', 'me', 100), note('2', 'them', 200), note('3', 'them', 300)];
  it('counts notes from others newer than lastSeen', () => {
    expect(unseenCount(notes, 'me', 150)).toBe(2);
  });
  it('never counts your own notes', () => {
    expect(unseenCount(notes, 'them', 0)).toBe(1); // only note 1 (from "me")
  });
  it('returns 0 when caught up', () => {
    expect(unseenCount(notes, 'me', 999)).toBe(0);
  });
});

describe('otherPerson', () => {
  const me: UserProfile = { uid: 'me', displayName: 'Me', photoURL: '', email: 'm@x.com' };
  const them: UserProfile = { uid: 'them', displayName: 'Them', photoURL: '', email: 't@x.com' };
  it('returns the profile that is not the current uid', () => {
    expect(otherPerson([me, them], 'me')?.uid).toBe('them');
  });
  it('returns undefined when the other profile is missing', () => {
    expect(otherPerson([me], 'me')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/note-logic.test.ts`
Expected: FAIL — cannot find module `../lib/note-logic`.

- [ ] **Step 3: Implement `lib/note-logic.ts`**

```ts
import type { Note, UserProfile } from './types';

export type ValidationResult = { ok: true; value: string } | { ok: false; reason: string };

export function validateNoteText(raw: string, max: number): ValidationResult {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, reason: 'empty' };
  if (value.length > max) return { ok: false, reason: 'too-long' };
  return { ok: true, value };
}

export function unseenCount(notes: Note[], myUid: string, lastSeenAt: number): number {
  return notes.filter((n) => n.authorUid !== myUid && n.createdAt > lastSeenAt).length;
}

export function otherPerson(profiles: UserProfile[], myUid: string): UserProfile | undefined {
  return profiles.find((p) => p.uid !== myUid);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/note-logic.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/note-logic.ts tests/note-logic.test.ts
git commit -m "feat: add note validation, unseen-count, other-person logic with tests"
```

---

## Task 5: Firestore security rules (TDD via emulator)

**Files:**
- Create: `firestore.rules`, `firebase.json`, `tests/rules.test.ts`

- [ ] **Step 1: Create `firebase.json`**

```json
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "firestore": { "port": 8080 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

- [ ] **Step 2: Write the failing rules test — `tests/rules.test.ts`**

> Replace the two emails in `firestore.rules` (next step) with the real allowlist before deploying; the test uses its own.

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;
const A = { sub: 'uidA', email: 'a@test.com' };
const B = { sub: 'uidB', email: 'b@test.com' };
const STRANGER = { sub: 'uidX', email: 'x@test.com' };

// rules read the allowlist from the literal emails; tests assume firestore.rules
// allowlists a@test.com and b@test.com (use a test copy or matching emails).
const ctx = (u?: { sub: string; email: string }) =>
  u ? testEnv.authenticatedContext(u.sub, { email: u.email }).firestore()
    : testEnv.unauthenticatedContext().firestore();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-postit',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { await testEnv.cleanup(); });
beforeEach(async () => { await testEnv.clearFirestore(); });

describe('notes', () => {
  it('allowlisted user can create their own note', async () => {
    const db = ctx(A);
    await assertSucceeds(setDoc(doc(db, 'notes/n1'), {
      authorUid: 'uidA', text: 'hi', color: '#FFD9A0', style: {}, createdAt: serverTimestamp(),
    }));
  });
  it('rejects creating a note as someone else', async () => {
    const db = ctx(A);
    await assertFails(setDoc(doc(db, 'notes/n2'), {
      authorUid: 'uidB', text: 'hi', color: '#FFD9A0', style: {}, createdAt: serverTimestamp(),
    }));
  });
  it('rejects empty and over-long text', async () => {
    const db = ctx(A);
    await assertFails(setDoc(doc(db, 'notes/n3'), {
      authorUid: 'uidA', text: '', color: '#FFD9A0', style: {}, createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(db, 'notes/n4'), {
      authorUid: 'uidA', text: 'x'.repeat(281), color: '#FFD9A0', style: {}, createdAt: serverTimestamp(),
    }));
  });
  it('non-allowlisted user cannot read or write', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'notes/n5'), {
        authorUid: 'uidA', text: 'hi', color: '#FFD9A0', style: {}, createdAt: new Date(),
      });
    });
    const db = ctx(STRANGER);
    await assertFails(getDoc(doc(db, 'notes/n5')));
    await assertFails(setDoc(doc(db, 'notes/n6'), {
      authorUid: 'uidX', text: 'hi', color: '#FFD9A0', style: {}, createdAt: serverTimestamp(),
    }));
  });
  it('allowlisted user can read notes', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'notes/n7'), {
        authorUid: 'uidB', text: 'hi', color: '#FFD9A0', style: {}, createdAt: new Date(),
      });
    });
    await assertSucceeds(getDoc(doc(ctx(B), 'notes/n7')));
  });
  it('nobody can update or delete a note', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'notes/n8'), {
        authorUid: 'uidA', text: 'hi', color: '#FFD9A0', style: {}, createdAt: new Date(),
      });
    });
    const db = ctx(A);
    await assertFails(setDoc(doc(db, 'notes/n8'), {
      authorUid: 'uidA', text: 'edited', color: '#FFD9A0', style: {}, createdAt: serverTimestamp(),
    }));
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
```

- [ ] **Step 3: Create `firestore.rules`**

> The two emails below are the allowlist. Swap them for the real pair at setup (and update the test emails or keep a matching test copy).

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function allowlist() {
      return ['a@test.com', 'b@test.com'];
    }
    function isAllowed() {
      return request.auth != null && request.auth.token.email in allowlist();
    }
    function validNote() {
      return request.resource.data.authorUid == request.auth.uid
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 280;
    }

    match /notes/{noteId} {
      allow read: if isAllowed();
      allow create: if isAllowed() && validNote();
      allow update, delete: if false;
    }

    match /users/{uid} {
      allow read: if isAllowed();
      allow write: if isAllowed() && request.auth.uid == uid;
    }

    match /readState/{uid} {
      allow read, write: if isAllowed() && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 4: Run the rules tests against the emulator**

Run: `npx firebase emulators:exec --only firestore "npx vitest run tests/rules.test.ts"`
Expected: emulator boots, all rules tests PASS.
(If `firebase` needs a project, the `--project demo-postit` flag or the `projectId` in the test env covers it; no login required for the emulator.)

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firebase.json tests/rules.test.ts
git commit -m "feat: add Firestore security rules with emulator tests"
```

---

## Task 6: Firebase initialization and auth layer

**Files:**
- Create: `lib/firebase.ts`, `lib/auth.ts`

- [ ] **Step 1: Create `lib/firebase.ts`** (singleton init, safe under HMR)

```ts
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
```

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { AuthUser } from './types';

const provider = new GoogleAuthProvider();

function toAuthUser(u: User): AuthUser {
  return {
    uid: u.uid,
    email: (u.email ?? '').toLowerCase(),
    displayName: u.displayName ?? 'Someone',
    photoURL: u.photoURL ?? '',
  };
}

export async function signIn(): Promise<void> {
  await signInWithPopup(auth, provider);
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  return fbOnAuthStateChanged(auth, (u) => cb(u ? toAuthUser(u) : null));
}

// Mirror the signed-in user's Google profile into users/{uid} so both people's
// name/photo are available to render the from→to header.
export async function upsertProfile(user: AuthUser): Promise<void> {
  await setDoc(
    doc(db, 'users', user.uid),
    { displayName: user.displayName, photoURL: user.photoURL, email: user.email },
    { merge: true },
  );
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase.ts lib/auth.ts
git commit -m "feat: add Firebase init and Google auth layer"
```

---

## Task 7: Notes data layer

**Files:**
- Create: `lib/notes.ts`

- [ ] **Step 1: Create `lib/notes.ts`**

```ts
import {
  collection, doc, addDoc, setDoc, onSnapshot, orderBy, query, serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Note, NoteInput, UserProfile } from './types';

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

// Subscribe to the shared deck, newest first. Returns an unsubscribe fn.
export function subscribeNotes(cb: (notes: Note[]) => void): () => void {
  const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const notes: Note[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        authorUid: data.authorUid,
        text: data.text,
        color: data.color,
        style: data.style ?? {},
        createdAt: toMillis(data.createdAt),
      };
    });
    cb(notes);
  });
}

export async function createNote(authorUid: string, input: NoteInput): Promise<void> {
  await addDoc(collection(db, 'notes'), {
    authorUid,
    text: input.text,
    color: input.color,
    style: input.style ?? {},
    createdAt: serverTimestamp(),
  });
}

export function subscribeProfiles(cb: (profiles: UserProfile[]) => void): () => void {
  return onSnapshot(collection(db, 'users'), (snap) => {
    cb(snap.docs.map((d) => ({
      uid: d.id,
      displayName: d.data().displayName ?? 'Someone',
      photoURL: d.data().photoURL ?? '',
      email: d.data().email ?? '',
    })));
  });
}

export async function setLastSeen(uid: string): Promise<void> {
  await setDoc(doc(db, 'readState', uid), { lastSeenAt: serverTimestamp() }, { merge: true });
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/notes.ts
git commit -m "feat: add Firestore notes data layer"
```

---

## Task 8: Sign-in and rejection screens

**Files:**
- Create: `components/SignInScreen.tsx`, `components/NotInvited.tsx`

> Functional, warm-styled components. The frontend-design skill polishes the look during the UI pass.

- [ ] **Step 1: Create `components/SignInScreen.tsx`**

```tsx
'use client';

export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <div className="mb-4 inline-block -rotate-2 rounded-md bg-warmth px-6 py-4 shadow-md">
          <h1 className="font-hand text-3xl text-cocoa">Post-It Cards</h1>
          <p className="mt-1 text-sm text-cocoa/70">little notes, just for us</p>
        </div>
        <div>
          <button
            onClick={onSignIn}
            className="rounded-full bg-cocoa px-6 py-3 font-semibold text-cream shadow transition hover:scale-105"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `components/NotInvited.tsx`**

```tsx
'use client';

export function NotInvited({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <div className="mb-4 inline-block rotate-2 rounded-md bg-warmth px-6 py-4 shadow-md">
          <p className="font-hand text-2xl text-cocoa">This little board is just for two. 💛</p>
          <p className="mt-1 text-sm text-cocoa/70">That account isn&apos;t on the list.</p>
        </div>
        <div>
          <button onClick={onSignOut} className="text-sm font-semibold text-cocoa underline">
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/SignInScreen.tsx components/NotInvited.tsx
git commit -m "feat: add sign-in and not-invited screens"
```

---

## Task 9: Card and Deck

**Files:**
- Create: `components/Card.tsx`, `components/Deck.tsx`

- [ ] **Step 1: Create `components/Card.tsx`**

```tsx
'use client';

import type { Note, UserProfile } from '@/lib/types';

function Avatar({ profile }: { profile?: UserProfile }) {
  if (profile?.photoURL) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.photoURL} alt={profile.displayName} className="h-6 w-6 rounded-full" />;
  }
  return <span className="grid h-6 w-6 place-items-center rounded-full bg-cocoa/20 text-xs">🙂</span>;
}

export function Card({
  note, author, recipient,
}: {
  note: Note;
  author?: UserProfile;
  recipient?: UserProfile;
}) {
  const when = note.createdAt ? new Date(note.createdAt).toLocaleString() : '';
  return (
    <div
      className="mx-auto w-full max-w-sm -rotate-1 rounded-md p-5 shadow-lg"
      style={{ backgroundColor: note.color }}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-cocoa/80">
        <span className="flex items-center gap-1"><Avatar profile={author} /> {author?.displayName ?? 'Someone'}</span>
        <span>→</span>
        <span className="flex items-center gap-1">{recipient?.displayName ?? '…'} <Avatar profile={recipient} /></span>
      </div>
      <p className="min-h-[4rem] whitespace-pre-wrap break-words font-hand text-xl text-cocoa">{note.text}</p>
      <p className="mt-3 text-right text-[10px] text-cocoa/50">{when}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/Deck.tsx`** (flip nav + unseen badge)

```tsx
'use client';

import { useState } from 'react';
import type { Note, UserProfile } from '@/lib/types';
import { otherPerson } from '@/lib/note-logic';
import { Card } from './Card';

export function Deck({
  notes, profiles, myUid, unseen,
}: {
  notes: Note[]; // newest first
  profiles: UserProfile[];
  myUid: string;
  unseen: number;
}) {
  const [index, setIndex] = useState(0); // 0 = newest
  const safeIndex = Math.min(index, Math.max(notes.length - 1, 0));

  if (notes.length === 0) {
    return (
      <div className="grid place-items-center py-16 text-center font-hand text-2xl text-cocoa/60">
        No notes yet — leave the first one. ✏️
      </div>
    );
  }

  const note = notes[safeIndex];
  const author = profiles.find((p) => p.uid === note.authorUid);
  const recipient = otherPerson(profiles, note.authorUid)
    ?? profiles.find((p) => p.uid !== note.authorUid);

  return (
    <div className="flex flex-col items-center gap-4">
      {unseen > 0 && safeIndex === 0 && (
        <span className="rounded-full bg-cocoa px-3 py-1 text-xs font-bold text-cream">
          {unseen} new
        </span>
      )}
      <Card note={note} author={author} recipient={recipient} />
      <div className="flex items-center gap-6 text-cocoa">
        <button
          onClick={() => setIndex((i) => Math.min(i + 1, notes.length - 1))}
          disabled={safeIndex >= notes.length - 1}
          className="rounded-full px-4 py-2 font-semibold disabled:opacity-30"
        >
          ← older
        </button>
        <span className="text-xs text-cocoa/60">{safeIndex + 1} / {notes.length}</span>
        <button
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={safeIndex === 0}
          className="rounded-full px-4 py-2 font-semibold disabled:opacity-30"
        >
          newer →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Card.tsx components/Deck.tsx
git commit -m "feat: add Card and Deck with flip navigation and unseen badge"
```

---

## Task 10: Compose

**Files:**
- Create: `components/Compose.tsx`

- [ ] **Step 1: Create `components/Compose.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { NOTE_COLORS, MAX_NOTE_LENGTH } from '@/lib/config';
import { validateNoteText } from '@/lib/note-logic';

export function Compose({ onSend }: { onSend: (text: string, color: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const valid = validateNoteText(text, MAX_NOTE_LENGTH).ok;

  async function send() {
    const result = validateNoteText(text, MAX_NOTE_LENGTH);
    if (!result.ok) return;
    setSending(true);
    setError('');
    try {
      await onSend(result.value, color);
      setText('');
    } catch {
      setError("Couldn't send — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-md p-4 shadow-md" style={{ backgroundColor: color }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="write something nice…"
        className="h-24 w-full resize-none bg-transparent font-hand text-xl text-cocoa placeholder:text-cocoa/40 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`color ${c}`}
              className={`h-5 w-5 rounded-full border ${c === color ? 'ring-2 ring-cocoa' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          onClick={send}
          disabled={!valid || sending}
          className="rounded-full bg-cocoa px-4 py-1.5 text-sm font-semibold text-cream disabled:opacity-30"
        >
          {sending ? 'sending…' : 'send'}
        </button>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-cocoa/50">
        <span>{error}</span>
        <span>{text.trim().length}/{MAX_NOTE_LENGTH}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/Compose.tsx
git commit -m "feat: add Compose with color picker and validation"
```

---

## Task 11: App shell and AuthGate wiring

**Files:**
- Create: `components/App.tsx`, `components/AuthGate.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/App.tsx`** (authenticated experience)

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AuthUser, Note, UserProfile } from '@/lib/types';
import { subscribeNotes, subscribeProfiles, createNote, setLastSeen } from '@/lib/notes';
import { unseenCount } from '@/lib/note-logic';
import { Deck } from './Deck';
import { Compose } from './Compose';

export function App({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenBaseline, setLastSeenBaseline] = useState<number>(Date.now());

  useEffect(() => {
    // Capture the moment we open so the unseen badge reflects this visit, then
    // immediately advance the stored marker.
    setLastSeenBaseline(Date.now());
    const unsubNotes = subscribeNotes((n) => { setNotes(n); setLoading(false); });
    const unsubProfiles = subscribeProfiles(setProfiles);
    void setLastSeen(user.uid);
    return () => { unsubNotes(); unsubProfiles(); };
  }, [user.uid]);

  const unseen = useMemo(
    () => unseenCount(notes, user.uid, lastSeenBaseline),
    [notes, user.uid, lastSeenBaseline],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="font-hand text-2xl text-cocoa">Post-It Cards</h1>
        <button onClick={onSignOut} className="text-xs font-semibold text-cocoa/70 underline">
          sign out
        </button>
      </header>

      {loading ? (
        <div className="grid place-items-center py-16 font-hand text-xl text-cocoa/50">loading…</div>
      ) : (
        <Deck notes={notes} profiles={profiles} myUid={user.uid} unseen={unseen} />
      )}

      <div className="mt-auto">
        <Compose onSend={(text, color) => createNote(user.uid, { text, color, style: {} })} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `components/AuthGate.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { AuthUser } from '@/lib/types';
import { onAuthChange, signIn, signOut, upsertProfile } from '@/lib/auth';
import { isAllowlisted } from '@/lib/allowlist';
import { allowlistEmails } from '@/lib/config';
import { SignInScreen } from './SignInScreen';
import { NotInvited } from './NotInvited';
import { App } from './App';

export function AuthGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setReady(true);
      if (u && isAllowlisted(u.email, allowlistEmails)) {
        void upsertProfile(u);
      }
    });
  }, []);

  if (!ready) {
    return <main className="grid min-h-screen place-items-center font-hand text-xl text-cocoa/50">…</main>;
  }
  if (!user) return <SignInScreen onSignIn={() => void signIn()} />;
  if (!isAllowlisted(user.email, allowlistEmails)) return <NotInvited onSignOut={() => void signOut()} />;
  return <App user={user} onSignOut={() => void signOut()} />;
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```tsx
import { AuthGate } from '@/components/AuthGate';

export default function Home() {
  return <AuthGate />;
}
```

- [ ] **Step 4: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: type-check clean; build produces `out/index.html`.
(Build needs the `NEXT_PUBLIC_*` vars present or defaulting to empty — empty is fine for a build; the app only needs real values at runtime. Create a local `.env` from `.env.example` to run `npm run dev`.)

- [ ] **Step 5: Commit**

```bash
git add components/App.tsx components/AuthGate.tsx app/page.tsx
git commit -m "feat: wire AuthGate, app shell, and live data together"
```

---

## Task 12: Frontend-design polish pass

**Files:**
- Modify: `components/*.tsx`, `app/globals.css`, `tailwind.config.ts` as needed

- [ ] **Step 1: Invoke the frontend-design skill** to elevate the warm/cozy/quirky aesthetic — sticky-note textures, playful rotations, friendly type, gentle entrance animation for live pop-in, mobile-first spacing. Keep all component prop interfaces and the data flow unchanged; this pass is visual only.

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: warm cozy frontend-design polish pass"
```

---

## Task 13: Deploy workflow and README

**Files:**
- Create: `.github/workflows/deploy.yaml`, `README.md`

- [ ] **Step 1: Create `.github/workflows/deploy.yaml`** (modeled on Portfolio; injects env at build)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
          NEXT_PUBLIC_ALLOWLIST_EMAILS: ${{ secrets.NEXT_PUBLIC_ALLOWLIST_EMAILS }}
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: './out'
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Create `README.md`** with the manual setup steps

````markdown
# Post-It Cards

A private two-person notes app — a shared deck of post-it cards behind Google sign-in.

## One-time setup (manual)

1. **Create a Firebase project** at https://console.firebase.google.com (free Spark plan).
2. **Add a Web app** to the project; copy the config values.
3. **Enable Authentication → Google** as a sign-in provider.
4. **Create a Cloud Firestore** database (production mode).
5. **Add authorized domains** under Authentication → Settings: `localhost` and your
   GitHub Pages domain (e.g. `<user>.github.io`).
6. **Set the allowlist** in two places to the two real emails:
   - `firestore.rules` → the `allowlist()` function.
   - `NEXT_PUBLIC_ALLOWLIST_EMAILS` env var.
7. **Deploy the rules:** `npx firebase deploy --only firestore:rules --project <projectId>`.
8. **Add GitHub repo secrets** (Settings → Secrets and variables → Actions) for every
   `NEXT_PUBLIC_*` var in `.env.example`.
9. **Enable GitHub Pages** → Source: GitHub Actions.

## Local development

```bash
cp .env.example .env   # fill in the values
npm install
npm run dev
```

## Tests

```bash
npm test            # pure-logic unit tests
npm run test:rules  # Firestore security rules (boots the emulator)
```
````

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yaml README.md
git commit -m "ci: add GitHub Pages deploy workflow and setup README"
```

---

## Task 14: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: allowlist + note-logic tests PASS.

- [ ] **Step 2: Run the rules tests**

Run: `npm run test:rules`
Expected: all rules tests PASS.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `out/index.html` generated, no errors.

- [ ] **Step 4: Final commit (if anything was touched)**

```bash
git add -A
git commit -m "chore: verification pass" || echo "nothing to commit"
```

---

## Manual steps the user must do (cannot be automated here)

- Create the Firebase project, enable Google auth + Firestore, add authorized domains.
- Provide the two real allowlist emails (into `firestore.rules` and the env/secret).
- Add the GitHub Actions secrets and enable Pages.
- Deploy the Firestore rules once.

## Notes for the implementer

- Everything runs client-side; there is no server. Do not add API routes.
- Keep `lib/*` free of JSX and `components/*` free of direct Firestore queries — the
  data layer (`lib/notes.ts`, `lib/auth.ts`) is the only Firestore boundary.
- The Firebase web config is intentionally public; never treat it as a secret.
- `style: {}` on notes is the extension point for future images/stickers/drawing.
