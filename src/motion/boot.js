// Boot-Sequenz (CONCEPT.md §5): "Signal wird aufgebaut" beim ersten Laden.
// Markup liegt bereits statisch in index.html (kein FOUC), dieses Modul
// steuert nur Timing/Skip. Unter reduced-motion entfällt sie komplett.

export function initBoot({ reducedMotion }) {
  const bootEl = document.querySelector('#boot');
  if (!bootEl) return Promise.resolve();

  if (reducedMotion) {
    bootEl.remove();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      bootEl.classList.add('is-done');
      setTimeout(() => bootEl.remove(), 500);
      resolve();
    };

    bootEl.addEventListener('click', finish, { once: true });
    // Untere Grenze fürs Gefühl von "etwas passiert", obere Grenze aus §5:
    // unter 1,5 s, danach automatisch weiter.
    setTimeout(finish, 1300);
  });
}
