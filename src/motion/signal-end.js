// Signal-End-Bookend (CONCEPT.md §5): Spiegel der Boot-Sequenz. Sobald der
// Footer im Bild ist, fährt der Kamera-Apparat sichtbar herunter — erst ein
// letzter authored Scrub-Spike (derselbe Mechanismus wie §4.1), dann:
// Timestamp friert ein, Grain fällt auf 0, Cursor kehrt zum System-Cursor
// zurück. Scrollt man wieder hoch, nimmt die Aufnahme den Betrieb wieder
// auf — der Bookend ist ein Zustand, kein einmaliges Event.

import { triggerBurst, freezeTimecode } from './scroll-engine.js';

const SHUTDOWN_DELAY_MS = 420; // Burst zuerst sichtbar werden lassen, dann aus

export function initSignalEnd({ cursor, suppressor, reducedMotion }) {
  const footer = document.querySelector('#footer');
  if (!footer) return;

  const html = document.documentElement;
  let shutdownTimer = null;

  function shutdown() {
    html.classList.add('is-signal-end');
    freezeTimecode(true);
    cursor?.suppress('signal-end', true);
    suppressor?.set('signal-end', true);
  }

  function resume() {
    clearTimeout(shutdownTimer);
    html.classList.remove('is-signal-end');
    freezeTimecode(false);
    cursor?.suppress('signal-end', false);
    suppressor?.set('signal-end', false);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          resume();
          return;
        }
        if (reducedMotion) {
          shutdown();
          return;
        }
        triggerBurst(0.9, 600);
        clearTimeout(shutdownTimer);
        shutdownTimer = setTimeout(shutdown, SHUTDOWN_DELAY_MS);
      });
    },
    { threshold: 0.3 },
  );
  observer.observe(footer);
}
