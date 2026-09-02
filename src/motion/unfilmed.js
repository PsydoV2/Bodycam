// "Unfilmed"-Zustand (CONCEPT.md §3 Layout, §6): Sections sind entweder
// gefilmt (HUD, Grain, Autofokus-Cursor aktiv) oder bewusst unfilmed —
// kompletter Apparat aus. Gilt für alle Sections mit [data-unfilmed]
// (Acquire als erste Pause, Studio als größter Kontrastpunkt der Seite).
// Setzt eine Klasse auf <html>, über die CSS HUD- und Cursor-Sichtbarkeit
// steuert; der Overlay-Grain wird zentral über den Suppressor gedämpft.

export function initUnfilmed({ cursor, suppressor }) {
  const sections = document.querySelectorAll('[data-unfilmed]');
  if (!sections.length) return;

  const active = new Set();

  function apply() {
    const isUnfilmed = active.size > 0;
    document.documentElement.classList.toggle('is-unfilmed', isUnfilmed);
    cursor?.suppress('unfilmed', isUnfilmed);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) active.add(entry.target);
        else active.delete(entry.target);
      });
      apply();
    },
    { threshold: 0.35 },
  );

  sections.forEach((section) => {
    observer.observe(section);
    suppressor?.watch(section, `unfilmed:${section.id}`, 0.2);
  });
}
