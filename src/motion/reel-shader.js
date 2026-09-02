// Gemeinsamer WebGL-Canvas für die Filmrolle (CONCEPT.md §6/§8): EIN
// Kontext für alle Frames der Gallery statt sieben. Der Canvas liegt über
// dem gesamten Pin; pro sichtbarem Frame wird Viewport + Scissor auf dessen
// Rechteck gesetzt und dasselbe Scrub-Programm (scrub-shader.js) mit der
// Textur des jeweiligen Items gezeichnet. Der Rest des Canvas bleibt
// transparent, Überschrift und Captions liegen im DOM darunter/darüber.
//
// Videos laden erst beim Hereinfahren (preload="none"); bis der erste Frame
// da ist, wird das Poster-Bild in denselben Shader gegeben — die Optik
// bleibt durchgehend "Aufnahme", kein Sprung von Standbild zu Video.

import { createScrubProgram, createTexture, isSourceReady, uploadSource, coverScale, HOLD_INTERVAL } from './scrub-shader.js';

export class ReelShader {
  /**
   * @param {HTMLCanvasElement} canvas — deckt den Pin ab
   * @param {HTMLElement} container — Element, gegen das Item-Rechtecke gemessen werden
   * @param {() => number} getVelocity
   * @param {{ baseGrain?: number, maxDpr?: number }} [options]
   */
  constructor(canvas, container, getVelocity, options = {}) {
    this.canvas = canvas;
    this.container = container;
    this.getVelocity = getVelocity;
    this.baseGrain = options.baseGrain ?? 0.055;
    this.maxDpr = options.maxDpr ?? 1.25;
    this.ok = false;
    this.destroyed = false;
    this.items = [];
    this._raf = null;
    this._frame = 0;

    const gl =
      canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true }) ||
      canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: true });
    if (!gl) return;
    this.gl = gl;

    const built = createScrubProgram(gl);
    if (!built) return;
    this.uniforms = built.uniforms;
    gl.enable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);

    this._resize = this._resize.bind(this);
    this._resize();
    this._resizeObserver = new ResizeObserver(this._resize);
    this._resizeObserver.observe(canvas);

    this.ok = true;
  }

  /**
   * Registriert ein Frame der Rolle.
   * @param {HTMLElement} el — .media-frame (Rechteck-Referenz)
   * @param {HTMLVideoElement|HTMLImageElement} source — Live-Quelle
   * @param {HTMLImageElement|null} poster — Standbild, bis das Video Frames liefert
   */
  addItem(el, source, poster = null) {
    const gl = this.gl;
    const item = {
      el,
      source,
      poster,
      active: false,
      texture: createTexture(gl),
      holdTexture: createTexture(gl),
      holdReady: false,
      uploaded: null, // welche statische Quelle zuletzt hochgeladen wurde
      isVideo: source.tagName === 'VIDEO',
    };
    this.items.push(item);
    return item;
  }

  setActive(el, active) {
    const item = this.items.find((entry) => entry.el === el);
    if (!item) return;
    item.active = active;
    this._syncLoop();
  }

  /** Rendert nur, solange mindestens ein Frame im Bild ist (§8). */
  _syncLoop() {
    const anyActive = this.items.some((item) => item.active);
    if (anyActive && !this._raf && !this.destroyed) {
      this._loop = this._loop || this._render.bind(this);
      this._raf = requestAnimationFrame(this._loop);
    } else if (!anyActive && this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
      this.gl.disable(this.gl.SCISSOR_TEST);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.gl.enable(this.gl.SCISSOR_TEST);
    }
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this._dpr = dpr;
  }

  _render(tMs) {
    if (this.destroyed) return;
    const gl = this.gl;
    const t = tMs * 0.001;
    const velocity = this.getVelocity();
    this._frame += 1;

    const canvasRect = this.canvas.getBoundingClientRect();
    const dpr = this._dpr || 1;

    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);

    const u = this.uniforms;
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uVelocity, velocity);
    gl.uniform1f(u.uBaseGrain, this.baseGrain);

    for (const item of this.items) {
      if (!item.active) continue;

      // Quelle wählen: Video sobald es Frames hat, sonst Poster.
      const videoReady = item.isVideo && isSourceReady(item.source);
      const source = videoReady ? item.source : isSourceReady(item.poster) ? item.poster : !item.isVideo && isSourceReady(item.source) ? item.source : null;
      if (!source) continue;

      gl.activeTexture(gl.TEXTURE0);
      if (videoReady) {
        uploadSource(gl, item.texture, source);
        item.uploaded = source;
        if (this._frame % HOLD_INTERVAL === 0) {
          gl.activeTexture(gl.TEXTURE1);
          uploadSource(gl, item.holdTexture, source);
          item.holdReady = true;
        }
      } else if (item.uploaded !== source) {
        uploadSource(gl, item.texture, source);
        item.uploaded = source;
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, item.texture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, item.holdTexture);

      const r = item.el.getBoundingClientRect();
      const x = Math.round((r.left - canvasRect.left) * dpr);
      const y = Math.round((canvasRect.bottom - r.bottom) * dpr);
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (w <= 0 || h <= 0) continue;

      gl.viewport(x, y, w, h);
      gl.scissor(x, y, w, h);
      const [sx, sy] = coverScale(source, w, h);
      gl.uniform2f(u.uUvScale, sx, sy);
      gl.uniform2f(u.uResolution, w, h);
      gl.uniform1f(u.uHoldMix, item.holdReady ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    this._raf = requestAnimationFrame(this._loop);
  }

  destroy() {
    this.destroyed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._resizeObserver?.disconnect();
  }
}
