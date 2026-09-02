// Hero-Sektion: eigener Video-Shader (aus dem Spike übernommen) statt der
// alten CSS-Vignette. Overlay-Suppression läuft zentral über
// overlay-suppress.js (main.js verdrahtet das).

import { scrubState } from './scroll-engine.js';
import { ScrubShader } from './scrub-shader.js';

export function initHero({ reducedMotion }) {
  const heroEl = document.querySelector('#hero');
  const video = document.querySelector('#hero-video');
  const canvas = document.querySelector('#hero-canvas');
  if (!heroEl) return;

  if (!reducedMotion && video && canvas) {
    // maxDpr 1.5 statt 2: das Quellvideo ist 1080p, Grain/CA brauchen keine
    // Retina-Schärfe — auf 4K-Displays spart das ~44 % Fragment-Arbeit.
    const shader = new ScrubShader(canvas, video, () => scrubState.velocity, { baseGrain: 0.05, maxDpr: 1.5 });
    heroEl.classList.add(shader.ok ? 'is-shaded' : 'is-fallback');

    video.play().catch(() => {
      const resume = () => video.play().catch(() => {});
      window.addEventListener('scroll', resume, { once: true, passive: true });
      window.addEventListener('pointerdown', resume, { once: true });
    });

    // Performance-Budget (CONCEPT.md §8): sobald der Hero weit aus dem
    // Bild gescrollt ist, pausieren Shader-Loop und Video-Decoder statt
    // ungesehen weiterzulaufen.
    if (shader.ok) {
      const visibilityObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              shader.resume();
              video.play().catch(() => {});
            } else {
              shader.pause();
              video.pause();
            }
          });
        },
        { threshold: 0 },
      );
      visibilityObserver.observe(heroEl);
    }
  } else {
    heroEl.classList.add('is-fallback');
  }
}
