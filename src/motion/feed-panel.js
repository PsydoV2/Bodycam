// Sichtungsplatz (CONCEPT.md §6): Text links, Monitor rechts. Jede
// Textsection mit [data-feed-section] bekommt ab 1100px ein sticky
// Feed-Panel — die Seite liest sich damit wie ein Auswertungsplatz für
// Bodycam-Material: links das Protokoll, rechts das Bild dazu. Der Wechsel
// zwischen Bildern ist ein Kanalwechsel und löst denselben authored
// Scrub-Burst aus wie die Kapitelgrenzen (§5); der Shader behält das alte
// Bild in der Hold-Textur, sodass es beim Burst zeilenweise durchblitzt.
//
// Auslöser pro Section (data-feed-trigger):
//   hover  — Zeile unter der Maus / mit Fokus (Update, Modes)
//   scroll — Zeile, die gerade die Viewport-Mitte passiert (Lens)
//
// Darunter stehen Rand-Notizen im Akten-Stil: Sektor, Band-Bereich der
// Section (aus der Scroll-Position, dieselbe Timecode-Abbildung wie das
// HUD) und Quelle des Standbilds. Unter reduced-motion: kein Shader, kein
// Burst, das Bild wechselt schlicht.

import { scrubState, triggerBurst, timecodeAt, ScrollTrigger } from './scroll-engine.js';
import { ScrubShader } from './scrub-shader.js';

function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function initPanel(section, { reducedMotion }) {
  const feed = section.querySelector('.section-feed');
  const img = feed?.querySelector('img');
  const canvas = feed?.querySelector('canvas');
  const caption = feed?.querySelector('.section-feed-caption');
  const rows = Array.from(section.querySelectorAll('[data-feed]'));
  if (!feed || !img || !rows.length) return;

  const trigger = section.dataset.feedTrigger || 'hover';

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
    shader = new ScrubShader(canvas, images.get(rows[0].dataset.feed), () => scrubState.velocity, {
      baseGrain: 0.05,
      maxDpr: 1.25,
    });
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

  // --- Rand-Notizen -----------------------------------------------------
  const setMeta = (key, value) => {
    const el = feed.querySelector(`[data-meta="${key}"]`);
    if (el) el.textContent = value;
  };
  setMeta('sector', section.dataset.sector || '—');
  const updateTape = () => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    setMeta('tape', `${formatClock(timecodeAt(top))} → ${formatClock(timecodeAt(bottom))}`);
  };
  updateTape();
  ScrollTrigger.addEventListener('refresh', updateTape);

  // --- Kanalwechsel -----------------------------------------------------
  let current = null;
  function show(row) {
    if (row === current) return;
    current = row;
    const src = row.dataset.feed;
    const id = row.querySelector('.mode-id, .log-index')?.textContent.trim() ?? '';
    const name = row.querySelector('.mode-name')?.textContent.trim().toUpperCase() ?? '';
    const label = row.dataset.feedCaption || (name ? `${id} // ${name}` : id);
    if (caption) caption.textContent = label;
    setMeta('src', decodeURIComponent(src.split('/').pop() || '').toUpperCase());

    if (shader) {
      shader.setSource(images.get(src));
      triggerBurst(0.55, 320);
    } else {
      img.src = src;
    }
    rows.forEach((r) => r.classList.toggle('is-live', r === row));
  }

  if (trigger === 'scroll') {
    rows.forEach((row) => {
      ScrollTrigger.create({
        trigger: row,
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (self) => {
          if (self.isActive) show(row);
        },
      });
    });
  } else {
    rows.forEach((row) => {
      const target = row.querySelector('.mode-header') || row;
      target.addEventListener('mouseenter', () => show(row));
      target.addEventListener('focus', () => show(row), true);
    });
  }

  show(rows[0]);
}

export function initFeedPanels({ reducedMotion }) {
  document.querySelectorAll('[data-feed-section]').forEach((section) => initPanel(section, { reducedMotion }));
}
