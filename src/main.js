import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/hud.css';
import './styles/boot.css';
import './styles/cursor.css';
import './styles/hero.css';
import './styles/acquire.css';
import './styles/update.css';
import './styles/lens.css';
import './styles/modes.css';
import './styles/early-access.css';
import './styles/gallery.css';
import './styles/studio.css';
import './styles/footer.css';

import { initScrollEngine, scrubState, onScrubTick, prefersReducedMotion, ScrollTrigger } from './motion/scroll-engine.js';
import { OverlayShader } from './motion/overlay-shader.js';
import { createOverlaySuppressor } from './motion/overlay-suppress.js';
import { initHero } from './motion/hero.js';
import { initCursor } from './motion/cursor.js';
import { initBoot } from './motion/boot.js';
import { initDecodeText, decodeNow } from './motion/decode-text.js';
import { initGalleryReel } from './motion/gallery-reel.js';
import { initLensPin } from './motion/lens-pin.js';
import { initStudioToggle } from './motion/studio-toggle.js';
import { initChapterTransitions } from './motion/chapter-transitions.js';

const reducedMotion = prefersReducedMotion;

// --- Motion-Fundament (CONCEPT.md §9, Schritt 1) ------------------------
initScrollEngine();
const cursor = initCursor({ reducedMotion });

// --- Seitenweite Atmosphäre-Schicht (§4.1) — ersetzt das alte statische
//     .grain-Div, sobald WebGL verfügbar ist.
let overlayShader = null;
const overlayCanvas = document.querySelector('#overlay-canvas');
if (overlayCanvas && !reducedMotion) {
  overlayShader = new OverlayShader(overlayCanvas, () => scrubState.velocity);
  if (overlayShader.ok) document.querySelector('.grain')?.remove();
}
const suppressor = createOverlaySuppressor(overlayShader);
suppressor.watch(document.querySelector('#hero'), 'hero');
suppressor.watch(document.querySelector('#gallery'), 'gallery');

// --- Sections -------------------------------------------------------
// Reihenfolge ist hier nicht egal: Lens sitzt im Dokument VOR Gallery und
// pinnt sich selbst (fügt einen Spacer ein, der alles danach nach unten
// schiebt). Erst Lens, dann Gallery aufbauen, damit Gallerys Start-/
// Endposition gegen das bereits verschobene Layout berechnet wird — sonst
// startet/endet die Gallery-Pin an der falschen Stelle (zu früh/zu kurz).
initHero({ reducedMotion });
initLensPin({ reducedMotion });
const gallery = initGalleryReel({ reducedMotion });
initStudioToggle({ cursor });
initChapterTransitions();
initDecodeText({ reducedMotion });

// Trotz korrekter Reihenfolge: Web-Fonts (@fontsource, async) und
// Bild-/Video-Metadaten können nach dem ersten Layout noch Höhen/Breiten
// verschieben. Einmal explizit neu berechnen, sobald alles wirklich steht,
// statt uns auf GSAPs eigenes (debounced) Auto-Refresh-Timing zu verlassen.
requestAnimationFrame(() => ScrollTrigger.refresh());
if (document.fonts?.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
window.addEventListener('load', () => ScrollTrigger.refresh());
gallery?.onMediaReady?.(() => ScrollTrigger.refresh());

// --- Boot-Sequenz, danach Hero-Headline decoden --------------------
const heroH1 = document.querySelector('#hero h1[data-decode]');
initBoot({ reducedMotion }).then(() => {
  if (heroH1 && !reducedMotion) decodeNow(heroH1);
});

// --- HUD-Timecode: an Scroll-Position gekoppelt (CONCEPT.md §4.1) -------
// Kein unabhängiger Fake-Timer mehr — der Zähler IST die Scroll-Position,
// stottert bei hoher Scrub-Geschwindigkeit, bevor er sich beim Anhalten
// wieder stabilisiert (siehe prototyp/prototype-scrub.html).
const recTimeEl = document.querySelector('#rec-time');
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
if (recTimeEl) {
  onScrubTick((state) => {
    if (state.velocity > 0.3 && Math.random() < state.velocity * 0.5) {
      const jitter = state.timecodeSeconds + (Math.random() - 0.5) * 40 * state.velocity;
      recTimeEl.textContent = formatTime(Math.max(0, jitter));
    } else {
      recTimeEl.textContent = formatTime(state.timecodeSeconds);
    }
  });
}

// --- Sektor-Tag folgt der Section im Viewport -------------------------
// CONCEPT.md §3.2: "Sektor-Tag ändert sich pro Section [...] das
// erzählt nebenbei, dass man durch verschiedene Einsätze/Locations
// scrollt."
const hudSectorEl = document.querySelector('#hud-sector');
const sectorSections = document.querySelectorAll('main [data-sector]');

if (hudSectorEl && sectorSections.length) {
  const sectorObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      const nextSector = visible.target.dataset.sector;
      if (hudSectorEl.dataset.current === nextSector) return;
      hudSectorEl.dataset.current = nextSector;

      if (reducedMotion) {
        hudSectorEl.textContent = `CAM_03 // ${nextSector}`;
        return;
      }
      hudSectorEl.classList.add('is-switching');
      setTimeout(() => {
        hudSectorEl.textContent = `CAM_03 // ${nextSector}`;
        hudSectorEl.classList.remove('is-switching');
      }, 180);
    },
    { threshold: [0.3, 0.5, 0.7] },
  );
  sectorSections.forEach((section) => sectorObserver.observe(section));
}

// --- Scroll-Reveal für Log-/Mode-Einträge ------------------------------
// (Lens-Einträge übernimmt inzwischen lens-pin.js unter vollem Motion —
// dieser Block bleibt als Fallback/für die Modes-Liste, die bewusst ohne
// Zusatzbewegung auskommt, CONCEPT.md §6.)
const revealEls = document.querySelectorAll('[data-reveal]');
if (revealEls.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -60px 0px' },
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

// --- Modes-Akkordeon ---------------------------------------------------
document.querySelectorAll('.mode-header').forEach((button) => {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
  });
});

// --- Newsletter (Demo) --------------------------------------------------
// Kein Backend vorhanden — es wird nichts irgendwohin gesendet, das ist
// hier bewusst nur eine UI-Demo und wird auch klar so benannt (Label +
// Statusmeldung), statt eine echte Anmeldung vorzutäuschen.
const newsletterForm = document.querySelector('#newsletter-form');
const newsletterNote = document.querySelector('#newsletter-note');
if (newsletterForm && newsletterNote) {
  newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    newsletterNote.textContent = 'Demo only — this fan project doesn\'t collect emails.';
  });
}
