import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // rules.test.ts needs the Firestore emulator; it runs via `npm run test:rules`.
    exclude: ['tests/rules.test.ts', 'node_modules/**'],
  },
});
