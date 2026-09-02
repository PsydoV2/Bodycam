// Das HUD lebt: kleine, diegetische Details, die die Kamera als Gerät
// glaubwürdig halten (CONCEPT.md §4.1: das HUD ist Mechanik, kein Kostüm).
//
// - Die Batterie sinkt langsam über die Session — ein Gerät, das läuft,
//   verbraucht Strom. Startwert und Untergrenze so gewählt, dass es nie
//   dramatisch wird (kein rotes Warn-Blinken, das wäre ein Effekt ohne
//   Ursache).
// - Das Session-Log beim SIGNAL END (§5-Bookend): eine Zusammenfassung im
//   HUD-Vokabular — wie viel Band gespult wurde, wie schnell maximal, wie
//   lange die Aufnahme lief. Rein lokal berechnet, es verlässt nichts die
//   Seite.

import { scrubState } from './scroll-engine.js';

const BATT_START = 74;
const BATT_FLOOR = 58;
const BATT_DRAIN_MS = 75_000; // 1 % alle 75 s

function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function initHudAlive() {
  const battEl = document.querySelector('#hud-batt-value');
  const startedAt = performance.now();

  if (battEl) {
    let level = BATT_START;
    battEl.textContent = `${level}%`;
    const drain = setInterval(() => {
      level = Math.max(BATT_FLOOR, level - 1);
      battEl.textContent = `${level}%`;
      if (level <= BATT_FLOOR) clearInterval(drain);
    }, BATT_DRAIN_MS);
  }

  const logEl = document.querySelector('#session-log');

  /** Wird vom Signal-End (signal-end.js) beim Herunterfahren aufgerufen. */
  function renderSessionLog() {
    if (!logEl) return;
    const tapeFrom = formatClock(scrubState.baseSeconds);
    const tapeTo = formatClock(scrubState.maxTimecodeSeconds);
    const peak = (1 + scrubState.peakVelocity * 3).toFixed(1);
    const onAir = formatDuration(performance.now() - startedAt);

    const set = (key, value) => {
      const el = logEl.querySelector(`[data-log="${key}"]`);
      if (el) el.textContent = value;
    };
    set('tape', `${tapeFrom} → ${tapeTo}`);
    set('peak', `${peak}×`);
    set('onair', onAir);
    logEl.classList.add('is-filled');
  }

  return { renderSessionLog };
}
