import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
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
