// Herzstück von CONCEPT.md §4.1/§5: Lenis (Smooth Scroll) + GSAP ScrollTrigger
// als Fundament, plus der zentrale Scrub-State, den alle anderen Module
// (Hero-Shader, Overlay-Shader, Cursor, Kapitel-Transitions) lesen.
//
// Scroll-Position = Timecode, Scroll-Geschwindigkeit = Bandgeschwindigkeit.
// Ein State, viele Konsumenten — kein Effekt hier duppliziert eigene
// Scroll-Listener.

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BASE_SECONDS = 14 * 60 + 52; // 00:14:52, wie im v1-Build
const PX_PER_SECOND = 6; // simulierte Bandsekunden pro Scroll-Pixel
const ATTACK_RATE = 11; // 1/s — wie schnell velocity nach oben folgt
const DECAY_RATE = 3.4; // 1/s — wie schnell velocity abklingt
const RAW_DECAY_RATE = 7; // 1/s — wie schnell ein einzelner Scroll-Spike verpufft
const VELOCITY_NORMALIZER = 2.2; // Lenis-Velocity-Einheiten -> 0..1

export const scrubState = {
  velocity: 0, // geglättet, 0..1 — treibt Shader/HUD/Cursor
  timecodeSeconds: BASE_SECONDS,
  frozen: false, // Signal-End-Bookend (§5): Timecode friert im Footer ein
  reducedMotion: prefersReducedMotion,
};

let rawVelocity = 0;
let burstUntil = 0; // performance.now()-Timestamp: bis dahin künstlich hohe Velocity (Kapitel-Transitions, §5)
let lenisInstance = null;
const listeners = new Set();

/** Abonniert Änderungen am Scrub-State (einmal pro rAF-Frame gefeuert). */
export function onScrubTick(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Löst einen authored Scrub-Burst aus — Kapitelgrenzen (CONCEPT.md §5). */
export function triggerBurst(strength = 0.85, durationMs = 550) {
  if (prefersReducedMotion) return;
  rawVelocity = Math.max(rawVelocity, strength);
  burstUntil = performance.now() + durationMs;
}

/** Speist rohe Velocity von außen ein — Drag-Scrub in der Gallery (§5/§6),
 *  damit Ziehen an der Filmrolle denselben Mechanismus füttert wie Scrollen. */
export function pushVelocity(value) {
  if (prefersReducedMotion) return;
  rawVelocity = Math.max(rawVelocity, Math.min(Math.max(value, 0), 1));
}

/** Signal-End-Bookend (§5): friert den Timecode ein, statt ihn weiter an
 *  die Scroll-Position zu koppeln — der Zähler steht, wie nach STOP. */
export function freezeTimecode(value) {
  scrubState.frozen = Boolean(value);
}

let lastFrameT = null;
function tick(nowMs) {
  const now = nowMs * 0.001;
  const dt = lastFrameT === null ? 1 / 60 : Math.min(now - lastFrameT, 0.25);
  lastFrameT = now;

  if (!prefersReducedMotion) {
    const target = performance.now() < burstUntil ? Math.max(rawVelocity, 0.7) : rawVelocity;
    const rate = target > scrubState.velocity ? ATTACK_RATE : DECAY_RATE;
    const k = 1 - Math.exp(-rate * dt);
    scrubState.velocity += (target - scrubState.velocity) * k;
    rawVelocity *= Math.exp(-RAW_DECAY_RATE * dt);
    if (scrubState.velocity < 0.001) scrubState.velocity = 0;
  }

  if (!scrubState.frozen) {
    scrubState.timecodeSeconds = BASE_SECONDS + Math.max(0, window.scrollY) / PX_PER_SECOND;
  }

  listeners.forEach((fn) => fn(scrubState));
  requestAnimationFrame(tick);
}

export function initScrollEngine() {
  if (!prefersReducedMotion) {
    lenisInstance = new Lenis({
      duration: 1.35, // bewusst etwas "schwer" — CONCEPT.md §5
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    lenisInstance.on('scroll', (e) => {
      ScrollTrigger.update();
      rawVelocity = Math.min(Math.abs(e.velocity) * VELOCITY_NORMALIZER, 1);
    });

    gsap.ticker.add((time) => {
      lenisInstance.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  } else {
    // Reduced-motion: nativer Scroll, ScrollTrigger arbeitet trotzdem —
    // nur ohne Inertia und ohne Velocity-Tracking (§5-Vertrag).
    window.addEventListener('scroll', () => ScrollTrigger.update(), { passive: true });
  }

  requestAnimationFrame(tick);
  return lenisInstance;
}

export function getLenis() {
  return lenisInstance;
}

export { gsap, ScrollTrigger };
