import { defineConfig } from 'vite';

// Relative paths so the build works from any folder, including Netcade's iframe.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000
  }
});
