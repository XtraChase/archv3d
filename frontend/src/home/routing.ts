// Hash routes, so every page works from any static host without server rewrites
// (Cloudflare Pages, the local signalling server, Netcade's iframe):
//   #/                 home
//   #/experiences, #/work, #/about   home, scrolled to that section
//   #/work/<slug>      a portfolio project
import { useEffect, useMemo, useState } from 'react';

export type Section = 'experiences' | 'work' | 'about';

export type Route = { page: 'home'; section?: Section } | { page: 'project'; slug: string };

const sections: Section[] = ['experiences', 'work', 'about'];

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'work' && parts[1]) return { page: 'project', slug: decodeURIComponent(parts[1]) };
  const section = sections.find((name) => name === parts[0]);
  return { page: 'home', section };
}

export const href = {
  home: '#/',
  section: (section: Section) => `#/${section}`,
  project: (slug: string) => `#/work/${encodeURIComponent(slug)}`
};

export function useRoute() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const update = () => setHash(location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  // Same object until the hash changes, so effects keyed on the route run only on navigation.
  const route = useMemo(() => parseRoute(hash), [hash]);
  return { hash, route };
}
