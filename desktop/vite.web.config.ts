import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The phone app: the same renderer as the desktop app, built into the control Worker's static assets
// (control/public, served at its root; see control/wrangler.jsonc). Run `npm run build:phone` and commit the result.
const phoneHtml: Plugin = {
  name: 'phone-html',
  transformIndexHtml: (html) =>
    html
      // The desktop page's CSP forbids network access; the phone page gets its own from the Worker's _headers.
      .replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
      .replace(
        '</head>',
        `    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#16181d" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="icon" href="./icon-192.png" />
    <link rel="apple-touch-icon" href="./icon-192.png" />
  </head>`
      )
};

export default defineConfig({
  plugins: [react(), phoneHtml],
  base: './',
  publicDir: 'web-public',
  build: { outDir: '../control/public', emptyOutDir: true }
});
