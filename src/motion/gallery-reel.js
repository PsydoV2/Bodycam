// Environments/Gallery als horizontale Filmrolle (CONCEPT.md §5/§6):
// vertikales Scrollen übersetzt sich in horizontale Bewegung durch die
// Clips — der Scrub-Mechanismus (§4.1) am buchstäblichsten, weil man
// wortwörtlich durch aufgenommenes Material spult. Zweiter Höhepunkt der
// Seite. Alle Frames werden über EINEN gemeinsamen WebGL-Canvas gerendert
// (reel-shader.js) statt über je einen eigenen Kontext.

import { gsap, ScrollTrigger, scrubState, getLenis, pushVelocity } from './scroll-engine.js';
import { ReelShader } from './reel-shader.js';
import { coupleVideoRate } from './video-rate.js';

const DRAG_VELOCITY_SCALE = 1.6; // px/ms -> 0..1, grob wie ein zügiger Wheel-Scroll
const DRAG_THRESHOLD_PX = 4; // ab hier gilt ein Pointer-Down als Ziehen, nicht als Klick

export function initGalleryReel({ reducedMotion, cursor, sound }) {
  const section = document.querySelector('#gallery');
  const pin = document.querySelector('.gallery-pin');
  const track = document.querySelector('.gallery-track');
  if (!section || !pin || !track) return null;

  const items = Array.from(track.querySelectorAll('.media-frame'));
  const mediaReadyCallbacks = [];
  const canvas = pin.querySelector('.gallery-canvas');

  let reel = null;
  if (!reducedMotion && canvas) {
    // maxDpr niedriger als der Hero: bis zu drei Frames gleichzeitig im Bild
    // (Performance-Budget, CONCEPT.md §8).
    reel = new ReelShader(canvas, pin, () => scrubState.velocity, { baseGrain: 0.055, maxDpr: 1.25 });
    if (!reel.ok) reel = null;
  }
  pin.classList.add(reel ? 'is-shaded' : 'is-fallback');

  const videos = [];

  items.forEach((item) => {
    const source = item.querySelector('video, img');
    if (!source) return;
    const isVideo = source.tagName === 'VIDEO';

    if (isVideo) {
      videos.push(source);
      // Videos laden erst beim Hereinfahren (preload="none", §8) — bis der
      // erste Frame da ist, läuft das Poster durch denselben Shader und das
      // Frame meldet "ACQUIRING FEED".
      item.classList.add('is-loading');
      source.addEventListener('loadeddata', () => item.classList.remove('is-loading'), { once: true });
      coupleVideoRate(source);
    }

    if (reel) {
      let poster = null;
      if (isVideo && source.poster) {
        poster = new Image();
        poster.src = source.poster;
      }
      reel.addItem(item, source, poster);
      item.classList.add('is-shaded');
    } else {
      item.classList.add('is-fallback');
    }

    // Bild-/Video-Metadaten kommen asynchron rein und können die
    // Track-Breite nachträglich ändern — die ScrollTrigger-Position muss
    // dann neu berechnet werden (main.js hängt sich hier ein).
    const notifyReady = () => mediaReadyCallbacks.forEach((fn) => fn());
    source.addEventListener(isVideo ? 'loadedmetadata' : 'load', notifyReady, { once: true });
  });

  // Performance-Budget (CONCEPT.md §8): nur Frames nahe am Viewport rendern
  // und dekodieren — sonst laufen alle Video-Decoder permanent weiter, auch
  // komplett außerhalb des Bilds.
  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const item = entry.target;
        const video = item.querySelector('video');
        reel?.setActive(item, entry.isIntersecting);
        if (video) {
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        }
      });
    },
    // Moderate horizontale Marge: das nächste/vorherige Frame soll schon
    // bereitstehen, bevor es sichtbar wird.
    { root: null, rootMargin: '0px 40% 0px 40%', threshold: 0 },
  );
  items.forEach((item) => visibilityObserver.observe(item));

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
  // reagieren Shader, HUD-Zähler und Video-Rate beim Ziehen genauso wie
  // beim Spulen.
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
    sound?.setScrubbing(false);
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
    sound?.setScrubbing(true);
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
    pushVelocity(Math.abs(e.clientX - lastX) / dt / DRAG_VELOCITY_SCALE);
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
      reel?.destroy();
      st.kill();
    },
    onMediaReady: (fn) => mediaReadyCallbacks.push(fn),
  };
}
