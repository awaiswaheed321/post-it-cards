# Post-It Cards

A private two-person notes app — a shared deck of post-it cards behind Google sign-in.
Both people share one chronological deck, flip through it like a card deck, and see new
notes pop in live. Static site (Next.js export) hosted on GitHub Pages, with Firebase
Auth + Cloud Firestore as the backend.

## One-time setup (manual)

1. **Create a Firebase project** at https://console.firebase.google.com (free Spark plan).
2. **Add a Web app** to the project; copy the config values.
3. **Enable Authentication → Google** as a sign-in provider.
4. **Create a Cloud Firestore** database (production mode).
5. **Add authorized domains** under Authentication → Settings: `localhost` and your
   GitHub Pages domain (e.g. `<user>.github.io`).
6. **Set the allowlist** in Firestore (kept out of source control on purpose):
   create a document `config/allowlist` with one field `emails` (an array) holding
   the two permitted addresses. The rules read it via `get()`; only the admin
   console can edit it. To change who's allowed later, just edit this doc — no code
   or rules redeploy needed.
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
npm test            # pure-logic unit tests (note-logic, crypto)
npm run test:rules  # Firestore security rules (boots the emulator; needs Java)
```

## How it's built

- `lib/` — logic and the Firebase boundary (`allowlist`, `note-logic`, `auth`, `notes`).
  Pure logic has no Firebase/DOM dependency and is unit-tested.
- `components/` — React UI (`AuthGate` → `App` → `Deck`/`Card`/`Compose`).
- `firestore.rules` — server-side enforcement: only the two allowlisted emails can
  read/write; notes are append-only (no edit/delete).
- The Firebase web config is public by design; security lives in the rules, not the keys.
- `style: {}` on each note is the extension point for future images/stickers/drawing.
