// Autofokus-Cursor (CONCEPT.md §4.2): Sucherrahmen mit physischem Nachlauf
// (lerp statt 1:1), schnappt bei Hover über interaktiven Elementen auf ein
// Autofokus-Bracket. Deaktiviert bei Touch/Coarse-Pointer, reduced-motion,
// innerhalb "unfilmed"-Sections (Acquire/Studio, §6) und nach SIGNAL END
// im Footer (§5) — mehrere Quellen können ihn gleichzeitig unterdrücken,
// deshalb ein Schlüssel-Set statt eines einzelnen Booleans.

const INTERACTIVE_SELECTOR = 'a, button, input, [role="button"], .mode-header';

export function initCursor({ reducedMotion }) {
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (reducedMotion || isCoarsePointer) return null;

  const root = document.createElement('div');
  root.className = 'af-cursor';
  root.innerHTML = `
    <span class="af-corner af-corner--tl"></span>
    <span class="af-corner af-corner--tr"></span>
    <span class="af-corner af-corner--bl"></span>
    <span class="af-corner af-corner--br"></span>
    <span class="af-dot"></span>
  `;
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);
  document.documentElement.classList.add('has-af-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let x = mouseX;
  let y = mouseY;
  let targetScale = 1;
  let currentScale = 1;
  let visible = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      x = mouseX;
      y = mouseY;
      root.classList.add('is-visible');
    }
  });

  // mouseleave feuert auf Elementen, nicht auf window — auf window
  // registriert blieb der Rahmen am Fensterrand stehen, wenn die Maus die
  // Seite verließ.
  document.documentElement.addEventListener('mouseleave', () => {
    visible = false;
    root.classList.remove('is-visible');
  });

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest?.(INTERACTIVE_SELECTOR);
    root.classList.toggle('is-focused', Boolean(target));
    targetScale = target ? 1.7 : 1;
  });

  const suppressors = new Set();
  /** Unterdrückt den Cursor, solange mindestens ein Schlüssel aktiv ist
   *  (unfilmed-Sections, Signal-End). */
  function suppress(key, active) {
    if (active) suppressors.add(key);
    else suppressors.delete(key);
    const off = suppressors.size > 0;
    root.classList.toggle('is-suppressed', off);
    document.documentElement.classList.toggle('is-cursor-off', off);
  }

  /** Drag-Scrub in der Gallery: Rahmen weitet sich zum Transport-Griff. */
  function setScrubbing(active) {
    root.classList.toggle('is-scrubbing', active);
    targetScale = active ? 1.35 : 1;
  }

  function loop() {
    // Kamera-Nachlauf: der Rahmen zieht der echten Mausposition leicht
    // hinterher, statt 1:1 zu folgen (CONCEPT.md §4.2).
    x += (mouseX - x) * 0.22;
    y += (mouseY - y) * 0.22;
    currentScale += (targetScale - currentScale) * 0.25;
    root.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${currentScale})`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { suppress, setScrubbing };
}
