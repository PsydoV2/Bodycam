// Preview-Feed neben der Modes-Liste: beim Hover/Fokus über einer Mode-Zeile
// schaltet der Feed rechts auf ein Standbild dieses Modus — der Wechsel ist
// ein Kanalwechsel und löst denselben authored Scrub-Burst aus wie die
// Kapitelgrenzen (CONCEPT.md §5, ein System, zwei Auslöser). Der Shader
// behält beim Umschalten den alten Feed in der Hold-Textur, sodass beim
// Burst noch das vorherige Bild zeilenweise durchblitzt (§4.1 Frame-Hold).
//
// Nur ab 1100px Breite sichtbar (CSS) — darunter würde das Panel die Liste
// verdrängen. Unter reduced-motion: kein Shader, kein Burst, das Bild
// wechselt schlicht.

import { scrubState, triggerBurst } from './scroll-engine.js';
import { ScrubShader } from './scrub-shader.js';

export function initModesFeed({ reducedMotion }) {
  const section = document.querySelector('#modes');
  const feed = section?.querySelector('.modes-feed');
  const img = feed?.querySelector('img');
  const canvas = feed?.querySelector('canvas');
  const caption = feed?.querySelector('.modes-feed-caption');
  const rows = section ? Array.from(section.querySelectorAll('.mode-row[data-feed]')) : [];
  if (!feed || !img || !rows.length) return;

  // Alle Standbilder vorab dekodieren, damit der Kanalwechsel ohne
  // Nachlade-Loch passiert.
  const images = new Map();
  rows.forEach((row) => {
    const src = row.dataset.feed;
    if (images.has(src)) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    images.set(src, image);
  });

  let shader = null;
  if (!reducedMotion && canvas) {
    const first = images.get(rows[0].dataset.feed);
    shader = new ScrubShader(canvas, first, () => scrubState.velocity, { baseGrain: 0.05, maxDpr: 1.25 });
    if (shader.ok) {
      feed.classList.add('is-shaded');
      // Nur rendern, solange die Section im Bild ist (§8).
      const observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => (entry.isIntersecting ? shader.resume() : shader.pause())),
        { threshold: 0 },
      );
      observer.observe(section);
    } else {
      shader = null;
    }
  }

  let current = null;
  function show(row) {
    if (row === current) return;
    current = row;
    const src = row.dataset.feed;
    const id = row.querySelector('.mode-id')?.textContent.trim() ?? '';
    const name = row.querySelector('.mode-name')?.textContent.trim().toUpperCase() ?? '';
    if (caption) caption.textContent = `${id} // ${name}`;

    if (shader) {
      shader.setSource(images.get(src));
      triggerBurst(0.55, 320);
    } else {
      img.src = src;
    }
    rows.forEach((r) => r.classList.toggle('is-live', r === row));
  }

  rows.forEach((row) => {
    const header = row.querySelector('.mode-header');
    header?.addEventListener('mouseenter', () => show(row));
    header?.addEventListener('focus', () => show(row));
  });

  show(rows[0]);
}
