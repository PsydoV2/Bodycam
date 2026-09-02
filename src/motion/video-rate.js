// Bandgeschwindigkeit wörtlich (CONCEPT.md §1/§4.1): das Video selbst spult.
// Beim Scrub läuft die Wiedergabe bis auf 4-fache Geschwindigkeit hoch,
// beim Anhalten pendelt sie auf 1 zurück — die Artefakte des Shaders und
// die Bewegung im Bild haben damit dieselbe Ursache. Unter reduced-motion
// ist die Velocity dauerhaft 0, die Rate bleibt 1.

import { onScrubTick } from './scroll-engine.js';

const MAX_EXTRA_RATE = 3; // 1 + 3 = 4x — Chromium/Firefox spielen muted bis 16x, 4x bleibt lesbar
const MIN_DELTA = 0.05; // playbackRate ist kein billiger Setter — nur bei spürbarer Änderung schreiben

export function coupleVideoRate(video) {
  if (!video) return () => {};
  let current = 1;
  return onScrubTick((state) => {
    const target = 1 + state.velocity * MAX_EXTRA_RATE;
    if (Math.abs(target - current) < MIN_DELTA) return;
    current = target;
    try {
      video.playbackRate = target;
    } catch {
      /* Safari wirft bei nicht unterstützten Raten — dann bleibt 1x */
    }
  });
}
