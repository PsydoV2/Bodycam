// Environments/Gallery als horizontale Filmrolle (CONCEPT.md §5/§6):
// vertikales Scrollen übersetzt sich in horizontale Bewegung durch die
// Clips — der Scrub-Mechanismus (§4.1) am buchstäblichsten, weil man
// wortwörtlich durch aufgenommenes Material spult. Zweiter Höhepunkt der
// Seite. Jedes Medienelement bekommt seinen eigenen Video/Bild-Shader.

import { gsap, ScrollTrigger, scrubState } from './scroll-engine.js';
import { ScrubShader } from './scrub-shader.js';

export function initGalleryReel({ reducedMotion }) {
  const section = document.querySelector('#gallery');
  const pin = document.querySelector('.gallery-pin');
  const track = document.querySelector('.gallery-track');
  if (!section || !pin || !track) return null;

  const items = Array.from(track.querySelectorAll('.media-frame'));
  const shaders = [];
  const mediaReadyCallbacks = [];

  items.forEach((item) => {
    const source = item.querySelector('video, img');
    const canvas = item.querySelector('canvas');
    if (!source || !canvas) return;

    if (reducedMotion) {
      // Reduced-motion: kein Shader, statischer CSS-Fallback-Look reicht
      // (kein Pin/Scrub sowieso, siehe unten). Kein autoplay-Attribut mehr
      // im Markup (Performance, §8) — hier explizit nachholen.
      item.classList.add('is-fallback');
      if (source.tagName === 'VIDEO') source.play().catch(() => {});
      return;
    }

    // maxDpr niedriger als der Hero (bis zu 3 Items gleichzeitig aktiv,
    // siehe IntersectionObserver unten — Performance-Budget, CONCEPT.md §8).
    const shader = new ScrubShader(canvas, source, () => scrubState.velocity, { baseGrain: 0.055, maxDpr: 1.25 });
    item.classList.add(shader.ok ? 'is-shaded' : 'is-fallback');
    if (shader.ok) {
      shaders.push({ item, source, shader });
    } else if (source.tagName === 'VIDEO') {
      source.play().catch(() => {});
    }

    // Bild-/Video-Metadaten kommen asynchron rein und können die
    // Track-Breite nachträglich ändern — die ScrollTrigger-Position muss
    // dann neu berechnet werden (main.js hängt sich hier ein).
    const notifyReady = () => mediaReadyCallbacks.forEach((fn) => fn());
    if (source.tagName === 'VIDEO') {
      source.addEventListener('loadedmetadata', notifyReady, { once: true });
    } else {
      source.addEventListener('load', notifyReady, { once: true });
    }
  });

  // Performance-Budget (CONCEPT.md §8): nur Items nahe am Viewport rendern
  // und dekodieren — sonst laufen bis zu 7 WebGL-Contexts + Video-Decoder
  // permanent im Hintergrund weiter, auch komplett außerhalb des Bilds.
  if (shaders.length) {
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const match = shaders.find(({ item }) => item === entry.target);
          if (!match) return;
          if (entry.isIntersecting) {
            match.shader.resume();
            if (match.source.tagName === 'VIDEO') match.source.play().catch(() => {});
          } else {
            match.shader.pause();
            if (match.source.tagName === 'VIDEO') match.source.pause();
          }
        });
      },
      // Moderate horizontale Marge: das nächste/vorherige Item soll schon
      // bereitstehen, bevor es sichtbar wird, ohne dass zu viele Items
      // gleichzeitig aktiv sind (Performance-Budget, CONCEPT.md §8).
      { root: null, rootMargin: '0px 40% 0px 40%', threshold: 0 },
    );
    shaders.forEach(({ item }) => visibilityObserver.observe(item));
  }

  if (reducedMotion) {
    // Kein Pin/Scrub unter reduced-motion (§5-Vertrag) — die Filmrolle
    // bleibt ein ganz normales, linear lesbares Grid.
    track.classList.add('is-static-grid');
    return { destroy: () => {}, onMediaReady: () => {} };
  }

  function getScrollDistance() {
    return Math.max(0, track.scrollWidth - pin.clientWidth);
  }

  const tween = gsap.to(track, { x: () => -getScrollDistance(), ease: 'none' });

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + getScrollDistance() * 1.2,
    pin,
    animation: tween,
    scrub: 0.8,
    invalidateOnRefresh: true,
  });

  return {
    destroy: () => {
      shaders.forEach(({ shader }) => shader.destroy());
      st.kill();
    },
    onMediaReady: (fn) => mediaReadyCallbacks.push(fn),
  };
}
