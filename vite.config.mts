import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// React Fast Refresh injects an inline preamble script in dev. The production CSP in index.html
// has no 'unsafe-inline' for scripts, so the dev server adds it back (A10).
const devCspPlugin = {
  name: 'onyx-dev-csp',
  apply: 'serve' as const,
  transformIndexHtml(html: string) {
    return html.replace("script-src 'self';", "script-src 'self' 'unsafe-inline';");
  },
};

export default defineConfig({
  plugins: [react(), devCspPlugin],
  root: 'renderer',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react')) return 'react-vendor';
          if (id.includes('@dnd-kit')) return 'dnd-kit';
          if (id.includes('dompurify')) return 'sanitizer';
          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer/src'),
    },
  },
  server: {
    port: 5173,
  },
  define: {
    __BUILD_PROFILE__: JSON.stringify(process.env.BUILD_PROFILE || 'production'),
  },
});
