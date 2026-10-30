import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { settings } from '../site';
import { useAvailability } from './availability';
import { ContactDialog } from './ContactDialog';
import { HomePage } from './HomePage';
import { ProjectPage } from './ProjectPage';
import { findProject } from './projects';
import { href, useRoute, type Route } from './routing';
import { profile } from './profile';

const brand = settings.title || 'archv3d';

function routeKey(route: Route) {
  return route.page === 'project' ? `work/${route.slug}` : 'home';
}

export function App() {
  const { route } = useRoute();
  // One watcher for every experience card: they share one game process and one line.
  const availability = useAvailability();
  const key = routeKey(route);

  // Scroll: a section route scrolls to it; returning to a page restores where you were on it; anything else starts at
  // the top. Positions are saved per page as you scroll.
  const positions = useRef(new Map<string, number>());
  const shownKey = useRef(key);
  useEffect(() => {
    const save = () => positions.current.set(shownKey.current, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);
  useLayoutEffect(() => {
    const samePage = shownKey.current === key;
    shownKey.current = key;
    if (route.page === 'home' && route.section) {
      document.getElementById(route.section)?.scrollIntoView({ behavior: samePage ? 'smooth' : 'auto' });
    } else if (!samePage) {
      window.scrollTo(0, positions.current.get(key) ?? 0);
    }
  }, [route, key]);

  useEffect(() => {
    const project = route.page === 'project' ? findProject(route.slug) : undefined;
    document.title = project ? `${project.title} · ${profile.name}` : `${brand} · ${profile.name}`;
  }, [route]);

  const [contactOpen, setContactOpen] = useState(false);
  const openContact = useCallback(() => setContactOpen(true), []);
  const closeContact = useCallback(() => setContactOpen(false), []);

  return (
    <>
      <Header onContact={openContact} />
      <main>
        {route.page === 'project' ? (
          <ProjectPage slug={route.slug} />
        ) : (
          <HomePage availability={availability} onContact={openContact} />
        )}
      </main>
      <Footer />
      {contactOpen && <ContactDialog onClose={closeContact} />}
    </>
  );
}

function Header({ onContact }: { onContact: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="site-header-inner">
        <a
          className="brand"
          href={href.home}
          onClick={() => {
            if (location.hash === href.home || location.hash === '') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="brand-mark" aria-hidden="true" />
          <span>{brand}</span>
        </a>
        <nav className="site-nav" aria-label="Main">
          <a href={href.section('experiences')}>Experiences</a>
          <a href={href.section('work')}>Portfolio</a>
          <a href={href.section('about')}>About</a>
          <button className="nav-contact" onClick={onContact}>
            Contact
          </button>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span className="muted">Interactive spaces streamed live from Unreal Engine</span>
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </div>
    </footer>
  );
}
