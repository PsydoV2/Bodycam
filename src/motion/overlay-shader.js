// Seitenweite Atmosphäre-Schicht (CONCEPT.md §4.1/§6): ersetzt das alte
// statische `.grain`-Div durch eine velocity-reaktive WebGL-Ebene über JEDER
// gefilmten Section. Drei Schichten, eine Ursache (die Bandgeschwindigkeit):
//
//   1. Grain-Baseline — feines Korn, atmet leicht mit der Velocity
//   2. Sensorrauschen — niederfrequente, dunkelgraue Wolken, die langsam
//      driften: ein Bildsensor im Dunkeln. In Ruhe kaum sichtbar, beim
//      Scrub deutlicher. Das ist der Unterschied zwischen "Schwarz" und
//      "eine Kamera schaut in einen dunklen Raum".
//   3. Vignette — feste, dezente Abdunklung der Ecken: die Linse liegt
//      über allem, nicht nur über den Videos.
//
// KEINE Tracking-Bars hier: die sind ein Band-Scrub-Artefakt und bleiben
// den Video-Shadern (Hero/Gallery/Feeds) vorbehalten — über Fließtext sahen
// sie wie ein Rendering-Fehler aus.
//
// Wird über Hero/Gallery heruntergefahren (eigener Video-Shader, sonst
// doppelt) und in "unfilmed"-Sections (Acquire/Studio) sowie nach SIGNAL END
// komplett stummgeschaltet — dort ist die Fläche wirklich flach. Erst durch
// diesen Kontrast ist der Apparat als Zustand spürbar.

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

  // Value-Noise mit Smoothstep-Interpolation — reicht für weiche Wolken.
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // "Über"-Compositing in einem Pass: dst <- src(color, alpha).
  vec4 over(vec4 dst, vec3 color, float alpha) {
    float a = alpha + dst.a * (1.0 - alpha);
    vec3 rgb = (color * alpha + dst.rgb * dst.a * (1.0 - alpha)) / max(a, 0.0001);
    return vec4(rgb, a);
  }

  void main() {
    vec2 uv = vUv;
    vec2 px = floor(uv * uResolution);
    float damp = 1.0 - uSuppress;
    float aspect = uResolution.x / uResolution.y;

    vec4 acc = vec4(0.0);

    // 3. Vignette — fest, nicht velocity-abhängig: die Linse ist immer da.
    vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
    float vig = smoothstep(0.55, 1.25, length(centered)) * 0.42 * damp;
    acc = over(acc, vec3(0.0), vig);

    // 2. Sensorrauschen — zwei Oktaven, langsam driftend, mit der Velocity
    //    kräftiger (schnelles Spulen = mehr Verstärkung = mehr Rauschen).
    vec2 p = vec2(uv.x * aspect, uv.y) * 2.6 + vec2(uTime * 0.035, -uTime * 0.02);
    float clouds = vnoise(p) * 0.65 + vnoise(p * 2.3 + 7.1) * 0.35;
    clouds = smoothstep(0.35, 0.95, clouds);
    float cloudAlpha = clouds * mix(0.055, 0.16, uVelocity) * damp;
    acc = over(acc, vec3(0.62, 0.63, 0.6), cloudAlpha);

    // 1. Grain-Baseline — feines Korn, leicht atmend.
    float n = hash(px + uTime * 90.0);
    float grainAlpha = mix(0.06, 0.24, uVelocity) * damp;
    acc = over(acc, vec3(n), grainAlpha);

    gl_FragColor = vec4(acc.rgb, clamp(acc.a, 0.0, 0.6));
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

    const gl =
      canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) ||
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
    this._frame = 0;
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  /** 0 = voll sichtbar, 1 = komplett gedämpft (Hero/Gallery/unfilmed/Signal-End). */
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

    // Performance-Budget (CONCEPT.md §8): im Ruhezustand reicht die halbe
    // Bildrate (30 fps liest sich sogar filmischer) — nur während eines
    // Scrubs oder einer Dämpfungs-Transition rendert jeder Frame.
    const velocity = this.getVelocity();
    const settling = Math.abs(this.suppress - this._suppressCurrent) > 0.01;
    this._frame += 1;
    if (velocity < 0.02 && !settling && this._frame % 2 === 0) {
      this._raf = requestAnimationFrame(this._loop);
      return;
    }

    // Bei voller Dämpfung lohnt der Fullscreen-Pass nicht — leeren statt
    // shaden.
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this._suppressCurrent < 0.98) {
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
