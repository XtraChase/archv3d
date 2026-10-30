import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Relative paths so the build works from any folder, including Netcade's iframe.
// Two pages: index.html (landing page, pick a level) and explore.html (the stream).
export default defineConfig({
  base: './',
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
