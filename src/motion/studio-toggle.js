// "Unfilmed"-Zustand für die Studio-Section (CONCEPT.md §3 Layout, §6):
// kompletter Apparat aus, sobald die Section im Bild ist — kein
// Overlay-Grain, kein Cursor. Setzt eine Klasse auf <html>, die CSS
// (Cursor-Sichtbarkeit) darüber steuert.

export function initStudioToggle({ cursor }) {
  const studioEl = document.querySelector('#studio');
  if (!studioEl) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const isUnfilmed = entry.isIntersecting;
        document.documentElement.classList.toggle('is-unfilmed', isUnfilmed);
        cursor?.setDisabled(isUnfilmed);
      });
    },
    { threshold: 0.35 },
  );
  observer.observe(studioEl);
}
