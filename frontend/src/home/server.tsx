// Build-time rendering of the home page app for scripts/prerender.mjs (built with `vite build --ssr`). Each project
// page is the app's own HTML for that project, which main.tsx then hydrates instead of re-rendering: the text a
// visitor sees first is painted straight from the HTML.
import { renderToString } from 'react-dom/server';
import { App } from './App';

export function render() {
  return renderToString(<App />);
}
