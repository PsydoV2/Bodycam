// "The lens" gepinnt, Log-Einträge blättern im Scrub-Takt (CONCEPT.md
// §5/§6) statt untereinander wegzufaden — wie Seiten einer Akte, die man
// während des Scrollens durchblättert. Unter reduced-motion bleibt die
// v1-Logik (stapeln + einfach einblenden) aktiv, siehe base.css.

import { gsap, ScrollTrigger } from './scroll-engine.js';

export function initLensPin({ reducedMotion }) {
  const section = document.querySelector('#lens');
  const list = document.querySelector('.log-list');
  if (!section || !list) return;
  const entries = Array.from(list.querySelectorAll('.log-entry'));
  if (entries.length < 2) return;

  if (reducedMotion) return; // v1-Fallback: normale gestapelte Liste, kein Pin

  list.classList.add('is-paged');

  // Höhe kommt aus dem tatsächlich benötigten Platz, nicht aus einer
  // geratenen Zahl — die Einträge sind position:absolute (überlappen sich
  // fürs Cross-Fade), tragen also nichts zur Höhe des Elternelements bei.
  // scrollHeight bleibt trotz inset:0 korrekt (misst den Inhalt, nicht die
  // erzwungene Box). Bricht bei Resize/Font-Load neu um, deshalb neu
  // gemessen statt einmalig fest gesetzt.
  function syncHeight() {
    const tallest = Math.max(...entries.map((entry) => entry.scrollHeight));
    list.style.minHeight = `${tallest}px`;
  }
  syncHeight();
  window.addEventListener('resize', syncHeight);
  document.fonts?.ready?.then(syncHeight);

  gsap.set(entries, { autoAlpha: 0, y: 16 });
  gsap.set(entries[0], { autoAlpha: 1, y: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + entries.length * 420,
      pin: true,
      scrub: 0.7,
      invalidateOnRefresh: true,
    },
  });

  entries.forEach((entry, i) => {
    if (i === 0) return;
    const at = i - 1;
    tl.to(entries[i - 1], { autoAlpha: 0, y: -16, duration: 1 }, at);
    tl.fromTo(entry, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1 }, at + 0.15);
  });
}
