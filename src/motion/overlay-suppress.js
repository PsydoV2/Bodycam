// Kleine Registry, damit Hero/Gallery/Acquire/Studio/Footer unabhängig
// voneinander den seitenweiten Overlay-Shader dämpfen können, ohne sich
// gegenseitig zu überschreiben (CONCEPT.md §4.1: Hero/Gallery haben eigenen
// Video-Shader; Acquire/Studio sind "unfilmed", §6; der Footer fährt den
// Apparat beim Signal-End herunter, §5).

export function createOverlaySuppressor(overlayShader) {
  const active = new Set();

  function update() {
    overlayShader?.setSuppress(active.size > 0 ? 1 : 0);
  }

  /** Manuelles Setzen — für Module, die ihre Sichtbarkeit selbst beobachten. */
  function set(key, isActive) {
    if (isActive) active.add(key);
    else active.delete(key);
    update();
  }

  function watch(el, key, threshold = 0.2) {
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) active.add(key);
          else active.delete(key);
        });
        update();
      },
      { threshold },
    );
    observer.observe(el);
  }

  return { watch, set };
}
