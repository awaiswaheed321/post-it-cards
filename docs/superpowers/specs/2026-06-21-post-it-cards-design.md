# Post-It Cards — Design

**Date:** 2026-06-21
**Status:** Approved (pending implementation plan)

## Summary

A small, private, two-person notes app — like leaving post-it cards for one
specific person. Both people share a single chronological deck of notes and flip
through them like a card deck. Behind Google sign-in, restricted to two known
accounts. Hosted statically on GitHub Pages. The look should feel warm, happy,
and cozy — nice to open.

## Goals

- Two fixed people leave short notes for each other.
- Everything behind auth; only the two of them can read or write.
- Deploys to GitHub Pages (static hosting), consistent with the existing
  Portfolio project.
- Warm/cozy/quirky UI that's pleasant to look at.

## Non-Goals (v1)

- Images, attachments, or freeform drawing on cards.
- Editing or deleting notes (notes are append-only / immutable).
- Reactions, push/browser notifications.
- Inviting/re-pairing, multiple rooms, or general multi-user support.

These are explicitly deferred so the data model stays extensible without building
them now.

## Architecture

### Stack & Hosting

- **Next.js static export** (`output: 'export'`) — chosen to mirror the existing
  Portfolio project so the deploy path is a known quantity.
- **GitHub Pages** via a GitHub Actions workflow modeled on Portfolio's
  `deploy.yaml` (build → upload `out/` → deploy-pages). Optional CNAME.
- **Tailwind CSS** for styling (consistent with Portfolio).
- All logic runs client-side in the browser; there is no server (GitHub Pages is
  static only).

### Backend — Firebase

- **Firebase Auth** for sign-in.
- **Cloud Firestore** for notes and per-user read state.
- Both are client-side SDKs, free at this scale, and Firestore provides
  real-time listeners that power live updates.
- The Firebase web config (apiKey, projectId, etc.) is **public by design** and
  will live in the client bundle. Security is enforced by Firestore security
  rules + auth, not by hiding the config.

### Configuration & build-time injection

Because the app is a static export, the Firebase config and the two allowlisted
emails are **baked in at build time** via `NEXT_PUBLIC_*` environment variables,
supplied to the GitHub Actions build (repo secrets/variables). These values are
public anyway (Firebase config is non-secret; the allowlist is also enforced
server-side by security rules), so committing a `.env` is acceptable — env vars
just keep them out of source if preferred.

## Authentication

- **Google sign-in only** ("Sign in with Google").
- An **allowlist of two emails**, kept in app config and enforced in Firestore
  security rules via `request.auth.token.email`. Email is used (not UID) because
  the two emails are known up front, while UIDs only exist after first sign-in.
- On each successful sign-in, the app **upserts the signed-in user's profile**
  into `users/{uid}` (display name + photo from Google) so both people's
  name/photo are available to render the "from → to" card header.
- A **sign-out** control is always available.
- Any other Google account that signs in is rejected at the UI ("not invited")
  and is denied all data access by the security rules regardless.

## Data Model (Firestore)

Designed to be extensible — new note capabilities (images, doodles, stickers)
become new fields in `style` or new collections, with no rewrite of existing
data.

```
notes (collection)
  authorUid:  string      // which of the two people wrote it
  cipher:     string      // base64 AES-GCM ciphertext of the note body (E2E encrypted)
  iv:         string      // base64 per-note nonce
  color:      string      // sticky-note color, freely chosen per note by the author
  style:      map {}       // open bucket: rotation, font, sticker, … (room to grow)
  createdAt:  timestamp    // server timestamp; orders the deck

users (collection — one document per person, keyed by uid)
  displayName: string     // from Google profile, upserted on sign-in
  photoURL:    string     // from Google profile, upserted on sign-in

readState (collection — one document per user, keyed by uid)
  lastSeenAt: timestamp    // drives the unseen count and the "new" cue

config/crypto (single doc — non-secret crypto parameters)
  salt:       string      // base64 PBKDF2 salt (stable across both devices)
  verifierCt: string      // base64 ciphertext of a known constant
  verifierIv: string      // confirms a device derived the correct key
```

Note text plaintext is capped at ~280 chars client-side *before* encryption; the
rules cap stored ciphertext size (~5000 chars).

The recipient of a note is always "the other person," derived from the two-person
allowlist. The "from → to" card header is rendered from the `users` docs: the
author's name/photo on the "from" side, the other person's on the "to" side.

## Security Rules

Allowlisting is by email: `request.auth.token.email in [emailA, emailB]`.

- `notes`:
  - **read**: allowed only for allowlisted users.
  - **create**: allowed only for allowlisted users, only with
    `authorUid == request.auth.uid`, and only when `text` is a non-empty string
    within the length cap (~280 chars).
  - **update / delete**: denied for everyone (notes are immutable / append-only).
- `users/{uid}`:
  - **read**: allowed for allowlisted users (needed to render both profiles).
  - **write**: allowed only when `uid == request.auth.uid` and allowlisted.
- `readState/{uid}`:
  - **read/write**: allowed only when `uid == request.auth.uid` and allowlisted
    (each person manages only their own read marker).

## Core Experience

1. **Sign in** with Google. If not on the allowlist → "not invited" screen.
2. **Land on the newest card**, front and center, with a small unseen count
   (e.g. "2 new") derived from `readState.lastSeenAt` vs. note `createdAt`.
3. **Flip back** through older cards in time order — one shared timeline
   containing both authors' notes.
4. **Live pop-in**: a Firestore real-time listener animates a new card onto the
   deck when the other person posts while you have the app open.
5. **Write a note**: pick a color, type text, send — the card drops onto the
   deck (and appears live for the other person).
6. **Mark seen**: viewing the deck advances the user's `lastSeenAt`, clearing the
   unseen count.

Each card shows a **"from → to" header** — author name + photo on the "from" side,
the other person's name + photo on the "to" side — above the note text, on the
author's chosen color. The whole experience is **mobile-first / responsive**,
since notes will often be written and read on phones.

## Components (high level)

- **Auth gate / allowlist guard** — handles Google sign-in and sign-out, blocks
  non-allowlisted users, and upserts the signed-in user's `users/{uid}` profile.
  Inputs: Firebase Auth state. Output: authenticated allowlisted user or rejection
  screen.
- **Notes data layer** — thin wrapper over Firestore: subscribe to the notes
  stream (ordered by `createdAt`, newest-first, with room to lazily load older
  cards if the deck ever grows large), create a note, read/update `readState`, and
  read both `users` profiles. One clear interface the UI consumes.
- **Deck UI** — renders the card stack and the "from → to" header, handles flip
  navigation, newest-first positioning, unseen badge, loading state, and live
  pop-in animation. Mobile-first / responsive.
- **Compose UI** — color picker + text input (with the ~280-char cap) + send.
- **Theme** — warm/cozy/quirky styling (driven by the frontend-design skill at
  build time).

## Error Handling

- **Not signed in** → sign-in screen.
- **Signed in but not allowlisted** → friendly "not invited" screen; no data
  fetched.
- **Firestore read/write failure** (offline, rules rejection) → inline,
  non-destructive error message; the deck remains usable with already-loaded
  cards. Compose surfaces a "couldn't send, try again" state.
- **Initial load** → loading state while the first notes/profiles fetch.
- **Empty deck** (no notes yet) → warm empty state inviting the first note.

## Testing Strategy

- **Security rules**: unit-test Firestore rules with the emulator — verify
  allowlisted reads/creates succeed, non-allowlisted access is denied,
  update/delete are denied for everyone, over-length/empty `text` is rejected,
  and a user can only write their own `users`/`readState` docs.
- **Notes data layer**: test create/subscribe/readState logic against the
  Firestore emulator.
- **Deck/compose UI**: component tests for newest-first ordering, unseen-count
  derivation, and compose flow.
- **Manual**: live pop-in across two browser sessions.

## End-to-End Encryption (added 2026-06-21)

Note content is end-to-end encrypted so that no third party — including
Firebase/Google itself — can read it. Only the two people, on their own devices,
can decrypt.

- **Key model:** a single shared passphrase, agreed out-of-band by the two people.
  It is stretched with **PBKDF2 (SHA-256, 210k iterations)** into an
  **AES-GCM-256** key. The passphrase and key never leave the device; Firebase
  only ever stores ciphertext, IV, and a non-secret salt/verifier.
- **Setup vs unlock:** the first person to set a phrase writes `config/crypto`
  (salt + verifier). The second person enters the same phrase, which is checked
  against the verifier (wrong phrase → "doesn't match", never garbled notes).
  `config/crypto` is create-once / immutable.
- **On-device cache:** after entering the phrase, the derived key is cached in
  `localStorage` so returning "just works" (once per device). A **lock** button
  clears it for shared/public machines.
- **Scope:** *content only.* Author identity and timestamps remain cleartext
  because they drive the from→to header and newest-first ordering; with only two
  possible authors this leaks little. Hiding metadata is explicitly out of scope.
- **Irreversibility:** if both people forget the passphrase, the notes are
  permanently unrecoverable. This is inherent to true E2E — there is no reset.
- **Files:** `lib/crypto.ts` (primitives), `lib/crypto-store.ts` (config doc),
  `components/CryptoGate.tsx` + `components/UnlockScreen.tsx` (setup/unlock/lock).

## Aesthetic Direction

Warm, happy, cozy, quirky — something that feels good to open. Handmade
sticky-note feel: playful colors, slight rotations, friendly type. Final visual
execution is handled by the `frontend-design` skill during implementation.

## Open Decisions Resolved

- Identity: fixed known pair (two allowlisted Google accounts, by email).
- Note content: text + freely-chosen color + extensible `style` bucket.
- Card identity: "from → to" header with each person's name + photo.
- Display: single shared chronological deck, flip-through cards, mobile-first.
- New-note behavior: newest-on-top + unseen count + live pop-in.
- Sign-in: Google only; sign-out always available.
- Stack: Next.js static export (matches Portfolio).
- Edit/delete: neither — notes are append-only.
