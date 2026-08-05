import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Both extensions on the renderer side: this matched `.tsx` only, so a `.test.ts` under
    // renderer/ (a hook or util test with no JSX) was silently skipped rather than failing.
    include: ['main/**/*.{test,spec}.ts', 'renderer/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './main'),
    },
  },
});
