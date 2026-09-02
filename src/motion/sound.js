// Sound (CONCEPT.md §4.4) — opt-in, nie automatisch hörbar. Web Audio nativ,
// keine Bibliothek: ein sehr leises Rauschbett (Funk-/Bandrauschen), dessen
// Pegel aus derselben Scrub-Velocity kommt wie die Shader-Uniforms (ein
// System, kein zweites), ein leises Bestätigungs-Ticken beim Autofokus-Snap
// (§4.2) und ein Transport-Motor, der nur beim Ziehen an der Filmrolle
// läuft. In "unfilmed"-Sections und nach SIGNAL END ist alles stumm.
//
// Erst der Klick auf den HUD-Chip erzeugt den AudioContext — vorher
// existiert kein Audio-Graph, es kann also auch nichts versehentlich
// hörbar werden (Browser-Autoplay-Policy und Konzept-Regel decken sich).

import { onScrubTick } from './scroll-engine.js';

const NOISE_BASE = 0.035;
const NOISE_SCRUB = 0.2;
const MOTOR_GAIN = 0.1;

export function initSound() {
  const chip = document.querySelector('#hud-audio');
  if (!chip || typeof window.AudioContext === 'undefined') return null;

  let ctx = null;
  let master = null;
  let noiseGain = null;
  let motorOsc = null;
  let motorGain = null;
  let enabled = false;
  let scrubbing = false;
  const mutes = new Set();

  function build() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Rauschbett: weißes Rauschen, tiefpassgefiltert und leicht "braun"
    // integriert — liest sich wie Funkrauschen/Handschuhreibung, nicht wie
    // ein Synthesizer.
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = 0.985 * last + 0.06 * white;
      data[i] = last * 3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1400;
    noiseGain = ctx.createGain();
    noiseGain.gain.value = NOISE_BASE;
    noise.connect(lowpass).connect(noiseGain).connect(master);
    noise.start();

    // Transport-Motor: Sägezahn tief gefiltert, Tonhöhe folgt der Velocity.
    motorOsc = ctx.createOscillator();
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.value = 46;
    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.value = 360;
    motorGain = ctx.createGain();
    motorGain.gain.value = 0;
    motorOsc.connect(motorFilter).connect(motorGain).connect(master);
    motorOsc.start();
  }

  function audible() {
    return enabled && mutes.size === 0;
  }

  onScrubTick((state) => {
    if (!ctx) return;
    const target = audible() ? 1 : 0;
    master.gain.value += (target - master.gain.value) * 0.08;
    noiseGain.gain.value = NOISE_BASE + state.velocity * NOISE_SCRUB;
    motorGain.gain.value += ((scrubbing ? MOTOR_GAIN : 0) - motorGain.gain.value) * 0.15;
    motorOsc.frequency.value = 46 + state.velocity * 170;
  });

  function render() {
    chip.textContent = enabled ? 'AUDIO ON' : 'AUDIO OFF';
    chip.setAttribute('aria-pressed', String(enabled));
    chip.classList.toggle('is-on', enabled);
  }

  chip.addEventListener('click', () => {
    enabled = !enabled;
    if (enabled) {
      if (!ctx) build();
      ctx.resume().catch(() => {});
    }
    render();
  });
  render();

  return {
    /** Autofokus-Bestätigung (§4.2/§4.4): ein sehr kurzes, leises Ticken. */
    tick() {
      if (!ctx || !audible()) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 2600;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.045, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.05);
    },
    /** Stummschalten per Schlüssel — unfilmed-Sections, Signal-End. */
    mute(key, active) {
      if (active) mutes.add(key);
      else mutes.delete(key);
    },
    setScrubbing(value) {
      scrubbing = Boolean(value);
    },
  };
}
