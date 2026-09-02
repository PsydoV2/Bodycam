// Scrub-Shader (CONCEPT.md §4.1): rendert eine Video- oder Bildquelle mit
// Chromatic Aberration, Grain, Tracking-Bars und Vignette, deren Stärke von
// einer außen übergebenen Velocity-Funktion kommt.
//
// Frame-Hold: ein echtes Band zeigt beim Spulen nicht nur Rauschen, sondern
// zeilenweise Reste des vorherigen Bilds. Dafür hält der Shader eine zweite
// Textur (uHold), die nur alle paar Frames aus dem Video aktualisiert wird —
// bei hoher Velocity mischen sich einzelne Zeilenbänder aus diesem veralteten
// Frame ins Live-Bild, horizontal versetzt. Bei Stillstand ist der Mix 0.
//
// Zwei gelöste Bugs aus dem Prototyp sind hier eingebaut: UNPACK_FLIP_Y_WEBGL
// (sonst kopfüber) und zeitbasierte statt framebasierte Zeitkonstanten (rAF
// wird bei unsichtbaren Tabs gedrosselt).
//
// Das Programm selbst ist als Factory exportiert, damit der gemeinsame
// Gallery-Canvas (reel-shader.js) dieselbe Optik mit EINEM WebGL-Kontext
// für alle Frames der Filmrolle nutzen kann.

export const VERT_SRC = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

export const FRAG_SRC = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform sampler2D uHold;
  uniform float uHoldMix;
  uniform float uTime;
  uniform float uVelocity;
  uniform vec2 uResolution;
  uniform float uBaseGrain;
  uniform vec2 uUvScale; // Cover-Cropping: Textur-Seitenverhältnis vs. Zielrechteck

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  vec3 sampleCA(sampler2D tex, vec2 uv, float amount) {
    vec2 dir = normalize(uv - 0.5 + 0.0001);
    float r = texture2D(tex, uv - dir * amount).r;
    float g = texture2D(tex, uv).g;
    float b = texture2D(tex, uv + dir * amount).b;
    return vec3(r, g, b);
  }

  void main() {
    // object-fit: cover — die Quelle wird beschnitten, nie gestreckt (sonst
    // wäre ein 16:9-Video auf einem Hochkant-Handy verzerrt).
    vec2 uv = (vUv - 0.5) * uUvScale + 0.5;

    // Die harten Band-Artefakte (Tracking-Bars, Frame-Hold) setzen erst bei
    // wirklich schnellem Scrub ein — bei normalem Scrollen bleibt das Bild
    // lesbar, die Störung ist Würze, kein Dauerzustand.
    float trackStrength = smoothstep(0.45, 1.0, uVelocity);

    // Tracking-Bars: kurze, harte Störzeilen wie beim Spulen eines Bandes.
    float rowSeed = floor(uv.y * 90.0 + uTime * 2.0);
    float rowNoise = hash(vec2(rowSeed, floor(uTime * 6.0)));
    float displace = (rowNoise - 0.5) * 0.025 * trackStrength * step(0.95, rowNoise);
    uv.x += displace;

    float caAmount = mix(0.0012, 0.006, uVelocity);
    vec3 live = sampleCA(uTex, uv, caAmount);

    // Frame-Hold: Zeilenbänder aus dem veralteten Frame, horizontal
    // verschoben — Anteil und Versatz wachsen mit der Bandgeschwindigkeit.
    float band = floor(uv.y * 28.0);
    float bandNoise = hash(vec2(band, floor(uTime * 9.0)));
    float useHold = step(1.0 - 0.3 * trackStrength, bandNoise) * uHoldMix * step(0.05, trackStrength);
    vec2 holdUv = uv + vec2((hash(vec2(band, 7.0)) - 0.5) * 0.04 * trackStrength, 0.0);
    vec3 held = sampleCA(uHold, clamp(holdUv, 0.0, 1.0), caAmount * 1.5);
    vec3 color = mix(live, held, useHold);

    // Grain und Vignette beziehen sich aufs Zielrechteck (vUv), nicht auf
    // die beschnittene Textur — sonst wandert die Vignette mit dem Crop.
    float grainAmt = mix(uBaseGrain, 0.16, uVelocity);
    float grain = (hash(vUv * uResolution.xy + uTime * 60.0) - 0.5) * grainAmt;
    color += grain;

    float vig = smoothstep(0.9, 0.35, length(vUv - 0.5));
    color *= mix(0.55, 1.0, vig);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Alle wie viele Render-Frames die Hold-Textur nachgezogen wird — grob
// 150–200 ms Verzögerung bei 60 fps, das liest sich wie ein Band, das dem
// Bild hinterherhängt, ohne dass zwei komplett unzusammenhängende Szenen
// übereinanderliegen.
export const HOLD_INTERVAL = 10;

function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[scrub-shader]', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Kompiliert das Scrub-Programm auf einem Kontext und bindet das
 * Fullscreen-Dreieck. Liefert Uniform-Locations; null bei Fehler.
 */
export function createScrubProgram(gl) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[scrub-shader]', gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  const uniforms = {
    uTime: u('uTime'),
    uVelocity: u('uVelocity'),
    uResolution: u('uResolution'),
    uBaseGrain: u('uBaseGrain'),
    uTex: u('uTex'),
    uHold: u('uHold'),
    uHoldMix: u('uHoldMix'),
    uUvScale: u('uUvScale'),
  };
  gl.uniform1i(uniforms.uTex, 0);
  gl.uniform1i(uniforms.uHold, 1);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  return { program, uniforms };
}

export function createTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

/** Skalierung der UVs, damit die Quelle das Rechteck wie object-fit:cover
 *  füllt (beschnitten statt gestreckt). */
export function coverScale(source, rectW, rectH) {
  const sw = source.videoWidth || source.naturalWidth || 16;
  const sh = source.videoHeight || source.naturalHeight || 9;
  const srcAspect = sw / sh;
  const rectAspect = rectW / Math.max(1, rectH);
  if (rectAspect > srcAspect) return [1, srcAspect / rectAspect]; // Rechteck breiter: oben/unten beschneiden
  return [rectAspect / srcAspect, 1]; // Rechteck höher: links/rechts beschneiden
}

export function isSourceReady(source) {
  if (!source) return false;
  if (source.tagName === 'VIDEO') return source.readyState >= source.HAVE_CURRENT_DATA;
  return source.complete && source.naturalWidth > 0;
}

export function uploadSource(gl, texture, source) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
}

export class ScrubShader {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLVideoElement|HTMLImageElement} source
   * @param {() => number} getVelocity — liefert 0..1
   * @param {{ baseGrain?: number, maxDpr?: number }} [options]
   */
  constructor(canvas, source, getVelocity, options = {}) {
    this.canvas = canvas;
    this.source = source;
    this.getVelocity = getVelocity;
    this.baseGrain = options.baseGrain ?? 0.05;
    this.maxDpr = options.maxDpr ?? 2;
    this.ok = false;
    this.destroyed = false;
    this._raf = null;
    this._resizeObserver = null;
    this._frame = 0;
    this._holdReady = false;
    this._imageUploaded = false;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return; // Aufrufer fällt auf CSS-Fallback zurück
    this.gl = gl;

    const built = createScrubProgram(gl);
    if (!built) return;
    this.uniforms = built.uniforms;

    this.texture = createTexture(gl);
    this.holdTexture = createTexture(gl);

    this._resize = this._resize.bind(this);
    this._resize();
    this._resizeObserver = new ResizeObserver(this._resize);
    this._resizeObserver.observe(canvas);

    this.ok = true;
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  get isVideo() {
    return this.source?.tagName === 'VIDEO';
  }

  /** Quelle austauschen (Modes-Preview-Feed) — Bild wird beim nächsten
   *  Frame neu hochgeladen, der Frame-Hold behält bewusst das alte Bild:
   *  so blitzt beim Kanalwechsel-Burst noch der vorherige Feed durch. */
  setSource(source) {
    if (source === this.source) return;
    if (this.ok && isSourceReady(this.source)) {
      uploadSource(this.gl, this.holdTexture, this.source);
      this._holdReady = true;
    }
    this.source = source;
    this._imageUploaded = false;
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      if (this.gl) this.gl.viewport(0, 0, w, h);
    }
  }

  _loop(tMs) {
    if (this.destroyed) return;
    const gl = this.gl;
    const t = tMs * 0.001;
    this._frame += 1;

    if (isSourceReady(this.source)) {
      gl.activeTexture(gl.TEXTURE0);
      if (this.isVideo || !this._imageUploaded) {
        uploadSource(gl, this.texture, this.source);
        this._imageUploaded = true;
      }
      // Hold-Textur nur für Video (ein Standbild hätte keinen "vorherigen"
      // Frame) und nur alle HOLD_INTERVAL Frames nachziehen.
      if (this.isVideo && this._frame % HOLD_INTERVAL === 0) {
        gl.activeTexture(gl.TEXTURE1);
        uploadSource(gl, this.holdTexture, this.source);
        this._holdReady = true;
      }
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.holdTexture);

    const u = this.uniforms;
    const [sx, sy] = coverScale(this.source, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uUvScale, sx, sy);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uVelocity, this.getVelocity());
    gl.uniform1f(u.uBaseGrain, this.baseGrain);
    gl.uniform1f(u.uHoldMix, this._holdReady ? 1 : 0);
    gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this._raf = requestAnimationFrame(this._loop);
  }

  /** Stoppt die rAF-Loop (Textur-Upload + Draw), z. B. wenn außerhalb des
   * Viewports — Performance-Budget aus CONCEPT.md §8: kein Shader rendert
   * ungesehen weiter. */
  pause() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  resume() {
    if (!this.ok || this.destroyed || this._raf) return;
    this._raf = requestAnimationFrame(this._loop);
  }

  destroy() {
    this.destroyed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }
}
