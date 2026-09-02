// Environments/Gallery als horizontale Filmrolle (CONCEPT.md §5/§6):
// vertikales Scrollen übersetzt sich in horizontale Bewegung durch die
// Clips — der Scrub-Mechanismus (§4.1) am buchstäblichsten, weil man
// wortwörtlich durch aufgenommenes Material spult. Zweiter Höhepunkt der
// Seite. Jedes Medienelement bekommt seinen eigenen Video/Bild-Shader.

import { gsap, ScrollTrigger, scrubState, getLenis, pushVelocity } from './scroll-engine.js';
import { ScrubShader } from './scrub-shader.js';

const DRAG_VELOCITY_SCALE = 1.6; // px/ms -> 0..1, grob wie ein zügiger Wheel-Scroll
const DRAG_THRESHOLD_PX = 4; // ab hier gilt ein Pointer-Down als Ziehen, nicht als Klick

export function initGalleryReel({ reducedMotion, cursor }) {
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

    // Videos laden erst beim Hereinfahren (preload="none", §8) — bis der
    // erste Frame da ist, zeigt das Frame "ACQUIRING FEED" statt Schwarz.
    if (source.tagName === 'VIDEO') {
      item.classList.add('is-loading');
      source.addEventListener('loadeddata', () => item.classList.remove('is-loading'), { once: true });
    }

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
    // clientWidth enthält das horizontale Padding des Pins — ohne Korrektur
    // endet die Rolle 32px hinter dem rechten Rand und das letzte Frame
    // bleibt angeschnitten.
    const style = getComputedStyle(pin);
    const inset = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    return Math.max(0, track.scrollWidth + inset - pin.clientWidth);
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

  // --- Drag-Scrub (CONCEPT.md §5/§6): Ziehen an der Filmrolle ------------
  // Horizontales Ziehen wird direkt in Scroll-Position übersetzt, damit
  // Drag und Scroll denselben Timecode bewegen — es gibt nur EINE Position
  // im Band, keine zweite, parallel geführte Drag-Koordinate. Die
  // Zieh-Geschwindigkeit speist dieselbe Velocity wie der Scroll, also
  // reagieren Shader und HUD-Zähler beim Ziehen genauso wie beim Spulen.
  const lenis = getLenis();
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let moved = false;

  function scrollRatio() {
    const distance = getScrollDistance();
    return distance > 0 ? (st.end - st.start) / distance : 1;
  }

  function scrollToImmediate(y) {
    const clamped = Math.min(Math.max(y, st.start), st.end);
    if (lenis) lenis.scrollTo(clamped, { immediate: true, force: true });
    else window.scrollTo(0, clamped);
    ScrollTrigger.update();
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (pointerId !== null && pin.hasPointerCapture?.(pointerId)) pin.releasePointerCapture(pointerId);
    pointerId = null;
    pin.classList.remove('is-dragging');
    cursor?.setScrubbing(false);
  }

  pin.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !st.isActive) return;
    dragging = true;
    moved = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    lastX = e.clientX;
    lastT = performance.now();
    startScroll = window.scrollY;
    pin.setPointerCapture?.(e.pointerId);
    pin.classList.add('is-dragging');
    cursor?.setScrubbing(true);
  });

  pin.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    moved = true;
    e.preventDefault();

    scrollToImmediate(startScroll - dx * scrollRatio());

    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    pushVelocity((Math.abs(e.clientX - lastX) / dt) / DRAG_VELOCITY_SCALE);
    lastX = e.clientX;
    lastT = now;
  });

  pin.addEventListener('pointerup', endDrag);
  pin.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);

  // Ein Klick, der in Wirklichkeit ein Ziehen war, soll nichts auslösen.
  pin.addEventListener(
    'click',
    (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    },
    true,
  );

  return {
    destroy: () => {
      shaders.forEach(({ shader }) => shader.destroy());
      st.kill();
    },
    onMediaReady: (fn) => mediaReadyCallbacks.push(fn),
  };
}
