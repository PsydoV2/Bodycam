// Seitenweite Atmosphäre-Schicht (CONCEPT.md §4.1/§6): ersetzt das alte
// statische `.grain`-Div durch eine velocity-reaktive WebGL-Ebene, die über
// JEDER Section liegt — NUR Grain-Baseline, keine Tracking-Bars.
//
// Tracking-Bars sind ein Band-Scrub-Artefakt und bleiben deshalb exklusiv
// den Video-Shadern (Hero/Gallery) vorbehalten, die tatsächlich Aufnahme-
// Material zeigen — über Fließtext/UI (Lens, Modes, ...) sahen sie nur wie
// ein Rendering-Fehler aus, nicht wie Teil der Aufnahme.
//
// Wird über Hero/Gallery dynamisch heruntergefahren (die haben ihren
// eigenen Video-Shader, sonst dupliziert sich das Grain) und über der
// Studio-Section komplett stummgeschaltet ("unfilmed", §6).
//
// Kein Texture-Sampling nötig (reines Prozedural-Rauschen) — deshalb ohne
// die Video-Textur-Komplexität von scrub-shader.js.

const VERT_SRC = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uVelocity;
  uniform vec2 uResolution;
  uniform float uSuppress;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    vec2 px = floor(uv * uResolution);
    float damp = 1.0 - uSuppress;

    // Nur Grain, leicht mit der Scrub-Geschwindigkeit atmend — bewusst
    // kein Tracking-Bar-Term hier (siehe Kommentar oben).
    float grainAmt = mix(0.045, 0.22, uVelocity) * damp;
    float n = hash(px + uTime * 90.0);

    gl_FragColor = vec4(vec3(n), clamp(grainAmt, 0.0, 0.55));
  }
`;

function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[overlay-shader]', gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

export class OverlayShader {
  constructor(canvas, getVelocity) {
    this.canvas = canvas;
    this.getVelocity = getVelocity;
    this.suppress = 0; // Ziel-Dämpfung, 0..1
    this._suppressCurrent = 0;
    this.ok = false;
    this.destroyed = false;

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
      canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;
    this.gl = gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[overlay-shader]', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    this.uTime = gl.getUniformLocation(program, 'uTime');
    this.uVelocity = gl.getUniformLocation(program, 'uVelocity');
    this.uResolution = gl.getUniformLocation(program, 'uResolution');
    this.uSuppress = gl.getUniformLocation(program, 'uSuppress');

    this._resize = this._resize.bind(this);
    this._resize();
    window.addEventListener('resize', this._resize);

    this.ok = true;
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  /** 0 = voll sichtbar, 1 = komplett gedämpft (Hero/Gallery/Studio). */
  setSuppress(value) {
    this.suppress = value;
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // Grain braucht keine Retina-Schärfe
    const w = Math.max(1, Math.round(window.innerWidth * dpr));
    const h = Math.max(1, Math.round(window.innerHeight * dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.gl) this.gl.viewport(0, 0, w, h);
  }

  _loop(tMs) {
    if (this.destroyed) return;
    const gl = this.gl;
    const t = tMs * 0.001;

    this._suppressCurrent += (this.suppress - this._suppressCurrent) * 0.12;

    // Performance-Budget (CONCEPT.md §8): im Ruhezustand reicht Grain mit
    // halber Bildrate (30 fps liest sich sogar filmischer) — nur während
    // eines Scrubs oder einer Dämpfungs-Transition rendert jeder Frame.
    const velocity = this.getVelocity();
    const settling = Math.abs(this.suppress - this._suppressCurrent) > 0.01;
    this._frame = (this._frame || 0) + 1;
    if (velocity < 0.02 && !settling && this._frame % 2 === 0) {
      this._raf = requestAnimationFrame(this._loop);
      return;
    }

    // Performance-Budget (CONCEPT.md §8): bei voller Dämpfung (Studio-
    // Section) lohnt sich der volle Fullscreen-Pass nicht — die Textur
    // bliebe ohnehin unsichtbar, also einfach leeren statt neu zu shaden.
    if (this._suppressCurrent > 0.98) {
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(this.uTime, t);
      gl.uniform1f(this.uVelocity, velocity);
      gl.uniform1f(this.uSuppress, this._suppressCurrent);
      gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    this._raf = requestAnimationFrame(this._loop);
  }

  destroy() {
    this.destroyed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._resize);
  }
}
