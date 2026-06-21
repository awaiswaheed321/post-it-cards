// Fallbacks keep the Firebase SDK from throwing `auth/invalid-api-key` during the
// static prerender when env vars are absent (e.g. a local `npm run build`). Real
// values are injected from env at runtime/CI; the app only makes Firebase calls in
// the browser, so the placeholders are never used against the network.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'missing-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'missing.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'missing.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '0',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'missing',
};

export const MAX_NOTE_LENGTH = 280;

// Warm, juicy candy colors for the cards.
export const NOTE_COLORS = ['#FFD27D', '#FF93B6', '#FFB38A', '#C4A5FF', '#8FE0C0', '#7FC9FF'];

// The reaction palette — one pick per person, per note.
export const REACTIONS = ['❤️', '🥰', '😂', '🥺', '🔥', '🫶'];
