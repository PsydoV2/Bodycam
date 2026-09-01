// Kapitel-Übergänge (CONCEPT.md §5): kein separat gescriptetes
// Static-Element mehr — an großen Kapitelgrenzen wird gezielt ein kurzer,
// authored Scrub-Burst ausgelöst. Derselbe Mechanismus wie schnelles
// Scrollen (§4.1), nur bewusst getriggert statt nur an rohe Velocity
// gekoppelt. Ein System, zwei Auslöser.

import { ScrollTrigger } from './scroll-engine.js';
import { triggerBurst } from './scroll-engine.js';

const BOUNDARY_SELECTORS = ['#update', '#gallery', '#studio'];

export function initChapterTransitions() {
  BOUNDARY_SELECTORS.forEach((selector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 70%',
      onEnter: () => triggerBurst(0.8, 500),
    });
  });
}
