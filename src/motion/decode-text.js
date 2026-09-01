// Kinetische Typografie (CONCEPT.md §5): Decode-/Scramble-in NUR für
// H1/H2-Headlines beim ersten Erscheinen im Viewport — Mono-Zeichen zykeln
// kurz durch, bevor der finale Text steht, wie eine HUD-Anzeige, die eine
// Caption dekodiert. Bewusst nicht auf Fließtext/Nav angewendet.

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#_/·';
const REVEAL_STEP_MS = 28; // Zeit pro "Spalte", die sich final setzt

class TextScramble {
  constructor(el) {
    this.el = el;
    this.finalText = el.textContent;
    this.frame = 0;
    this.queue = [];
    this.raf = null;
  }

  play() {
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
    cancelAnimationFrame(this.raf);
    this._update = this._update.bind(this);
    this.raf = requestAnimationFrame(this._update);
  }

  _update() {
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
      return;
    }
    this.frame += 1;
    this.raf = requestAnimationFrame(this._update);
  }
}

/**
 * Aktiviert Decode-in für alle [data-decode]-Elemente, sobald sie ins
 * Viewport scrollen (einmalig). Unter reduced-motion wird sofort der
 * finale Text gezeigt, kein Scramble.
 */
export function initDecodeText({ reducedMotion }) {
  const els = document.querySelectorAll('[data-decode]');
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
