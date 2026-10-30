import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative paths so the build works from any folder: Cloudflare Pages, the local signalling server and Netcade's iframe.
// Two pages: index.html (home page in React: experiences and portfolio) and explore.html (the stream).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        explore: fileURLToPath(new URL('./explore.html', import.meta.url))
      }
    }
  }
});
