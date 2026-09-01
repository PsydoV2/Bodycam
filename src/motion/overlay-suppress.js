// Kleine Registry, damit Hero/Gallery/Studio unabhängig voneinander den
// seitenweiten Overlay-Shader dämpfen können, ohne sich gegenseitig zu
// überschreiben (CONCEPT.md §4.1: Hero/Gallery haben eigenen Video-Shader,
// Studio ist komplett "unfilmed", §6).

export function createOverlaySuppressor(overlayShader) {
  const active = new Set();

  function update() {
    overlayShader?.setSuppress(active.size > 0 ? 1 : 0);
  }

  function watch(el, key) {
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) active.add(key);
          else active.delete(key);
        });
        update();
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
  }

  return { watch };
}
