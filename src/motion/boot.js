// Boot-Sequenz (CONCEPT.md §5): "Signal wird aufgebaut" beim ersten Laden —
// kurzes Rauschen, Tracking-Bars ziehen durch (boot.css), dann rastet das
// Bild mit einem Fokus-Pull (unscharf -> scharf) ein. Markup und der
// unscharfe Startzustand (is-booting auf <html>) liegen bereits statisch in
// index.html, damit vor dem ersten Paint nichts scharf aufblitzt; dieses
// Modul steuert nur Timing, Skip und den Fokus-Pull. Unter reduced-motion
// entfällt alles zugunsten des sofort stabilen Bilds.

const FOCUS_PULL_MS = 850; // muss zur CSS-Transition in boot.css passen

export function initBoot({ reducedMotion }) {
  const bootEl = document.querySelector('#boot');
  if (!bootEl) return Promise.resolve();

  const html = document.documentElement;

  if (reducedMotion) {
    html.classList.remove('is-booting');
    bootEl.remove();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      bootEl.classList.add('is-done');
      // Fokus-Pull: Blur läuft per CSS-Transition auf 0, danach fliegt die
      // Filter-Klasse ganz raus (kein dauerhafter Compositing-Layer).
      html.classList.remove('is-booting');
      html.classList.add('is-focusing');
      setTimeout(() => html.classList.remove('is-focusing'), FOCUS_PULL_MS);
      setTimeout(() => bootEl.remove(), 500);
      resolve();
    };

    bootEl.addEventListener('click', finish, { once: true });
    // Überspringbar auch per Tastatur (§5: "überspringbar" gilt nicht nur
    // für Maus-Nutzer).
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        window.removeEventListener('keydown', onKey);
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    // Untere Grenze fürs Gefühl von "etwas passiert", obere Grenze aus §5:
    // unter 1,5 s, danach automatisch weiter.
    setTimeout(finish, 1300);
  });
}
