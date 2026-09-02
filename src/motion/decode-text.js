// Kinetische Typografie (CONCEPT.md §5): Decode-/Scramble-in NUR für
// H1/H2-Headlines beim ersten Erscheinen im Viewport — Mono-Zeichen zykeln
// kurz durch, bevor der finale Text steht, wie eine HUD-Anzeige, die eine
// Caption dekodiert. Bewusst nicht auf Fließtext/Nav angewendet.

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#_/·';
const FRAME_MS = 1000 / 60; // Zeitbasis: ein "Frame" der Choreografie = 16,7 ms,
// unabhängig von der echten Bildrate (120-Hz-Displays dekodieren sonst
// doppelt so schnell, gedrosselte Tabs kriechen).

class TextScramble {
  constructor(el) {
    this.el = el;
    // Originaltext einmal am Element merken: läuft play() ein zweites Mal,
    // während noch dekodiert wird, darf der halb-verwürfelte Zwischenstand
    // nie zum "finalen" Text werden.
    if (!el.dataset.decodeText) el.dataset.decodeText = el.textContent;
    this.finalText = el.dataset.decodeText;
    this.frame = 0;
    this.queue = [];
    this.raf = null;
  }

  play() {
    // Laufende Instanz am selben Element stoppen (sonst schreiben zwei
    // rAF-Loops abwechselnd in dasselbe Element).
    this.el._scramble?.cancel();
    this.el._scramble = this;

    const chars = this.finalText.split('');
    this.el.textContent = '';
    this.el.setAttribute('aria-label', this.finalText);
    // Während des Dekodierens liest sich der Text wie Systemtext (Mono),
    // erst der finale Wert steht wieder in der Display-Schrift
    // (CONCEPT.md §3 Typografie).
    this.el.classList.add('is-decoding');

    // Baut je Zeichen einen Start-/Endframe fürs Verzerren auf — Leerzeichen
    // und Zeilenumbrüche bleiben unangetastet, sonst "flackern" Wortlücken.
    this.queue = chars.map((finalChar, i) => {
      const isStatic = finalChar === ' ' || finalChar === '\n';
      const start = Math.floor(i * 0.6);
      const end = start + 10 + Math.floor(Math.random() * 8);
      return { finalChar, start, end, isStatic, current: '' };
    });

    this.frame = 0;
    this._lastT = null;
    cancelAnimationFrame(this.raf);
    this._update = this._update.bind(this);
    this.raf = requestAnimationFrame(this._update);
  }

  cancel() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  _update(now) {
    const dt = this._lastT === null ? FRAME_MS : Math.min(now - this._lastT, 250);
    this._lastT = now;

    let output = '';
    let complete = 0;

    for (const item of this.queue) {
      if (item.isStatic) {
        output += item.finalChar;
        complete += 1;
        continue;
      }
      if (this.frame >= item.end) {
        output += item.finalChar;
        complete += 1;
      } else if (this.frame >= item.start) {
        output += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      } else {
        output += ' ';
      }
    }

    this.el.textContent = output;

    if (complete === this.queue.length) {
      this.el.textContent = this.finalText;
      this.el.classList.remove('is-decoding');
      this.el._scramble = null;
      return;
    }
    this.frame += dt / FRAME_MS;
    this.raf = requestAnimationFrame(this._update);
  }
}

/**
 * Aktiviert Decode-in für alle [data-decode]-Elemente, sobald sie ins
 * Viewport scrollen (einmalig). Elemente mit [data-decode-manual] (Hero-
 * Titel, spielt nach der Boot-Sequenz via decodeNow) werden hier bewusst
 * übersprungen — sonst dekodiert der Titel zweimal, und wer den Boot per
 * Klick überspringt, bekam die zweite Runde auf halb-verwürfeltem Text.
 * Unter reduced-motion wird sofort der finale Text gezeigt, kein Scramble.
 */
export function initDecodeText({ reducedMotion }) {
  const els = document.querySelectorAll('[data-decode]:not([data-decode-manual])');
  if (!els.length) return;

  if (reducedMotion) return; // finaler Text steht bereits im Markup

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const scrambler = new TextScramble(entry.target);
        scrambler.play();
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4 },
  );

  els.forEach((el) => observer.observe(el));
}

/** Für den Hero-Titel, der sofort beim Laden (nach der Boot-Sequenz) spielt. */
export function decodeNow(el) {
  const scrambler = new TextScramble(el);
  scrambler.play();
}
