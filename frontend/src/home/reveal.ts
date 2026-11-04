// Scroll reveal for the home page: blocks rise into place, and pictures are unveiled bottom-up ("curtain"), as they
// scroll into view, and go back as they drop below the screen when scrolling up. Nothing is hidden until this runs:
// <html class="reveal-on"> switches the hidden state on, and an element is only hidden while it has data-reveal and
// not data-revealed. Search engines, visitors without JavaScript
// and pre-rendered pages see everything. Styles in home.css (Scroll reveal). It plays even with prefers-reduced-motion
// (the owner's choice, like the turning building).
import { useEffect } from 'react';

/**
 * What reveals, and how: 'title' (kicker letters draw together, title rises out of a lean, lede follows), 'rise' (fade
 * up), 'card' (fade up, staggered with its siblings), 'curtain' (picture unveiled).
 */
const TARGETS: [string, 'title' | 'rise' | 'card' | 'curtain'][] = [
  ['.section-head', 'title'],
  ['.experience-card', 'card'],
  ['.process-frame', 'curtain'],
  ['.process-steps', 'rise'],
  ['.service-card', 'card'],
  ['.reel', 'curtain'],
  ['.work-card', 'card'],
  ['.about-intro', 'rise'],
  ['.about-body', 'rise']
];

/** Delay between siblings in a row of cards. */
const STAGGER_MS = 90;

export function useScrollReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const root = document.documentElement;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) element.dataset.revealed = '';
          // Scrolling back up: once it drops below the screen it goes back, ready to reveal again on the way down.
          // (One that leaves at the top stays revealed, so it's in place when scrolled back to.)
          else if (entry.boundingClientRect.top > 0) delete element.dataset.revealed;
        }
      },
      // Start a little before the element reaches the viewport's bottom edge.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    for (const [selector, kind] of TARGETS) {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        // Data attributes, not classes: React doesn't touch them, and an element React replaces simply shows.
        element.dataset.reveal = kind;
        if (kind === 'card') {
          const index = Array.prototype.indexOf.call(element.parentElement?.children ?? [], element) as number;
          element.style.setProperty('--reveal-delay', `${(index % 3) * STAGGER_MS}ms`);
        }
        observer.observe(element);
      });
    }
    root.classList.add('reveal-on');

    return () => {
      observer.disconnect();
      root.classList.remove('reveal-on');
    };
  }, []);
}
