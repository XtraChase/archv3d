// Scroll reveal for the home page, scrubbed by scroll position: blocks rise into place and pictures are unveiled
// bottom-up ("curtain") as they move up through the lower part of the screen, and play backwards in the same place
// when scrolling up. The animation itself is CSS (home.css, Scroll motion: animation-timeline: view()); this only
// labels the elements and their stagger. Nothing is hidden unless the browser supports scroll-driven animations and
// this has run (<html class="reveal-on">), so search engines, visitors without JavaScript, Firefox (no support yet)
// and pre-rendered pages see everything. It plays even with prefers-reduced-motion (the owner's choice, like the
// turning building).
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

/** How much later (in pixels scrolled) each card in a row starts. */
const STAGGER_PX = 45;

export function useScrollReveal() {
  useEffect(() => {
    if (typeof CSS === 'undefined' || !CSS.supports('animation-timeline: view()')) return;
    const root = document.documentElement;
    for (const [selector, kind] of TARGETS) {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        // Data attributes, not classes: React doesn't touch them, and an element React replaces simply shows.
        element.dataset.reveal = kind;
        if (kind === 'card') {
          const index = Array.prototype.indexOf.call(element.parentElement?.children ?? [], element) as number;
          element.style.setProperty('--reveal-start', `${(index % 3) * STAGGER_PX}px`);
        }
      });
    }
    root.classList.add('reveal-on');
    return () => root.classList.remove('reveal-on');
  }, []);
}
