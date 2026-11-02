// Hash routes, so every page works from any static host without server rewrites
// (Cloudflare Pages, the local signalling server, Netcade's iframe). Each project also has a real page at /work/<slug>/
// for search engines (scripts/prerender.mjs), which opens the app on that project:
//   #/                 home
//   #/experiences, #/work, #/about   home, scrolled to that section
//   #/work/<slug>      a portfolio project
//   #/privacy          what the site records about visits
import { useEffect, useMemo, useState } from 'react';

export type Section = 'experiences' | 'work' | 'about';

export type Route = { page: 'home'; section?: Section } | { page: 'project'; slug: string } | { page: 'privacy' };

const sections: Section[] = ['experiences', 'work', 'about'];

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'work' && parts[1]) return { page: 'project', slug: decodeURIComponent(parts[1]) };
  if (parts[0] === 'privacy') return { page: 'privacy' };
  const section = sections.find((name) => name === parts[0]);
  return { page: 'home', section };
}

export const href = {
  home: '#/',
  section: (section: Section) => `#/${section}`,
  project: (slug: string) => `#/work/${encodeURIComponent(slug)}`,
  privacy: '#/privacy'
};

/**
 * A project's own page (/work/<slug>/, written at build time by scripts/prerender.mjs) names its project on <body>,
 * so it opens there without a hash.
 */
function initialHash() {
  const project = document.body.dataset.project;
  return location.hash || (project ? href.project(project) : '');
}

export function useRoute() {
  const [hash, setHash] = useState(initialHash);
  useEffect(() => {
    const update = () => setHash(initialHash());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  // Same object until the hash changes, so effects keyed on the route run only on navigation.
  const route = useMemo(() => parseRoute(hash), [hash]);
  return { hash, route };
}
