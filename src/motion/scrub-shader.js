// Wiederverwendbarer WebGL-Shader aus dem Spike (prototyp/prototype-scrub.html),
// jetzt generalisiert: nimmt jede Video- ODER Bildquelle, rendert sie mit
// Chromatic Aberration / Grain / Tracking-Bars, deren Stärke von einer
// außen übergebenen Velocity-Funktion kommt (CONCEPT.md §4.1).
//
// Zwei gelöste Bugs aus dem Prototyp sind hier bereits eingebaut:
// UNPACK_FLIP_Y_WEBGL (sonst kopfüber) und zeitbasierte statt framebasierte
// Zeitkonstanten (rAF wird bei unsichtbaren Tabs gedrosselt).

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
  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uVelocity;
  uniform vec2 uResolution;
  uniform float uBaseGrain;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;

    float trackStrength = smoothstep(0.15, 1.0, uVelocity);
    float rowSeed = floor(uv.y * 90.0 + uTime * 2.0);
    float rowNoise = hash(vec2(rowSeed, floor(uTime * 6.0)));
    float displace = (rowNoise - 0.5) * 0.06 * trackStrength * step(0.92, rowNoise);
    uv.x += displace;

    float caAmount = mix(0.0012, 0.014, uVelocity);
    vec2 dir = normalize(uv - 0.5 + 0.0001);
    float r = texture2D(uTex, uv - dir * caAmount).r;
    float g = texture2D(uTex, uv).g;
    float b = texture2D(uTex, uv + dir * caAmount).b;
    vec3 color = vec3(r, g, b);

    float grainAmt = mix(uBaseGrain, 0.35, uVelocity);
    float grain = (hash(uv * uResolution.xy + uTime * 60.0) - 0.5) * grainAmt;
    color += grain;

    float vig = smoothstep(0.9, 0.35, length(uv - 0.5));
    color *= mix(0.55, 1.0, vig);

    gl_FragColor = vec4(color, 1.0);
  }
`;

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

export class ScrubShader {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLVideoElement|HTMLImageElement} source
   * @param {() => number} getVelocity — liefert 0..1
   * @param {{ baseGrain?: number }} [options]
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

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return; // Aufrufer fällt auf CSS-Fallback zurück

    this.gl = gl;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[scrub-shader]', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);
    this.program = program;

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    this.uTime = gl.getUniformLocation(program, 'uTime');
    this.uVelocity = gl.getUniformLocation(program, 'uVelocity');
    this.uResolution = gl.getUniformLocation(program, 'uResolution');
    this.uBaseGrain = gl.getUniformLocation(program, 'uBaseGrain');
    this.uTex = gl.getUniformLocation(program, 'uTex');

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.isVideo = source.tagName === 'VIDEO';
    this._imageUploaded = false;

    this._resize = this._resize.bind(this);
    this._resize();
    this._resizeObserver = new ResizeObserver(this._resize);
    this._resizeObserver.observe(canvas);

    this.ok = true;
    this._lastT = null;
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
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
    this._lastT = t;

    const ready = this.isVideo ? this.source.readyState >= this.source.HAVE_CURRENT_DATA : this._imageComplete();

    if (ready) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      if (this.isVideo || !this._imageUploaded) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.source);
        this._imageUploaded = true;
      }
    }

    gl.uniform1f(this.uTime, t);
    gl.uniform1f(this.uVelocity, this.getVelocity());
    gl.uniform1f(this.uBaseGrain, this.baseGrain);
    gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1i(this.uTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this._raf = requestAnimationFrame(this._loop);
  }

  _imageComplete() {
    return this.source.complete && this.source.naturalWidth > 0;
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
