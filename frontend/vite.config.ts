import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// public/config.js is copied as-is (editable without a rebuild), so each build links it under a new URL: browsers and
// Cloudflare's edge keep it for hours, and a stale copy can send the page to an old stream address.
const configVersion = Date.now().toString(36);
const versionConfigScript: Plugin = {
  name: 'version-config-script',
  transformIndexHtml: (html) => html.replace('src="./config.js"', `src="./config.js?v=${configVersion}"`)
};

// Relative paths so the build works from any folder: Cloudflare Pages, the local signalling server and Netcade's iframe.
// Two pages: index.html (home page in React: experiences and portfolio) and explore.html (the stream).
export default defineConfig({
  base: './',
  plugins: [react(), versionConfigScript],
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
