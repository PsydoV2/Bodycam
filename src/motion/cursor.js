// Autofokus-Cursor (CONCEPT.md §4.2): Sucherrahmen mit physischem Nachlauf
// (lerp statt 1:1), schnappt bei Hover über interaktiven Elementen auf ein
// Autofokus-Bracket. Deaktiviert bei Touch/Coarse-Pointer, reduced-motion
// und innerhalb der "unfilmed" Studio-Section (§6).

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

  window.addEventListener('mouseleave', () => {
    visible = false;
    root.classList.remove('is-visible');
  });

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest?.(INTERACTIVE_SELECTOR);
    root.classList.toggle('is-focused', Boolean(target));
    targetScale = target ? 1.7 : 1;
  });

  let disabled = false;
  /** Wird von main.js beim Betreten/Verlassen der Studio-Section umgeschaltet. */
  function setDisabled(value) {
    disabled = value;
    root.classList.toggle('is-suppressed', value);
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

  return { setDisabled };
}
