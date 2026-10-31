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

// Fonts the home page's first screen needs (hero heading and body text), preloaded so they arrive with the CSS instead
// of after it. Matched by name in the bundle, since the file names carry content hashes.
const heroFonts = [/instrument-serif-latin-400-normal-[\w-]+\.woff2$/, /instrument-serif-latin-400-italic-[\w-]+\.woff2$/, /inter-latin-400-normal-[\w-]+\.woff2$/];
const preloadHeroFonts: Plugin = {
  name: 'preload-hero-fonts',
  transformIndexHtml: {
    order: 'post',
    handler: (html, { bundle, path }) => {
      if (!bundle || !path.endsWith('/index.html')) return html;
      const files = Object.keys(bundle).filter((name) => heroFonts.some((pattern) => pattern.test(name)));
      return {
        html,
        tags: files.map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${file}`, crossorigin: '' },
          injectTo: 'head'
        }))
      };
    }
  }
};

// Relative paths so the build works from any folder: Cloudflare Pages, the local signalling server and Netcade's iframe.
// Two pages: index.html (home page in React: experiences and portfolio) and explore.html (the stream).
export default defineConfig({
  base: './',
  plugins: [react(), versionConfigScript, preloadHeroFonts],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Small assets are inlined, but never fonts: base64 fonts would bloat the CSS that blocks first paint, and each page
    // only needs some of them.
    assetsInlineLimit: (file, content) => !/\.(woff2?|ttf|otf)$/.test(file) && content.length < 100000,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        explore: fileURLToPath(new URL('./explore.html', import.meta.url))
      }
    }
  }
});
