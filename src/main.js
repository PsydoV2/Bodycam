import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/hud.css';
import './styles/hero.css';
import './styles/acquire.css';
import './styles/lens.css';
import './styles/modes.css';
import './styles/early-access.css';
import './styles/gallery.css';
import './styles/studio.css';
import './styles/footer.css';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- REC-Timer -------------------------------------------------------
// Läuft tatsächlich mit — zahlt auf die Leitidee ein ("das ist eine
// laufende Aufnahme, keine Website über eine", CONCEPT.md §1/§3.2).
const recTimeEl = document.querySelector('#rec-time');
let elapsedSeconds = 14 * 60 + 52; // Startwert: 00:14:52

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

if (recTimeEl && !prefersReducedMotion) {
  setInterval(() => {
    elapsedSeconds += 1;
    recTimeEl.textContent = formatTime(elapsedSeconds);
  }, 1000);
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

      if (prefersReducedMotion) {
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
