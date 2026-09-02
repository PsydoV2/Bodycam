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
import './styles/gallery.css';
import './styles/studio.css';
import './styles/footer.css';
import './styles/responsive.css';

import { initScrollEngine, scrubState, onScrubTick, prefersReducedMotion, ScrollTrigger } from './motion/scroll-engine.js';
import { OverlayShader } from './motion/overlay-shader.js';
import { createOverlaySuppressor } from './motion/overlay-suppress.js';
import { initHero } from './motion/hero.js';
import { initCursor } from './motion/cursor.js';
import { initBoot } from './motion/boot.js';
import { initDecodeText, decodeNow } from './motion/decode-text.js';
import { initGalleryReel } from './motion/gallery-reel.js';
import { initUnfilmed } from './motion/unfilmed.js';
import { initSignalEnd } from './motion/signal-end.js';
import { initCountdown } from './motion/countdown.js';
import { initChapterTransitions } from './motion/chapter-transitions.js';
import { initSound } from './motion/sound.js';
import { initFeedPanels } from './motion/feed-panel.js';
import { initHudAlive } from './motion/hud-alive.js';

const reducedMotion = prefersReducedMotion;

// --- Motion-Fundament (CONCEPT.md §9, Schritt 1) ------------------------
initScrollEngine();
const cursor = initCursor({ reducedMotion });
const sound = initSound(); // §4.4 — opt-in, baut erst beim Klick einen AudioContext
const hud = initHudAlive();
cursor?.onFocus(() => sound?.tick());

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
// Lens bekam in einer früheren Fassung eine eigene Pin/Scrub-Choreografie
// (Log-Einträge blättern wie Akte-Seiten) — für nur vier kurze
// Ein-Satz-Einträge stand der Scroll-Aufwand in keinem Verhältnis zum
// Inhalt (zu lang für zu wenig Text). Jetzt läuft Lens über dasselbe
// ruhige [data-reveal]-Scroll-Reveal wie Modes (weiter unten) — kein
// eigenes Pin-Modul mehr nötig, dafür auch keine Pin-Spacer-Reihenfolge
// mehr zu beachten.
initHero({ reducedMotion });
const gallery = initGalleryReel({ reducedMotion, cursor, sound });
initFeedPanels({ reducedMotion }); // Sichtungsplatz: Feed rechts neben Update/Lens/Modes
initUnfilmed({ cursor, suppressor, sound }); // Acquire + Studio (§6)
initSignalEnd({ cursor, suppressor, sound, hud, reducedMotion }); // Footer-Bookend (§5)
initCountdown({ reducedMotion }); // Dispatch-Bandzähler (§6)
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
// wieder stabilisiert (siehe prototyp/prototype-scrub.html). Beim
// Signal-End im Footer (§5) friert er ein und stottert auch nicht mehr.
const recTimeEl = document.querySelector('#rec-time');
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
if (recTimeEl) {
  onScrubTick((state) => {
    if (!state.frozen && state.velocity > 0.3 && Math.random() < state.velocity * 0.5) {
      const jitter = state.timecodeSeconds + (Math.random() - 0.5) * 40 * state.velocity;
      recTimeEl.textContent = formatTime(Math.max(0, jitter));
    } else {
      recTimeEl.textContent = formatTime(state.timecodeSeconds);
    }
  });
}

// --- Sektor-Tag folgt der Section im Viewport -------------------------
// CONCEPT.md §6 (Section-Regie): der Sektor-Tag wechselt pro Section, das
// erzählt nebenbei, dass man durch verschiedene Einsätze/Locations
// scrollt — und zeigt im Footer "SIGNAL END" (§5-Bookend).
//
// Hit-Test in der Viewport-Mitte statt IntersectionObserver-Ratio: die
// Ratio-Variante erreichte bei Sections, die höher als der Viewport sind,
// nie ihren Schwellwert — die gepinnte Gallery (mehrere Viewporthöhen
// Spacer) bekam so nie ihr "FIELD ARCHIVE". elementFromPoint sieht die
// gepinnte (position:fixed) Filmrolle als das, was sie ist: Teil der
// Gallery-Section. Läuft nur, wenn sich die Scroll-Position geändert hat.
const hudSectorEl = document.querySelector('#hud-sector');

if (hudSectorEl) {
  let switchTimer = null;
  let lastScrollY = null;

  const setSector = (nextSector) => {
    if (hudSectorEl.dataset.current === nextSector) return;
    hudSectorEl.dataset.current = nextSector;

    if (reducedMotion) {
      hudSectorEl.textContent = `CAM_03 // ${nextSector}`;
      return;
    }
    clearTimeout(switchTimer);
    hudSectorEl.classList.add('is-switching');
    switchTimer = setTimeout(() => {
      hudSectorEl.textContent = `CAM_03 // ${nextSector}`;
      hudSectorEl.classList.remove('is-switching');
    }, 180);
  };

  onScrubTick(() => {
    if (window.scrollY === lastScrollY) return;
    lastScrollY = window.scrollY;
    // Boot-Overlay/Cursor/HUD sind pointer-events:none bzw. temporär —
    // closest() liefert dann null, und der Tag bleibt einfach stehen.
    const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    const section = hit?.closest?.('[data-sector]');
    if (section) setSector(section.dataset.sector);
  });
}

// --- Scroll-Hinweis im Hero: nach dem ersten Scrub ausblenden -----------
// Wer schon spult, braucht die Aufforderung nicht mehr — sie stünde sonst
// dauerhaft neben dem Sektor-Tag.
const scrollHint = document.querySelector('.scroll-hint');
if (scrollHint) {
  const offHint = onScrubTick(() => {
    if (window.scrollY > 40) {
      scrollHint.classList.add('is-hidden');
      offHint();
    }
  });
}

// --- Scroll-Reveal für Log-/Mode-Einträge ------------------------------
// Trägt sowohl Lens als auch Modes — beide bewusst ohne Pin/Zusatzbewegung
// (CONCEPT.md §6: der Mechanismus muss zum Gewicht des Inhalts passen).
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
