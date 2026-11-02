// Home page entry (index.html): live Unreal experiences, then the portfolio.
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
// Self-hosted fonts (Latin only, the weights home.css uses): no render-blocking request to Google before first paint.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '../home.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
// A project's own page (/work/<slug>/) arrives with the app already rendered by scripts/prerender.mjs: take it over
// rather than drawing it again.
if (document.body.dataset.project && root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
