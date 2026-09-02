// Dispatch-Countdown (CONCEPT.md §6): die Ziffern rollen wie ein
// mechanischer Bandzähler statt einfach zu wechseln. Jede Ziffer ist eine
// vertikale Ziffernrolle (0–9), die per translateY auf den Zielwert fährt.
// Beim ersten Erscheinen der Section (die per authored Scrub-Burst
// hereinkommt, §5) stehen die Rollen zunächst auf zufälligen Positionen
// und drehen sich dann auf den echten Wert ein — der Zähler "rastet",
// statt fertig da zu stehen.
//
// Unter reduced-motion: keine Rollen, schlicht der Text, einmal pro Sekunde.

const FORMAT = 'DDd HH:MM:SS';

function pad2(n) {
  return String(Math.min(99, Math.max(0, n))).padStart(2, '0');
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(d)}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function initCountdown({ reducedMotion }) {
  const root = document.querySelector('#update-countdown');
  const valueEl = document.querySelector('#countdown-value');
  if (!root || !valueEl) return;

  const labelEl = root.querySelector('.countdown-label');
  const target = Date.parse(root.dataset.target || '');
  if (Number.isNaN(target)) return;

  const liveLabel = root.dataset.liveLabel || 'LIVE NOW · FREE UPDATE';
  const idleLabel = labelEl?.textContent || '';

  function remaining() {
    return target - Date.now();
  }

  function setLiveState(isLive) {
    root.classList.toggle('is-live', isLive);
    if (labelEl) labelEl.textContent = isLive ? liveLabel : idleLabel;
  }

  // --- Reduced-motion / Fallback: reiner Text --------------------------
  if (reducedMotion) {
    const render = () => {
      const ms = remaining();
      valueEl.textContent = formatRemaining(ms);
      setLiveState(ms <= 0);
    };
    render();
    setInterval(render, 1000);
    return;
  }

  // --- Ziffernrollen aufbauen -------------------------------------------
  valueEl.textContent = '';
  valueEl.setAttribute('aria-label', formatRemaining(remaining()));
  const digits = [];

  FORMAT.split('').forEach((ch) => {
    if (/[DHMS]/.test(ch)) {
      const digit = document.createElement('span');
      digit.className = 'roll-digit';
      const strip = document.createElement('span');
      strip.className = 'roll-strip';
      for (let i = 0; i < 10; i += 1) {
        const cell = document.createElement('i');
        cell.textContent = String(i);
        strip.appendChild(cell);
      }
      digit.appendChild(strip);
      valueEl.appendChild(digit);
      digits.push(strip);
    } else {
      const sep = document.createElement('span');
      sep.className = 'roll-sep';
      // Geschütztes Leerzeichen — ein normales kollabiert im inline-block.
      sep.textContent = ch === ' ' ? '\u00a0' : ch;
      valueEl.appendChild(sep);
    }
  });
  valueEl.querySelectorAll('.roll-digit, .roll-sep').forEach((el) => el.setAttribute('aria-hidden', 'true'));

  function setStrips(text) {
    const chars = text.replace(/[^0-9]/g, '');
    digits.forEach((strip, i) => {
      strip.style.setProperty('--n', chars[i] ?? '0');
    });
  }

  // Startzustand: Rollen auf Zufallspositionen, bis die Section im Bild ist.
  digits.forEach((strip) => strip.style.setProperty('--n', String(Math.floor(Math.random() * 10))));

  let armed = false;
  function render() {
    const ms = remaining();
    const text = formatRemaining(ms);
    valueEl.setAttribute('aria-label', text);
    setLiveState(ms <= 0);
    if (armed) setStrips(text);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      armed = true;
      root.classList.add('is-spinning');
      render();
      setTimeout(() => root.classList.remove('is-spinning'), 1100);
      observer.disconnect();
    },
    { threshold: 0.5 },
  );
  observer.observe(root);

  render();
  setInterval(render, 1000);
}
