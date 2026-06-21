import { defineConfig } from 'vitest/config';

// Dedicated config for Firestore security-rules tests, which require the
// Firestore emulator (started by `firebase emulators:exec`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
