import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { SigilId } from '../content';

/* ─────────────────────────────────────────────────────────────────────────────
 *  Plates
 *
 *  One small live scene per character. They all share a single WebGL renderer
 *  that draws off screen; each visible card copies its frame into its own 2D
 *  canvas. Only cards on screen are drawn, and the renderer goes away when the
 *  last card does.
 *
 *  Shader colours are sRGB triples straight from the theme's CSS variables, and
 *  the shaders write them out as-is. Lit standard materials (the shield, the
 *  blades) go through three's colour management as usual.
 * ──────────────────────────────────────────────────────────────────────────── */

type V3 = THREE.Vector3;

export interface Palette {
  accent: V3;
  ink: V3;
  bg: V3;
  dark: boolean;
}

interface Kit {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  // px is the card's short side in device pixels (what Dots.scale wants with the
  // camera's built fov). Returns the beat: 0 at rest, easing up to 1 at the
  // plate's big moment, so the text beside the card can move with it.
  update(t: number, dt: number, px: number): number | void;
}

type Build = (p: Palette, env: () => THREE.Texture) => Kit;

/* ── colour ────────────────────────────────────────────────────────────────── */

let probe: CanvasRenderingContext2D | null = null;
const cssColor = (raw: string, fallback: string): V3 => {
  probe ??= document.createElement('canvas').getContext('2d');
  const out = new THREE.Vector3();
  if (!probe) return out;
  probe.fillStyle = fallback;
  probe.fillStyle = raw.trim() || fallback;
  const s = String(probe.fillStyle);
  if (s.startsWith('#')) {
    const n = parseInt(s.slice(1), 16);
    return out.set(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }
  const m = s.match(/[\d.]+/g);
  return m ? out.set(+m[0] / 255, +m[1] / 255, +m[2] / 255) : out;
};

const readPalette = (el: HTMLElement): Palette => {
  const cs = getComputedStyle(el);
  const bg = cssColor(cs.getPropertyValue('--bg'), '#0b0a09');
  return {
    accent: cssColor(cs.getPropertyValue('--accent'), '#ff5b1f'),
    ink: cssColor(cs.getPropertyValue('--ink'), '#efe9e0'),
    bg,
    dark: bg.x * 0.3 + bg.y * 0.59 + bg.z * 0.11 < 0.4,
  };
};

const v3 = (r: number, g: number, b: number) => new THREE.Vector3(r, g, b);
const mixV = (a: V3, b: V3, t: number) => a.clone().lerp(b, t);
const toColor = (v: V3) => new THREE.Color().setRGB(v.x, v.y, v.z, THREE.SRGBColorSpace);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
// a bump for the beat: eases up over [a, b], holds, eases down over [c, d]
const bump = (x: number, a: number, b: number, c: number, d: number) => smooth(a, b, x) * (1 - smooth(c, d, x));

/* ── glsl ──────────────────────────────────────────────────────────────────── */

const NOISE = /* glsl */ `
vec4 pmt(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = pmt(pmt(pmt(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec3 ns = 0.142857142857 * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 nr = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= nr.x; p1 *= nr.y; p2 *= nr.z; p3 *= nr.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * snoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

// world-space position and normal; works for plain and instanced meshes
const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
void main(){
  vUv = uv;
#ifdef USE_INSTANCING
  mat4 m = modelMatrix * instanceMatrix;
#else
  mat4 m = modelMatrix;
#endif
  vec4 w = m * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(m) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const shader = (uniforms: Record<string, unknown>, frag: string, extra: Partial<THREE.ShaderMaterialParameters> = {}) =>
  new THREE.ShaderMaterial({
    uniforms: Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: v }])),
    vertexShader: VERT,
    fragmentShader: frag,
    ...extra,
  });

// a full-frame backdrop at the far plane, so anything in the scene draws over it.
// vUv is the screen position as the square card would have it: 0..1 across the
// square view, past 0 or 1 in the extra room a tall or wide card adds (fit()
// widens the fov and shifts the lens, and both are read back out of the
// projection matrix here). So gradients stay round and sit where they did.
// vScr is the raw 0..1 position on the actual card.
const backdrop = (uniforms: Record<string, unknown>, frag: string) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: v }])),
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec2 vScr;
        void main(){
          float asp = projectionMatrix[1][1] / projectionMatrix[0][0];
          vec2 ndc = position.xy;
          vUv = 0.5 + 0.5 * vec2(ndc.x * max(asp, 1.0), (ndc.y + projectionMatrix[2][1]) * max(1.0 / asp, 1.0));
          vScr = uv;
          gl_Position = vec4(position.xy, 0.99995, 1.0);
        }`,
      fragmentShader: frag,
      depthWrite: false,
      transparent: true,
    })
  );
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
};

// where a world point lands, in the backdrop's square-card coordinates (see backdrop)
const screenXY = (camera: THREE.PerspectiveCamera, p: V3) => {
  const v = p.clone().project(camera);
  const e = camera.projectionMatrix.elements;
  const asp = e[5] / e[0];
  return new THREE.Vector2(0.5 + 0.5 * v.x * Math.max(asp, 1), 0.5 + 0.5 * (v.y + e[9]) * Math.max(1 / asp, 1));
};
const screenY = (camera: THREE.PerspectiveCamera, p: V3) => screenXY(camera, p).y;

/* ── soft dots ─────────────────────────────────────────────────────────────── */

class Dots {
  readonly points: THREE.Points;
  readonly pos: Float32Array;
  readonly size: Float32Array;
  readonly alpha: Float32Array;
  private readonly mat: THREE.ShaderMaterial;

  constructor(readonly n: number, color: V3, additive: boolean, soft = 0.1) {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color }, uScale: { value: 600 }, uSoft: { value: soft } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        uniform float uScale;
        varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
          vA = aAlpha;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uSoft;
        varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, uSoft, d) * vA;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
  }

  scale(px: number, fov = 34) {
    this.mat.uniforms.uScale.value = px / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
  }

  flush() {
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    (g.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }
}

// a pool of short-lived particles on top of Dots
class Spray {
  readonly dots: Dots;
  private vel: Float32Array;
  private life: Float32Array;
  private age: Float32Array;
  private base: Float32Array;
  private next = 0;

  constructor(n: number, color: V3, additive: boolean, private gravity = -5, private drag = 0.6) {
    this.dots = new Dots(n, color, additive);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.age = new Float32Array(n).fill(1e9);
    this.base = new Float32Array(n);
  }

  emit(p: V3, v: V3, size: number, life: number) {
    const i = this.next;
    this.next = (this.next + 1) % this.dots.n;
    this.dots.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.base[i] = size;
    this.life[i] = life;
    this.age[i] = 0;
  }

  step(dt: number, alpha = 0.7, grow = 0) {
    const { pos, size, alpha: a } = this.dots;
    const k = Math.exp(-this.drag * dt);
    for (let i = 0; i < this.dots.n; i++) {
      const age = (this.age[i] += dt);
      if (age > this.life[i]) {
        a[i] = 0;
        continue;
      }
      const j = i * 3;
      this.vel[j] *= k;
      this.vel[j + 2] *= k;
      this.vel[j + 1] = this.vel[j + 1] * k + this.gravity * dt;
      pos[j] += this.vel[j] * dt;
      pos[j + 1] += this.vel[j + 1] * dt;
      pos[j + 2] += this.vel[j + 2] * dt;
      const u = age / this.life[i];
      a[i] = alpha * Math.min(1, u * 8) * (1 - u) * (1 - u);
      size[i] = this.base[i] * (1 + grow * u);
    }
    this.dots.flush();
  }
}

/* ── paul: the sandworm ────────────────────────────────────────────────────── */

const paul: Build = (p) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  camera.position.set(0, 2.1, 15);
  camera.lookAt(0, 2.5, 0);

  const sunDir = v3(0.3, 0.16, -1).normalize();
  const sunAt = v3(5.5, 2.6, -60);
  const sky = backdrop(
    { uBg: p.bg, uAccent: p.accent, uHor: 0.4, uSun: new THREE.Vector2(0.6, 0.5) },
    /* glsl */ `
    uniform vec3 uBg, uAccent; uniform float uHor; uniform vec2 uSun;
    varying vec2 vUv;
    void main(){
      float h = vUv.y - uHor;
      vec3 col = mix(uBg, uBg * 0.6 + uAccent * 0.42, exp(-max(h, 0.0) * 7.0));
      float d = length((vUv - uSun) * vec2(1.0, 1.0));
      col += uAccent * exp(-d * 9.0) * 0.45;
      col = mix(col, mix(uAccent, vec3(1.0, 0.9, 0.78), 0.55), smoothstep(0.052, 0.046, d));
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  // dunes
  // they run in close to the camera, for the tall card's lower view
  const duneGeo = new THREE.PlaneGeometry(90, 52, 110, 64).rotateX(-Math.PI / 2).translate(0, 0, -11);
  const duneMat = new THREE.ShaderMaterial({
    uniforms: {
      uBg: { value: p.bg },
      uAccent: { value: p.accent },
      uSun: { value: sunDir },
      uCam: { value: camera.position },
    },
    vertexShader: /* glsl */ `
      ${NOISE}
      varying vec3 vW; varying vec3 vN; varying float vH;
      float dune(vec2 g){
        float n = snoise(vec3(g * vec2(0.05, 0.08), 3.1));
        float r = 1.0 - abs(sin(g.x * 0.2 + g.y * 0.06 + n * 2.3));
        return r * r * 0.85 + n * 0.45 + snoise(vec3(g * 0.3, 7.0)) * 0.05;
      }
      void main(){
        vec3 pos = position;
        vec2 g = pos.xz;
        float h = dune(g);
        float e = 0.2;
        vN = normalize(vec3(h - dune(g + vec2(e, 0.0)), e, h - dune(g + vec2(0.0, e))));
        pos.y += h; vH = h;
        vec4 w = modelMatrix * vec4(pos, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBg, uAccent, uSun, uCam;
      varying vec3 vW; varying vec3 vN; varying float vH;
      void main(){
        vec3 N = normalize(vN);
        vec3 V = normalize(uCam - vW);
        float lit = max(dot(N, uSun), 0.0);
        float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = uBg * 1.5 + vec3(0.012, 0.009, 0.006);
        col += uAccent * (rim * 0.5 * (0.25 + lit) + lit * lit * 0.16);
        float c = abs(fract(vH * 3.0) - 0.5);
        col += uAccent * smoothstep(0.035, 0.0, c) * 0.05;
        float d = length(vW - uCam);
        col = mix(col, uBg * 0.6 + uAccent * 0.42, smoothstep(16.0, 46.0, d) * 0.9);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(duneGeo, duneMat));

  // the worm: ringed plates along an arc that it swims through
  const wormMat = shader(
    { uBg: p.bg, uAccent: p.accent, uSun: sunDir, uCam: camera.position },
    /* glsl */ `
    uniform vec3 uBg, uAccent, uSun, uCam;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      vec3 N = normalize(vN);
      if (!gl_FrontFacing) N = -N;
      vec3 V = normalize(uCam - vW);
      float rim = pow(1.0 - abs(dot(N, V)), 2.4);
      float lit = max(dot(N, uSun), 0.0);
      float groove = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
      vec3 col = uBg * (0.8 + groove * 0.9) + uAccent * 0.035 * groove;
      col += uAccent * rim * (0.35 + lit * 1.6) * (0.5 + 0.5 * groove);
      col += uAccent * max(N.y, 0.0) * 0.04;
      gl_FragColor = vec4(col, 1.0);
    }`,
    { side: THREE.DoubleSide }
  );

  const ring = [
    [0.9, -0.5],
    [0.97, -0.3],
    [1.02, -0.05],
    [1.07, 0.25],
    [1.07, 0.42],
    [0.95, 0.5],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const N = 44;
  const dA = 0.06;
  // it swims an upright ellipse, so it breaches and dives inside the frame
  const RX = 4.6;
  const RY = 6.6;
  const C = v3(0, -2.1, 0);
  const segs = new THREE.InstancedMesh(new THREE.LatheGeometry(ring, 30), wormMat, N);
  segs.frustumCulled = false;

  const worm = new THREE.Group();
  worm.position.set(0.3, 0, -2.5);
  worm.rotation.y = -0.42;
  worm.add(segs);
  scene.add(worm);

  // the head: a flared lip, a glowing throat and three rings of teeth
  const head = new THREE.Group();
  const lip = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0.86, -0.3],
        [1.04, -0.1],
        [1.2, 0.12],
        [1.36, 0.32],
        [1.3, 0.4],
        [1.05, 0.26],
        [0.86, 0.02],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      34
    ),
    wormMat
  );
  head.add(lip);
  const maw = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 40).rotateX(-Math.PI / 2).translate(0, -0.25, 0),
    shader(
      { uAccent: p.accent },
      /* glsl */ `
      uniform vec3 uAccent; varying vec2 vUv;
      void main(){
        float d = length(vUv - 0.5) * 2.0;
        vec3 col = mix(vec3(1.0, 0.86, 0.7), uAccent, smoothstep(0.0, 0.5, d)) * (1.0 - smoothstep(0.2, 1.0, d));
        gl_FragColor = vec4(col, 1.0);
      }`,
      { side: THREE.DoubleSide }
    )
  );
  head.add(maw);
  const toothRings: THREE.InstancedMesh[] = [];
  const toothMat = new THREE.MeshBasicMaterial({ color: toColor(mixV(p.accent, v3(1, 0.92, 0.82), 0.6)) });
  const dummy = new THREE.Object3D();
  const Y = v3(0, 1, 0);
  [26, 22, 18].forEach((count, k) => {
    const tm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.38 - k * 0.06, 5), toothMat, count);
    const rr = 1.02 - k * 0.2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const radial = v3(Math.cos(a), 0, Math.sin(a));
      dummy.position.copy(radial).multiplyScalar(rr).setY(0.22 - k * 0.2);
      dummy.quaternion.setFromUnitVectors(Y, radial.clone().multiplyScalar(-0.85).add(v3(0, 0.5, 0)).normalize());
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      tm.setMatrixAt(i, dummy.matrix);
    }
    head.add(tm);
    toothRings.push(tm);
  });
  worm.add(head);

  const sand = new Spray(620, mixV(p.accent, v3(1, 0.86, 0.7), 0.45).multiplyScalar(0.8), false, -6.5, 0.9);
  const puffs = new Spray(90, mixV(p.bg, p.accent, 0.4).add(v3(0.05, 0.035, 0.02)), false, -1.2, 1.4);
  worm.add(sand.dots.points, puffs.dots.points);
  const dust = new Dots(140, p.accent.clone().multiplyScalar(0.7), true);
  for (let i = 0; i < dust.n; i++) {
    dust.pos.set([rand(-14, 14), rand(0.2, 7), rand(-20, 6)], i * 3);
    dust.size[i] = rand(0.02, 0.06);
    dust.alpha[i] = rand(0.1, 0.5);
  }
  dust.flush();
  scene.add(dust.points);

  const radius = (s: number) => (1.02 + 0.13 * smooth(0, 0.18, s)) * (1 - 0.66 * Math.pow(s, 1.7));
  const crossings = [Math.asin((0.6 - C.y) / RY), Math.PI - Math.asin((0.6 - C.y) / RY)];
  const start = Math.PI + 0.75;
  const travel = start + 0.75 + N * dA;
  const speed = 0.82;
  const period = travel / speed + 2.2;
  // the head breaks the sand, then tops out
  const tBreach = (start - crossings[1]) / speed;
  const tTop = (start - Math.PI / 2) / speed;
  const P = v3(0, 0, 0);
  const T = v3(0, 0, 0);

  return {
    scene,
    camera,
    update(t, dt, px) {
      sky.material.uniforms.uHor.value = screenY(camera, v3(0, 0.5, -60));
      sky.material.uniforms.uSun.value = screenXY(camera, sunAt);
      sand.dots.scale(px);
      puffs.dots.scale(px);
      dust.scale(px);

      const c = t % period;
      const aHead = start - c * speed;
      for (let k = 0; k < N; k++) {
        const a = aHead + (k + 0.7) * dA;
        P.set(C.x + RX * Math.cos(a), C.y + RY * Math.sin(a), 0);
        T.set(-RX * Math.sin(a), RY * Math.cos(a), 0);
        const step = T.length() * dA;
        const r = radius(k / (N - 1));
        dummy.position.copy(P);
        dummy.quaternion.setFromUnitVectors(Y, T.normalize());
        dummy.scale.set(r, step * 1.22, r);
        dummy.updateMatrix();
        segs.setMatrixAt(k, dummy.matrix);
      }
      segs.instanceMatrix.needsUpdate = true;
      head.position.set(C.x + RX * Math.cos(aHead), C.y + RY * Math.sin(aHead), 0);
      head.quaternion.setFromUnitVectors(Y, T.set(RX * Math.sin(aHead), -RY * Math.cos(aHead), 0).normalize());
      toothRings.forEach((tm, k) => (tm.rotation.y = t * (k % 2 ? -0.25 : 0.18)));

      // sand bursts where the body breaks the surface, and pours off its back
      const aTail = aHead + N * dA;
      for (const ac of crossings) {
        if (aHead < ac + 0.25 && aTail > ac - 0.1) {
          for (let i = 0; i < 9; i++) {
            const along = rand(-1.3, 1.3);
            P.set(C.x + RX * Math.cos(ac) + along * 0.3, rand(0.9, 1.4), rand(-1.2, 1.2));
            sand.emit(P, v3(rand(-1.6, 1.6), rand(2.5, 6.5), rand(-1.4, 1.4)), rand(0.14, 0.4), rand(0.8, 1.7));
          }
          if (Math.random() < 0.6) {
            P.set(C.x + RX * Math.cos(ac) + rand(-0.6, 0.6), rand(1, 1.6), rand(-1, 1));
            puffs.emit(P, v3(rand(-1.2, 1.2), rand(1, 2.6), rand(-0.8, 0.8)), rand(0.8, 1.5), rand(1.6, 2.6));
          }
        }
      }
      for (let i = 0; i < 4; i++) {
        const k = Math.floor(rand(0, N * 0.8));
        const a = aHead + (k + 0.7) * dA;
        const y = C.y + RY * Math.sin(a);
        if (y < 1.2) continue;
        const r = radius(k / (N - 1));
        P.set(C.x + RX * Math.cos(a), y + r * 0.7, rand(-r, r) * 0.8);
        sand.emit(P, v3(rand(-0.3, 0.3), rand(-0.5, 0.4), rand(-0.3, 0.3)), rand(0.03, 0.08), rand(0.9, 1.6));
      }
      sand.step(dt, 0.8);
      puffs.step(dt, 0.4, 1.6);

      for (let i = 0; i < dust.n; i++) {
        dust.pos[i * 3] += dt * 0.35;
        if (dust.pos[i * 3] > 14) dust.pos[i * 3] = -14;
      }
      dust.flush();
      return bump(c, tBreach - 0.35, tBreach + 0.25, tTop, tTop + 0.7);
    },
  };
};

/* ── anakin: the duel ──────────────────────────────────────────────────────── */

const anakin: Build = (p, env) => {
  const scene = new THREE.Scene();
  scene.environment = env();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.1, 10.5);
  camera.lookAt(0, 0.1, 0);

  const blue = v3(0.32, 0.62, 1.0);
  const red = v3(1.0, 0.13, 0.07);

  const sky = backdrop(
    { uBg: p.bg, uAccent: p.accent, uGlow: v3(1, 0.2, 0.1), uK: 0, uAt: new THREE.Vector2(0.5, 0.5) },
    /* glsl */ `
    uniform vec3 uBg, uAccent, uGlow; uniform float uK; uniform vec2 uAt;
    varying vec2 vUv;
    void main(){
      float hor = 0.17;
      vec3 col = uBg;
      float h = vUv.y - hor;
      col = mix(col, uBg * 0.7 + uAccent * 0.22, exp(-max(h, 0.0) * 6.0) * 0.9);
      // two suns going down over the dunes
      vec2 s1 = vec2(0.2, hor + 0.035), s2 = vec2(0.33, hor + 0.012);
      float d1 = length(vUv - s1), d2 = length(vUv - s2);
      vec3 sun = mix(uAccent, vec3(1.0, 0.9, 0.75), 0.6);
      col += uAccent * (exp(-d1 * 14.0) * 0.35 + exp(-d2 * 18.0) * 0.25);
      col = mix(col, sun, smoothstep(0.048, 0.043, d1) * step(hor, vUv.y));
      col = mix(col, sun * 0.92, smoothstep(0.03, 0.026, d2) * step(hor, vUv.y));
      float g = smoothstep(hor + 0.002, hor - 0.002, vUv.y);
      col = mix(col, uBg * 0.75 + uAccent * 0.04 * (vUv.y / hor), g);
      // the blade's light on the air
      col += uGlow * exp(-length(vUv - uAt) * 4.0) * 0.16 * uK;
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  // the hand moves the rig; the saber turns about the grip
  const rig = new THREE.Group();
  const saber = new THREE.Group();
  rig.add(saber);
  scene.add(rig);

  const metal = new THREE.MeshStandardMaterial({ color: toColor(v3(0.72, 0.72, 0.74)), metalness: 1, roughness: 0.3 });
  const grip = new THREE.MeshStandardMaterial({ color: toColor(v3(0.06, 0.06, 0.07)), metalness: 0.2, roughness: 0.7 });
  const prof = (pts: number[][]) => pts.map(([r, y]) => new THREE.Vector2(r, y));
  const hiltY = -0.85;
  const shroud = new THREE.Mesh(
    new THREE.LatheGeometry(
      prof([
        [0.0, 0.0],
        [0.12, 0.0],
        [0.135, 0.06],
        [0.125, 0.12],
        [0.125, 0.5],
        [0.14, 0.52],
        [0.14, 0.58],
        [0.125, 0.6],
        [0.125, 1.08],
        [0.15, 1.12],
        [0.165, 1.3],
        [0.15, 1.38],
        [0.1, 1.4],
        [0.06, 1.42],
      ]),
      40
    ),
    metal
  );
  shroud.position.y = hiltY;
  const ribs = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.018, 8, 32).rotateX(Math.PI / 2), grip);
    rib.position.y = hiltY + 0.18 + i * 0.045;
    ribs.add(rib);
  }
  const switchBox = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.05), grip);
  switchBox.position.set(0, hiltY + 0.82, 0.13);
  saber.add(shroud, ribs, switchBox);

  // blade: a hot core inside glow shells
  const L = 2.9;
  const bladeRoot = hiltY + 1.4;
  const blade = new THREE.Group();
  blade.position.y = bladeRoot;
  const core = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.03, L, 6, 12).translate(0, L / 2, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  blade.add(core);
  const glowMats: THREE.ShaderMaterial[] = [];
  [
    [0.06, 2.2, 1.0],
    [0.12, 1.6, 0.55],
    [0.22, 1.3, 0.3],
    [0.4, 1.1, 0.16],
  ].forEach(([r, pw, k]) => {
    const m = shader(
      { uCol: blue.clone(), uPow: pw, uI: k, uCam: camera.position },
      /* glsl */ `
      uniform vec3 uCol, uCam; uniform float uPow, uI;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 V = normalize(uCam - vW);
        float f = abs(dot(normalize(vN), V));
        float a = pow(f, uPow) * uI;
        a *= smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
        gl_FragColor = vec4(uCol, a);
      }`,
      { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }
    );
    glowMats.push(m);
    blade.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L + r, 24, 1, true).translate(0, (L + r) / 2 - r * 0.3, 0), m));
  });
  saber.add(blade);

  const light = new THREE.PointLight(0xffffff, 6, 7, 1.4);
  light.position.set(0, bladeRoot + 1.2, 0.2);
  saber.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  // the light the blade leaves on the air as it cuts
  const TN = 12;
  const trailPos = new Float32Array(TN * 6);
  const trailAge = new Float32Array(TN * 2);
  const trailSide = new Float32Array(TN * 2);
  const trailIdx: number[] = [];
  for (let i = 0; i < TN; i++) {
    trailAge[i * 2] = trailAge[i * 2 + 1] = i / (TN - 1);
    trailSide[i * 2 + 1] = 1;
    if (i < TN - 1) trailIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute('aAge', new THREE.BufferAttribute(trailAge, 1));
  trailGeo.setAttribute('aSide', new THREE.BufferAttribute(trailSide, 1));
  trailGeo.setIndex(trailIdx);
  const trailMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: blue.clone() } },
    vertexShader: /* glsl */ `
      attribute float aAge; attribute float aSide;
      varying float vAge; varying float vSide;
      void main(){ vAge = aAge; vSide = aSide; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol;
      varying float vAge; varying float vSide;
      void main(){
        float a = pow(1.0 - vAge, 2.0) * vSide * vSide;
        gl_FragColor = vec4(mix(uCol, vec3(1.0), 0.35 * (1.0 - vAge) * vSide), a * 0.5);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.frustumCulled = false;
  scene.add(trail);

  const sparks = new Spray(160, v3(1, 0.55, 0.3), true, -4, 0.4);
  scene.add(sparks.dots.points);

  // the form: guard, draw back, cut, cut back, turn; then the fall, and the same in red
  const TAU = Math.PI * 2;
  const KEYS: [number, number, number][] = [
    [0, -0.4, 1],
    [1.5, -0.4, 1],
    [1.95, -1.15, 1],
    [2.28, 2.25, 3],
    [2.9, 2.0, 1],
    [3.22, -1.35, 3],
    [3.6, -1.2, 1],
    [4.5, -1.2 - TAU, 2],
    [5.1, -0.4 - TAU, 1],
    [6.7, -0.4 - TAU, 1],
    [7.1, 1.0 - TAU, 1],
    [7.42, -2.3 - TAU, 3],
    [8.0, -2.05 - TAU, 1],
    [8.32, 1.1 - TAU, 3],
    [8.7, 0.95 - TAU, 1],
    [9.6, 0.95, 2],
    [10.2, -0.4, 1],
    [13, -0.4, 1],
  ];
  const period = 13;
  const ease = (x: number, k: number) => (x < 0.5 ? Math.pow(2 * x, k + 1) / 2 : 1 - Math.pow(2 - 2 * x, k + 1) / 2);
  const angleAt = (c: number) => {
    for (let i = 1; i < KEYS.length; i++) {
      const [t1, a1, k] = KEYS[i];
      if (c <= t1) {
        const [t0, a0] = KEYS[i - 1];
        return a0 + (a1 - a0) * ease((c - t0) / (t1 - t0), k);
      }
    }
    return KEYS[0][1];
  };

  const col = v3(0, 0, 0);
  const A = v3(0, 0, 0);
  const B = v3(0, 0, 0);
  let primed = false;
  return {
    scene,
    camera,
    update(t, dt, px) {
      sparks.dots.scale(px, 34);
      const c = t % period;
      const a = angleAt(c);
      const ext = smooth(0.25, 0.8, c) * (1 - smooth(11.3, 11.8, c));
      const k = smooth(5.5, 6.3, c);
      const flick = c > 5.3 && c < 6.5 ? 0.72 + 0.28 * Math.sin(c * 61) * Math.sin(c * 23) : 0.96 + 0.04 * Math.sin(t * 47);
      col.copy(blue).lerp(red, k);
      const on = ext * flick;
      blade.scale.set(1, Math.max(ext, 0.001), 1);
      blade.visible = ext > 0.01;
      glowMats.forEach((m) => (m.uniforms.uCol.value as V3).copy(col).multiplyScalar(on));
      (core.material as THREE.MeshBasicMaterial).color.copy(toColor(mixV(v3(1, 1, 1), col, 0.18)));
      light.color.copy(toColor(col));
      light.intensity = 7 * on;

      saber.rotation.z = a;
      rig.position.set(0.1 - 0.25 * Math.sin(a), -0.75 + 0.25 * Math.cos(a), 0);
      rig.rotation.set(0.22, 0.3 * Math.sin(t * 0.5), 0);
      rig.updateMatrixWorld(true);

      A.set(0, bladeRoot + L * ext * 0.45, 0);
      B.set(0, bladeRoot + L * ext * 1.02, 0);
      saber.localToWorld(A);
      saber.localToWorld(B);
      if (!primed) {
        for (let i = 0; i < TN; i++) trailPos.set([A.x, A.y, A.z, B.x, B.y, B.z], i * 6);
        primed = true;
      }
      trailPos.copyWithin(6, 0, (TN - 1) * 6);
      trailPos.set([A.x, A.y, A.z, B.x, B.y, B.z], 0);
      trailGeo.attributes.position.needsUpdate = true;
      (trailMat.uniforms.uCol.value as V3).copy(col).multiplyScalar(on);

      sky.material.uniforms.uGlow.value = col;
      sky.material.uniforms.uK.value = on;
      sky.material.uniforms.uAt.value = screenXY(camera, A.clone().lerp(B, 0.5));

      if (c > 5.3 && c < 6.6 && Math.random() < 0.6) {
        for (let i = 0; i < 3; i++) {
          sparks.emit(A.clone().lerp(B, rand(0.1, 1)), v3(rand(-1.5, 1.5), rand(-0.5, 1.8), rand(-1, 1)), rand(0.02, 0.05), rand(0.4, 1));
        }
      }
      sparks.step(dt, 0.9);
      // the two cuts in blue, and the two in red after the fall
      return Math.max(bump(c, 1.7, 2.25, 3.25, 3.85), bump(c, 6.9, 7.4, 8.35, 9.0));
    },
  };
};

/* ── eren: wings of freedom ────────────────────────────────────────────────── */

const cssRgb = (v: V3, a = 1) => `rgba(${Math.round(v.x * 255)},${Math.round(v.y * 255)},${Math.round(v.z * 255)},${a})`;

// two raised wings, crossed at the root; flag-shaped (3:2)
const wingsTexture = (front: V3, back: V3, edge: V3) => {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 512;
  const g = c.getContext('2d')!;
  const rad = THREE.MathUtils.degToRad;
  const feather = (x: number, y: number, ang: number, len: number, w: number) => {
    const dx = Math.cos(ang);
    const dy = -Math.sin(ang);
    const nx = -dy;
    const ny = dx;
    const mx = x + dx * len * 0.5;
    const my = y + dy * len * 0.5;
    g.beginPath();
    g.moveTo(x + nx * w * 0.5, y + ny * w * 0.5);
    g.quadraticCurveTo(mx + nx * w, my + ny * w, x + dx * len, y + dy * len);
    g.quadraticCurveTo(mx - nx * w * 0.8, my - ny * w * 0.8, x - nx * w * 0.5, y - ny * w * 0.5);
    g.closePath();
    g.fill();
    g.stroke();
  };
  const wing = (rx: number, ry: number, dir: number, fill: V3) => {
    const tx = rx + dir * 190;
    const ty = ry - 250;
    const cx = rx + dir * 20;
    const cy = ry - 250;
    const arm = (t: number) => [
      (1 - t) * (1 - t) * rx + 2 * (1 - t) * t * cx + t * t * tx,
      (1 - t) * (1 - t) * ry + 2 * (1 - t) * t * cy + t * t * ty,
    ];
    g.fillStyle = cssRgb(fill);
    g.strokeStyle = cssRgb(edge);
    g.lineWidth = 5;
    g.lineJoin = 'round';
    // the long flight feathers first, so the shorter ones lie over their roots
    for (let k = 6; k >= 0; k--) {
      const [bx, by] = arm(0.28 + k * 0.118);
      const a = -12 - (6 - k) * 12;
      feather(bx, by, rad(dir > 0 ? a : 180 - a), 104 + k * 12, 24);
    }
    g.beginPath();
    g.moveTo(rx, ry);
    g.quadraticCurveTo(cx, cy, tx, ty);
    g.quadraticCurveTo(rx + dir * 70, ry - 150, rx + dir * 6, ry + 6);
    g.closePath();
    g.fill();
    g.stroke();
  };
  wing(436, 440, -1, back);
  wing(332, 440, 1, front);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
};

const eren: Build = (p) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  camera.position.set(0, 0, 11);
  camera.lookAt(0, 0.2, 0);

  const sky = backdrop(
    { uBg: p.bg, uAccent: p.accent, uHor: 0.2, uTime: 0 },
    /* glsl */ `
    ${NOISE}
    uniform vec3 uBg, uAccent; uniform float uHor, uTime;
    varying vec2 vUv;
    void main(){
      float h = vUv.y - uHor;
      vec3 col = mix(uBg, uBg * 0.55 + uAccent * 0.45, exp(-max(h, 0.0) * 4.5));
      float cl = fbm(vec3(vUv * vec2(2.2, 6.0) + vec2(uTime * 0.01, 0.0), 4.0));
      col += uAccent * smoothstep(0.1, 0.6, cl) * 0.08 * smoothstep(0.95, 0.3, vUv.y);
      col *= 0.9 + 0.2 * cl;
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  // rooftops, near and far, and the wall low on the horizon
  const roofs = (y0: number, lift: number) => {
    const sh = new THREE.Shape();
    sh.moveTo(-14, -9);
    let x = -14;
    while (x < 14) {
      const w = rand(1.1, 2.2);
      const h = y0 + rand(0, lift);
      const peak = w * 0.42;
      sh.lineTo(x, h);
      sh.lineTo(x + w / 2, h + peak);
      if (Math.random() < 0.35) {
        const at = (u: number) => h + peak * (1 - (u - 0.5) * 2);
        sh.lineTo(x + w * 0.68, at(0.68));
        sh.lineTo(x + w * 0.68, at(0.68) + 0.32);
        sh.lineTo(x + w * 0.8, at(0.68) + 0.32);
        sh.lineTo(x + w * 0.8, at(0.8));
      }
      sh.lineTo(x + w, h);
      x += w;
    }
    sh.lineTo(14, -9);
    return new THREE.ShapeGeometry(sh);
  };
  const far = new THREE.Mesh(roofs(-2.1, 0.7), new THREE.MeshBasicMaterial({ color: toColor(p.bg.clone().multiplyScalar(1.6).add(p.accent.clone().multiplyScalar(0.05))) }));
  far.position.z = -8;
  const near = new THREE.Mesh(roofs(-2.75, 0.45), new THREE.MeshBasicMaterial({ color: toColor(p.bg.clone().multiplyScalar(0.55)) }));
  near.position.z = 1.5;
  const wallBand = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 6),
    new THREE.MeshBasicMaterial({ color: toColor(p.bg.clone().multiplyScalar(1.15).add(p.accent.clone().multiplyScalar(0.1))) })
  );
  wallBand.position.set(0, -3.2, -40);
  scene.add(wallBand, far, near);

  // the flag
  const cloth = mixV(p.bg, v3(0.16, 0.26, 0.19), 0.8);
  const flagW = 4.4;
  const flagH = 2.9;
  const flagMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uEmb: { value: wingsTexture(v3(0.94, 0.92, 0.88), v3(0.3, 0.42, 0.62), cloth.clone().multiplyScalar(0.6)) },
      uCloth: { value: cloth },
      uAccent: { value: p.accent },
      uCam: { value: camera.position },
      uSize: { value: new THREE.Vector2(flagW, flagH) },
    },
    vertexShader: /* glsl */ `
      ${NOISE}
      uniform float uTime; uniform vec2 uSize;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      vec3 flag(vec2 q){
        float u = q.x, v = q.y, t = uTime;
        float amp = smoothstep(0.0, 0.3, u) * (0.35 + 0.65 * u);
        vec3 p = vec3(u * uSize.x, (v - 1.0) * uSize.y, 0.0);
        float w = sin(u * 5.5 - t * 3.2 + v * 0.8) * 0.34 + sin(u * 11.0 - t * 5.1 + v * 2.0) * 0.07;
        w += snoise(vec3(u * 1.8 - t * 0.7, v * 1.4, t * 0.25)) * 0.22;
        p.z += w * amp;
        p.y -= u * u * 0.3 - sin(u * 4.0 - t * 2.4) * 0.07 * amp;
        p.x -= abs(w) * 0.12 * amp;
        return p;
      }
      void main(){
        vUv = uv;
        vec3 p0 = flag(uv);
        vec3 pu = flag(uv + vec2(0.01, 0.0));
        vec3 pv = flag(uv + vec2(0.0, 0.01));
        vec4 w = modelMatrix * vec4(p0, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * cross(pu - p0, pv - p0));
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uEmb; uniform vec3 uCloth, uAccent, uCam;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 N = normalize(vN);
        vec3 V = normalize(uCam - vW);
        if (dot(N, V) < 0.0) N = -N;
        vec4 e = texture2D(uEmb, vUv);
        vec3 base = mix(uCloth, e.rgb, e.a);
        float key = max(dot(N, normalize(vec3(-0.35, 0.45, 0.85))), 0.0);
        float rim = pow(1.0 - abs(dot(N, V)), 2.0);
        vec3 col = base * (0.3 + 0.8 * key) + uAccent * rim * 0.3;
        col *= 1.0 - 0.25 * smoothstep(0.85, 1.0, vUv.x);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 30), flagMat);
  flag.frustumCulled = false;
  flag.position.set(-2.5, 2.45, 0);
  scene.add(flag);
  const poleMat = shader(
    { uBg: p.bg, uAccent: p.accent, uCam: camera.position },
    /* glsl */ `
    uniform vec3 uBg, uAccent, uCam;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      float rim = pow(1.0 - abs(dot(normalize(vN), normalize(uCam - vW))), 2.0);
      gl_FragColor = vec4(uBg * 1.4 + uAccent * rim * 0.55, 1.0);
    }`
  );
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 7, 10), poleMat);
  pole.position.set(-2.52, -0.9, 0);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 8), new THREE.MeshBasicMaterial({ color: toColor(mixV(p.accent, v3(1, 0.9, 0.8), 0.3)) }));
  tip.position.set(-2.52, 2.78, 0);
  scene.add(pole, tip);

  // a scout on wires, swinging across
  const scoutMat = shader(
    { uBg: p.bg, uAccent: p.accent, uCam: camera.position },
    /* glsl */ `
    uniform vec3 uBg, uAccent, uCam;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      float rim = pow(1.0 - abs(dot(normalize(vN), normalize(uCam - vW))), 1.6);
      gl_FragColor = vec4(uBg * 0.8 + uAccent * rim * 0.8, 1.0);
    }`
  );
  const scout = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 4, 8), scoutMat);
  body.position.y = 0.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), scoutMat);
  head.position.y = 0.3;
  const legs = [-0.05, 0.05].map((x) => {
    const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.24, 4, 6), scoutMat);
    l.position.set(x, -0.26, 0);
    l.rotation.z = x * 3;
    return l;
  });
  const gear = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.1), scoutMat);
  gear.position.y = -0.08;
  scout.add(body, head, gear, ...legs);
  scene.add(scout);

  // cloak: a 3x3 patch that streams behind the scout
  const cloakPos = new Float32Array(27);
  const cloakGeo = new THREE.BufferGeometry();
  cloakGeo.setAttribute('position', new THREE.BufferAttribute(cloakPos, 3).setUsage(THREE.DynamicDrawUsage));
  cloakGeo.setIndex([0, 3, 1, 1, 3, 4, 1, 4, 2, 2, 4, 5, 3, 6, 4, 4, 6, 7, 4, 7, 5, 5, 7, 8]);
  const cloak = new THREE.Mesh(cloakGeo, new THREE.MeshBasicMaterial({ color: toColor(mixV(cloth, p.accent, 0.12)), side: THREE.DoubleSide }));
  cloak.frustumCulled = false;
  scene.add(cloak);

  const wirePos = new Float32Array(12);
  const wires = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(wirePos, 3).setUsage(THREE.DynamicDrawUsage)),
    new THREE.LineBasicMaterial({ color: toColor(p.ink), transparent: true, opacity: 0.55 })
  );
  wires.frustumCulled = false;
  scene.add(wires);
  const gas = new Spray(260, v3(0.78, 0.77, 0.74), false, 0.2, 2.2);
  scene.add(gas.dots.points);

  const pass = 4.4;
  const R = 8;
  const Y = v3(0, 1, 0);
  const pos = v3(0, 0, 0);
  const vel = v3(0, 0, 0);
  const up = v3(0, 0, 0);
  const side = v3(0, 0, 0);
  const trailDir = v3(0, 0, 0);
  const anchor = v3(0, 0, 0);
  const q = v3(0, 0, 0);
  return {
    scene,
    camera,
    update(t, dt, px) {
      sky.material.uniforms.uHor.value = screenY(camera, v3(0, -2, -40));
      sky.material.uniforms.uTime.value = t;
      flagMat.uniforms.uTime.value = t;
      gas.dots.scale(px, 36);

      const n = Math.floor(t / pass);
      const u = (t % pass) / 3.3;
      const s = n % 2 ? 1 : -1;
      const front = n % 3 !== 2;
      const live = u <= 1;
      scout.visible = cloak.visible = wires.visible = live;
      if (live) {
        anchor.set(s * 0.4, 7.4, front ? 2.4 : -3.4);
        const phi = -s * 1.12 * Math.cos(Math.PI * u);
        const dphi = (s * 1.12 * Math.PI * Math.sin(Math.PI * u)) / 3.3;
        pos.set(anchor.x + R * Math.sin(phi), anchor.y - R * Math.cos(phi), anchor.z);
        vel.set(Math.cos(phi), Math.sin(phi), 0).multiplyScalar(R * dphi);
        up.copy(anchor).sub(pos).normalize();
        scout.position.copy(pos);
        scout.quaternion.setFromUnitVectors(Y, up);
        scout.rotateZ(-s * 0.35);
        const sc = front ? 1 : 0.8;
        scout.scale.setScalar(sc);

        side.set(up.y, -up.x, 0).normalize();
        trailDir.copy(vel).multiplyScalar(-0.12).add(v3(0, -1, 0)).normalize();
        for (let j = 0; j < 3; j++) {
          for (let i = 0; i < 3; i++) {
            q.copy(pos)
              .addScaledVector(up, 0.24 * sc)
              .addScaledVector(side, (i - 1) * 0.1 * (1 + j * 0.5) * sc)
              .addScaledVector(trailDir, j * 0.2 * sc);
            q.z += -0.04 * j + Math.sin(t * 19 + j * 2 + i) * 0.04 * j;
            q.addScaledVector(side, Math.sin(t * 23 + j * 1.7) * 0.03 * j);
            cloakPos.set([q.x, q.y, q.z], (j * 3 + i) * 3);
          }
        }
        cloakGeo.attributes.position.needsUpdate = true;

        wirePos.set([pos.x, pos.y, pos.z, anchor.x - 0.3, anchor.y, anchor.z, pos.x, pos.y, pos.z, anchor.x + 0.3, anchor.y, anchor.z]);
        wires.geometry.attributes.position.needsUpdate = true;

        for (let i = 0; i < 3; i++) {
          gas.emit(
            pos.clone().addScaledVector(up, -0.05),
            vel.clone().multiplyScalar(-0.08).add(v3(rand(-0.3, 0.3), rand(-0.2, 0.3), rand(-0.3, 0.3))),
            rand(0.12, 0.3) * sc,
            rand(0.8, 1.6)
          );
        }
      }
      gas.step(dt, 0.32, 3);
      // the bottom of each ODM swing, where the scout is fastest; the far passes count for less
      return live ? bump(u, 0.27, 0.48, 0.52, 0.73) * (front ? 1 : 0.55) : 0;
    },
  };
};

/* ── sukuna: the shrine ────────────────────────────────────────────────────── */

const sukuna: Build = (p) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  const camAt = v3(0, 1.7, 12);
  camera.position.copy(camAt);
  camera.lookAt(0, 2.1, 0);
  const look = camera.quaternion.clone();

  const blood = mixV(p.accent, v3(0.75, 0.04, 0.05), 0.65);
  const sky = backdrop(
    { uBg: p.bg, uBlood: blood, uHor: 0.3, uFlash: 0 },
    /* glsl */ `
    ${NOISE}
    uniform vec3 uBg, uBlood; uniform float uHor, uFlash;
    varying vec2 vUv;
    void main(){
      float h = vUv.y - uHor;
      vec3 col = mix(uBg * 0.7, uBg * 0.4 + uBlood * 0.5, exp(-max(h, 0.0) * 3.0));
      float d = length((vUv - vec2(0.5, uHor + 0.05)) * vec2(1.0, 1.15));
      col += uBlood * smoothstep(0.006, 0.0, abs(d - 0.36)) * 0.25;
      col += uBlood * exp(-d * 5.0) * 0.12;
      col *= 0.85 + 0.3 * fbm(vec3(vUv * 3.0, 2.0));
      col += uBlood * uFlash * 0.2;
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  // the shrine, with its mouth open
  const shrineMat = shader(
    { uBg: p.bg, uBlood: blood, uCam: camera.position },
    /* glsl */ `
    uniform vec3 uBg, uBlood, uCam;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      vec3 N = normalize(vN);
      if (!gl_FrontFacing) N = -N;
      float rim = pow(1.0 - abs(dot(N, normalize(uCam - vW))), 2.2);
      float under = max(-N.y, 0.0);
      vec3 col = uBg * 0.7 + uBlood * (rim * 0.55 + under * 0.35);
      gl_FragColor = vec4(col, 1.0);
    }`,
    { side: THREE.DoubleSide }
  );
  const shrine = new THREE.Group();
  const box = (w: number, h: number, d: number, x: number, y: number, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shrineMat);
    m.position.set(x, y, z);
    shrine.add(m);
  };
  box(6.6, 0.5, 2.8, 0, 0.25);
  box(5.6, 0.25, 2.4, 0, 0.62);
  [-2.4, -0.98, 0.98, 2.4].forEach((x) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 2.2, 10), shrineMat);
    col.position.set(x, 1.85, 0.6);
    shrine.add(col);
  });
  box(5.2, 2.1, 0.2, 0, 1.85, -0.6);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-4.1, 0.5);
  roofShape.quadraticCurveTo(-3.3, -0.05, -2.3, 0);
  roofShape.lineTo(2.3, 0);
  roofShape.quadraticCurveTo(3.3, -0.05, 4.1, 0.5);
  roofShape.lineTo(2.5, 1.0);
  roofShape.lineTo(-2.5, 1.0);
  roofShape.closePath();
  const roof = (s: number, y: number) => {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 3.2 * s, bevelEnabled: false }).translate(0, 0, -1.6 * s), shrineMat);
    m.scale.set(s, s, 1);
    m.position.y = y;
    shrine.add(m);
  };
  roof(1, 2.95);
  box(3.4, 0.7, 1.6, 0, 4.2);
  roof(0.66, 4.5);
  [-1, 1].forEach((sx) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 6), shrineMat);
    horn.position.set(sx * 1.55, 5.35, 0);
    horn.rotation.z = -sx * 0.5;
    shrine.add(horn);
  });
  const mouth = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2.0),
    shader(
      { uBlood: blood, uTime: 0 },
      /* glsl */ `
      uniform vec3 uBlood; uniform float uTime;
      varying vec2 vUv;
      void main(){
        float d = length((vUv - vec2(0.5, 0.45)) * vec2(1.2, 1.0));
        float pulse = 0.85 + 0.15 * sin(uTime * 2.0);
        vec3 col = mix(vec3(1.0, 0.75, 0.55), uBlood, smoothstep(0.0, 0.35, d)) * (1.0 - smoothstep(0.25, 0.75, d)) * pulse;
        gl_FragColor = vec4(col, 1.0);
      }`
    )
  );
  mouth.position.set(0, 1.85, -0.45);
  shrine.add(mouth);
  const bone = new THREE.MeshBasicMaterial({ color: toColor(v3(0.86, 0.78, 0.68)) });
  const teeth = new THREE.InstancedMesh(new THREE.ConeGeometry(0.085, 0.34, 5), bone, 18);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i++) {
    const top = i < 9;
    const x = -0.8 + ((i % 9) / 8) * 1.6;
    dummy.position.set(x, top ? 2.72 : 0.92, -0.4);
    dummy.rotation.set(0, 0, top ? Math.PI : 0);
    dummy.scale.set(1, 0.8 + Math.abs(Math.sin(i * 1.7)) * 0.5, 1);
    dummy.updateMatrix();
    teeth.setMatrixAt(i, dummy.matrix);
  }
  shrine.add(teeth);
  shrine.position.set(0, 0, -7);
  scene.add(shrine);
  const mirror = shrine.clone();
  mirror.scale.y = -1;
  scene.add(mirror);

  // a still pool of blood that holds the reflection
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 80).rotateX(-Math.PI / 2).translate(0, 0, -20),
    shader(
      { uBg: p.bg, uBlood: blood, uCam: camera.position, uTime: 0 },
      /* glsl */ `
      ${NOISE}
      uniform vec3 uBg, uBlood, uCam; uniform float uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        float d = length(vW.xz - vec2(0.0, -7.0));
        float ring = smoothstep(0.42, 0.49, abs(fract(d * 0.35 - uTime * 0.12) - 0.5));
        float n = snoise(vec3(vW.xz * 0.5, uTime * 0.2));
        vec3 V = normalize(uCam - vW);
        float fres = pow(1.0 - max(V.y, 0.0), 3.0);
        vec3 col = uBg * 0.5 + uBlood * (0.07 + fres * 0.35 + ring * 0.05 * (1.0 + n));
        float far = smoothstep(20.0, 60.0, length(vW - uCam));
        gl_FragColor = vec4(col, mix(0.78, 1.0, far));
      }`,
      { transparent: true, depthWrite: true }
    )
  );
  pool.renderOrder = 1;
  scene.add(pool);

  // the cuts: thin lines that open across the frame and close again
  const slashMat = () =>
    shader(
      { uAge: 10, uLife: 0.7, uCore: v3(1, 0.93, 0.88), uGlow: mixV(blood, p.accent, 0.4) },
      /* glsl */ `
      uniform float uAge, uLife; uniform vec3 uCore, uGlow;
      varying vec2 vUv;
      void main(){
        float draw = clamp(uAge / 0.09, 0.0, 1.0);
        if (vUv.x > draw) discard;
        float fade = 1.0 - smoothstep(0.09, uLife, uAge);
        float tip = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float d = abs(vUv.y - 0.5) * 2.0;
        float w = mix(0.02, 0.14, tip);
        float core = smoothstep(w, w * 0.25, d) * tip;
        float glow = exp(-d * 7.0) * 0.4 * tip;
        float head = smoothstep(draw - 0.12, draw, vUv.x) * (1.0 - smoothstep(0.06, 0.2, uAge));
        vec3 col = uCore * core + uGlow * (glow + head * 0.7);
        gl_FragColor = vec4(col, (core + glow + head * 0.6) * fade);
      }`,
      { transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }
    );
  type Cut = { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; start: number };
  const cuts: Cut[] = Array.from({ length: 12 }, () => {
    const mat = slashMat();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.renderOrder = 5;
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, mat, start: -10 };
  });
  let next = 0;
  let nextBurst = 0.8;
  // the kind of the next burst is picked ahead, so the beat can rise into it
  let nextGrid = Math.random() < 0.3;
  let lastBurst = -10;
  let lastGrid = false;
  const swell = (t: number, at: number, grid: boolean) => (grid ? 1 : 0.75) * bump(t, at - 0.3, at, at + 0.25, at + 0.75);
  const cut =(at: number, x: number, y: number, ang: number, len: number) => {
    const c = cuts[next];
    next = (next + 1) % cuts.length;
    c.start = at;
    c.mesh.position.set(x, y, 2.5);
    c.mesh.rotation.set(0, 0, ang);
    c.mesh.scale.set(len, 0.42, 1);
  };
  const sparks = new Spray(200, mixV(p.accent, v3(1, 0.85, 0.7), 0.4), true, -3, 0.8);
  scene.add(sparks.dots.points);
  let last = 0;

  return {
    scene,
    camera,
    update(t, dt, px) {
      if (t < last) nextBurst = t + 0.5;
      last = t;
      sparks.dots.scale(px, 36);
      sky.material.uniforms.uHor.value = screenY(camera, v3(0, 0, -80));
      (pool.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (mouth.material as THREE.ShaderMaterial).uniforms.uTime.value = t;

      if (t >= nextBurst) {
        const grid = nextGrid;
        lastBurst = t;
        lastGrid = grid;
        nextGrid = Math.random() < 0.3;
        if (grid) {
          const base = rand(-0.4, 0.4);
          for (let i = 0; i < 4; i++) {
            const ang = base + (i < 2 ? 0 : Math.PI / 2 + rand(-0.15, 0.15));
            const off = (i % 2 ? 1 : -1) * rand(0.5, 1.1);
            cut(t + i * 0.07, Math.sin(ang) * -off + rand(-0.3, 0.3), 2.2 + Math.cos(ang) * off * 0.6, ang, rand(5.5, 7.5));
          }
        } else {
          const n = 1 + Math.floor(rand(0, 3));
          for (let i = 0; i < n; i++) cut(t + i * 0.11, rand(-1.2, 1.2), rand(1.2, 3.4), rand(-0.9, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI / 2), rand(6, 9));
        }
        nextBurst = t + rand(1.1, 1.9);
      }

      let shake = 0;
      for (const c of cuts) {
        const age = t - c.start;
        c.mesh.visible = age >= 0 && age < 0.75;
        if (!c.mesh.visible) continue;
        c.mat.uniforms.uAge.value = age;
        shake = Math.max(shake, Math.exp(-age * 14));
        if (age < 0.1 && Math.random() < 0.7) {
          const k = rand(-0.5, 0.5) * c.mesh.scale.x * 0.8;
          const a = c.mesh.rotation.z;
          for (let i = 0; i < 3; i++) {
            sparks.emit(
              v3(c.mesh.position.x + Math.cos(a) * k, c.mesh.position.y + Math.sin(a) * k, 2.5),
              v3(rand(-2, 2), rand(-1, 2.5), rand(-1, 1)),
              rand(0.03, 0.07),
              rand(0.3, 0.8)
            );
          }
        }
      }
      sky.material.uniforms.uFlash.value = shake;
      camera.position.set(camAt.x + rand(-1, 1) * shake * 0.06, camAt.y + rand(-1, 1) * shake * 0.06, camAt.z);
      camera.quaternion.copy(look);
      sparks.step(dt, 0.9);
      // each slash; the four-cut grid is the full beat
      return Math.max(swell(t, lastBurst, lastGrid), swell(t, nextBurst, nextGrid));
    },
  };
};

/* ── jinwoo: arise ─────────────────────────────────────────────────────────── */

const jinwoo: Build = (p) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  camera.position.set(0, 2.0, 10);
  camera.lookAt(0, 1.5, -1);

  const violet = v3(0.5, 0.36, 1.0);
  const sky = backdrop(
    { uBg: p.bg, uViolet: violet, uAccent: p.accent, uHor: 0.3, uGate: new THREE.Vector2(0.5, 0.6), uOn: 0, uTime: 0 },
    /* glsl */ `
    ${NOISE}
    uniform vec3 uBg, uViolet, uAccent; uniform float uHor, uOn, uTime; uniform vec2 uGate;
    varying vec2 vUv;
    void main(){
      float h = vUv.y - uHor;
      vec3 col = mix(uBg * 0.6, uBg * 0.5 + uViolet * 0.14 + uAccent * 0.04, exp(-max(h, 0.0) * 4.0));
      // a gate, open, far behind them
      vec2 g = (vUv - uGate) * vec2(1.0, 0.62);
      float r = length(g);
      float swirl = fbm(vec3(atan(g.y, g.x) * 1.5, r * 14.0 - uTime * 0.6, uTime * 0.1));
      float disc = smoothstep(0.1, 0.085, r);
      col = mix(col, uViolet * (0.25 + 0.35 * swirl) + uBg, disc * 0.85);
      col += uViolet * smoothstep(0.012, 0.0, abs(r - 0.098)) * (0.6 + 0.4 * uOn);
      col += uViolet * exp(-r * 9.0) * 0.18 * (0.5 + 0.5 * uOn);
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  // dark water with a ring of runes on it
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 80).rotateX(-Math.PI / 2).translate(0, 0, -20),
    shader(
      { uBg: p.bg, uViolet: violet, uAccent: p.accent, uOn: 0, uTime: 0, uCam: camera.position },
      /* glsl */ `
      ${NOISE}
      uniform vec3 uBg, uViolet, uAccent, uCam; uniform float uOn, uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec2 q = vW.xz - vec2(0.0, -1.6);
        float r = length(q);
        float a = atan(q.y, q.x);
        float ring = smoothstep(0.05, 0.0, abs(r - 4.2)) + smoothstep(0.04, 0.0, abs(r - 3.7)) * 0.7;
        float ticks = step(0.5, fract(a * 9.55)) * smoothstep(0.18, 0.0, abs(r - 3.95)) * step(0.3, hash12(vec2(floor(a * 19.1), 3.0)));
        float inner = smoothstep(0.03, 0.0, abs(r - 2.2)) * 0.6;
        float rune = (ring + ticks * 0.8 + inner) * uOn;
        float n = snoise(vec3(vW.xz * 0.4, uTime * 0.15));
        float fres = pow(1.0 - max(normalize(uCam - vW).y, 0.0), 3.0);
        vec3 col = uBg * 0.45 + uViolet * (rune * 0.8 + fres * 0.08 + exp(-r * 0.5) * 0.06 * uOn * (1.0 + n));
        // far off the water goes to the sky's horizon colour, so there is no seam
        col = mix(col, uBg * 0.5 + uViolet * 0.14 + uAccent * 0.04, smoothstep(22.0, 58.0, -vW.z));
        gl_FragColor = vec4(col, 1.0);
      }`
    )
  );
  scene.add(pool);

  const shadowMat = shader(
    { uBg: p.bg, uViolet: violet, uCam: camera.position, uTime: 0 },
    /* glsl */ `
    ${NOISE}
    uniform vec3 uBg, uViolet, uCam; uniform float uTime;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      vec3 N = normalize(vN);
      float rim = pow(1.0 - abs(dot(N, normalize(uCam - vW))), 2.4);
      float smoke = snoise(vec3(vW.x * 3.0, vW.y * 1.6 - uTime * 1.1, vW.z * 3.0)) * 0.5 + 0.5;
      // the outline frays into smoke that keeps climbing off them
      if (smoke * 0.8 < rim - 0.3) discard;
      vec3 col = uBg * 0.15 + uViolet * (rim * (0.35 + 0.65 * smoke) * 0.9 + smoothstep(0.5, 0.0, vW.y) * 0.25);
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  const eyeDots = new Dots(14, mixV(violet, v3(1, 1, 1), 0.45), true, 0);
  scene.add(eyeDots.points);
  const soldier = (knight: boolean) => {
    const g = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, x: number, y: number, z = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, shadowMat);
      m.position.set(x, y, z);
      m.rotation.z = rz;
      g.add(m);
      return m;
    };
    // a long cloak from the shoulders to the water, a hood or a helm over it
    add(new THREE.CylinderGeometry(0.24, 0.62, 2.1, 14, 4), 0, 1.05);
    add(new THREE.SphereGeometry(0.25, 14, 10), -0.3, 2.02).scale.set(1, 0.8, 0.9);
    add(new THREE.SphereGeometry(0.25, 14, 10), 0.3, 2.02).scale.set(1, 0.8, 0.9);
    add(new THREE.SphereGeometry(0.19, 14, 10), 0, 2.38).scale.set(0.95, 1.15, 1);
    if (!knight) add(new THREE.ConeGeometry(0.24, 0.5, 12), 0, 2.55, -0.04);
    if (knight) {
      add(new THREE.SphereGeometry(0.3, 14, 10), -0.38, 2.05).scale.set(1, 0.7, 0.9);
      add(new THREE.SphereGeometry(0.3, 14, 10), 0.38, 2.05).scale.set(1, 0.7, 0.9);
      [-1, 1].forEach((s) => add(new THREE.ConeGeometry(0.06, 0.55, 6), s * 0.14, 2.8, 0, -s * 0.35));
      add(new THREE.BoxGeometry(0.07, 1.7, 0.02), 0.66, 0.8, 0.1);
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6).rotateZ(Math.PI / 2), 0.66, 1.62, 0.1);
    }
    return g;
  };
  const ranks = [
    { x: 0, z: 0, h: 1.25, delay: 0.9, knight: true },
    { x: -1.7, z: -1.3, h: 1, delay: 0.2 },
    { x: 1.7, z: -1.3, h: 1, delay: 0.35 },
    { x: -3.2, z: -2.8, h: 0.95, delay: 0.5 },
    { x: 3.2, z: -2.8, h: 0.95, delay: 0.1 },
    { x: -4.6, z: -4.6, h: 0.9, delay: 0.65 },
    { x: 4.6, z: -4.6, h: 0.9, delay: 0.4 },
  ].map((r) => {
    const g = soldier(!!r.knight);
    g.scale.setScalar(r.h);
    g.position.set(r.x, -3, r.z);
    scene.add(g);
    return { ...r, g };
  });

  const smoke = new Spray(320, mixV(p.bg, violet, 0.35).add(v3(0.03, 0.03, 0.04)), false, 0.7, 0.6);
  scene.add(smoke.dots.points);

  const period = 12;
  const pm = pool.material as THREE.ShaderMaterial;
  const P = v3(0, 0, 0);
  return {
    scene,
    camera,
    update(t, dt, px) {
      smoke.dots.scale(px, 36);
      eyeDots.scale(px, 36);
      const c = t % period;
      const rune = smooth(0.2, 1.2, c) * (1 - smooth(10.2, 11.4, c));
      sky.material.uniforms.uHor.value = screenY(camera, v3(0, 0, -60));
      sky.material.uniforms.uGate.value = screenXY(camera, v3(0, 4.2, -40));
      sky.material.uniforms.uOn.value = rune;
      sky.material.uniforms.uTime.value = t;
      pm.uniforms.uOn.value = rune * (0.85 + 0.15 * Math.sin(t * 3));
      pm.uniforms.uTime.value = t;
      shadowMat.uniforms.uTime.value = t;

      ranks.forEach((r, i) => {
        const up = smooth(1.2 + r.delay * 2, 3.6 + r.delay * 2, c) * (1 - smooth(9.4, 11, c));
        r.g.position.y = -3 * r.h * (1 - up) + Math.sin(t * 0.8 + i) * 0.03 * up;
        r.g.rotation.y = Math.sin(t * 0.3 + i * 2) * 0.08;
        const eyeOn = smooth(0.92, 1, up);
        const ey = r.g.position.y + 2.4 * r.h;
        for (let s = 0; s < 2; s++) {
          eyeDots.pos.set([r.x + (s ? 0.065 : -0.065) * r.h, ey - 0.02 * r.h, r.z + 0.19 * r.h], (i * 2 + s) * 3);
          eyeDots.size[i * 2 + s] = 0.13 * r.h;
          eyeDots.alpha[i * 2 + s] = eyeOn * (0.8 + 0.2 * Math.sin(t * 5 + i));
        }
        if (up > 0.05 && up < 0.999 && Math.random() < 0.9) {
          P.set(r.x + rand(-0.6, 0.6) * r.h, rand(0, 0.3), r.z + rand(-0.3, 0.3));
          smoke.emit(P, v3(rand(-0.2, 0.2), rand(0.6, 1.4), rand(-0.1, 0.1)), rand(0.35, 0.7) * r.h, rand(1.5, 3));
        } else if (up >= 0.999 && Math.random() < 0.2) {
          P.set(r.x + rand(-0.5, 0.5) * r.h, rand(0.4, 2.4) * r.h, r.z);
          smoke.emit(P, v3(rand(-0.1, 0.1), rand(0.3, 0.7), 0), rand(0.25, 0.5) * r.h, rand(1.5, 2.5));
        }
      });
      eyeDots.flush();
      smoke.step(dt, 0.4, 1.8);
      // arise: the knight stands and his eyes light
      return bump(c, 4.8, 5.5, 6.7, 7.4);
    },
  };
};

/* ── killua: godspeed ──────────────────────────────────────────────────────── */

// camera-facing lightning: each segment is a quad in the xy plane, drawn twice (glow, then core)
class Bolts {
  readonly mesh: THREE.Mesh;
  private pos: Float32Array;
  private across: Float32Array;
  private alpha: Float32Array;
  private core: Float32Array;
  private n = 0;

  constructor(private max: number, glow: V3) {
    this.pos = new Float32Array(max * 12);
    this.across = new Float32Array(max * 4);
    this.alpha = new Float32Array(max * 4);
    this.core = new Float32Array(max * 4);
    const idx: number[] = [];
    for (let q = 0; q < max; q++) {
      const b = q * 4;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      this.across.set([1, -1, 1, -1], b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aV', new THREE.BufferAttribute(this.across, 1));
    geo.setAttribute('aA', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aCore', new THREE.BufferAttribute(this.core, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: { uGlow: { value: glow } },
        vertexShader: /* glsl */ `
          attribute float aV; attribute float aA; attribute float aCore;
          varying float vV; varying float vA; varying float vCore;
          void main(){ vV = aV; vA = aA; vCore = aCore; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uGlow;
          varying float vV; varying float vA; varying float vCore;
          void main(){
            float d = abs(vV);
            float prof = vCore > 0.5 ? smoothstep(1.0, 0.1, d) : exp(-d * 2.6) * (1.0 - d);
            gl_FragColor = vec4(mix(uGlow, vec3(1.0), vCore), prof * vA);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    this.mesh.frustumCulled = false;
  }

  begin() {
    this.n = 0;
  }

  private quad(a: V3, b: V3, w: number, alpha: number, core: number) {
    if (this.n >= this.max) return;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const nx = -dy * w;
    const ny = dx * w;
    const ex = dx * w * 0.5;
    const ey = dy * w * 0.5;
    const q = this.n * 4;
    this.pos.set(
      [a.x + nx - ex, a.y + ny - ey, a.z, a.x - nx - ex, a.y - ny - ey, a.z, b.x + nx + ex, b.y + ny + ey, b.z, b.x - nx + ex, b.y - ny + ey, b.z],
      q * 3
    );
    this.alpha.fill(alpha, q, q + 4);
    this.core.fill(core, q, q + 4);
    this.n++;
  }

  line(pts: V3[], w: number, alpha: number) {
    for (let i = 0; i < pts.length - 1; i++) this.quad(pts[i], pts[i + 1], w * 5, alpha * 0.55, 0);
    for (let i = 0; i < pts.length - 1; i++) this.quad(pts[i], pts[i + 1], w, alpha, 1);
  }

  end() {
    const g = this.mesh.geometry;
    g.setDrawRange(0, this.n * 6);
    g.attributes.position.needsUpdate = true;
    (g.attributes.aA as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aCore as THREE.BufferAttribute).needsUpdate = true;
  }
}

// a jagged path from a to b
const jag = (a: V3, b: V3, segs: number, amp: number) => {
  const pts: V3[] = [];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  let drift = 0;
  for (let i = 0; i <= segs; i++) {
    const k = i / segs;
    drift = drift * 0.5 + rand(-1, 1);
    const o = drift * amp * Math.sin(Math.PI * k);
    pts.push(new THREE.Vector3(a.x + dx * k + nx * o, a.y + dy * k + ny * o, a.z + (b.z - a.z) * k));
  }
  return pts;
};

const killua: Build = (p) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  camera.position.set(0, 1.2, 9);
  camera.lookAt(0, 0.9, 0);

  const elec = v3(0.5, 0.74, 1.0);
  const sky = backdrop(
    { uBg: p.bg, uElec: elec, uAccent: p.accent, uAt: new THREE.Vector2(0.5, 0.5), uFlash: 0, uHor: 0.3 },
    /* glsl */ `
    uniform vec3 uBg, uElec, uAccent; uniform vec2 uAt; uniform float uFlash, uHor;
    varying vec2 vUv;
    void main(){
      vec3 col = mix(uBg * 0.7, uBg + uAccent * 0.05, exp(-max(vUv.y - uHor, 0.0) * 5.0));
      col += uElec * exp(-length(vUv - uAt) * 4.0) * 0.16;
      col += uElec * uFlash * 0.18;
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 60).rotateX(-Math.PI / 2).translate(0, -1.4, -14),
    shader(
      { uBg: p.bg, uElec: elec, uAccent: p.accent, uAt: v3(0, 0, 0), uK: 1 },
      /* glsl */ `
      uniform vec3 uBg, uElec, uAccent, uAt; uniform float uK;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec2 g = abs(fract(vW.xz * 0.5) - 0.5);
        float line = smoothstep(0.02, 0.0, min(g.x, g.y));
        float d = length(vW.xz - uAt.xz);
        float glow = exp(-d * 0.7) * uK;
        vec3 col = uBg * 0.8 + uElec * (glow * (0.1 + line * 0.35) + line * 0.012);
        // the far floor fades into the sky's horizon, so there is no seam
        col = mix(col, uBg + uAccent * 0.05, smoothstep(14.0, 42.0, -vW.z));
        gl_FragColor = vec4(col, 1.0);
      }`
    )
  );
  scene.add(floor);

  const bolts = new Bolts(900, elec);
  scene.add(bolts.mesh);
  const halo = new Dots(2, mixV(elec, v3(1, 1, 1), 0.3), true, 0);
  const ghost = new Dots(6, elec, true, 0);
  scene.add(halo.points, ghost.points);
  const ghosts: { at: V3; born: number }[] = [];
  const sparks = new Spray(220, mixV(elec, v3(1, 1, 1), 0.5), true, -6, 0.6);
  scene.add(sparks.dots.points);

  type Trail = { a: V3; b: V3; born: number; pts: V3[]; amp: number };
  const trails: Trail[] = [];
  const now = v3(0, 1, 0);
  const from = v3(0, 1, 0);
  const to = v3(0, 1, 0);
  let dashAt = 0;
  let dashLen = 0.1;
  let hold = 0.4;
  let strikeAt = 2.5;
  let lastStrike = -10;
  const flash = (t: number, at: number) => bump(t, at - 0.3, at, at + 0.15, at + 0.65);
  let strike: Trail | null = null;
  let jitterAt = 0;
  let arcs: V3[][] = [];
  let last = 0;
  const pick = () => {
    for (let i = 0; i < 8; i++) {
      to.set(rand(-3.2, 3.2), rand(-0.9, 2.9), rand(-1.5, 1.5));
      if (to.distanceTo(from) > 2.6) break;
    }
  };
  pick();

  return {
    scene,
    camera,
    update(t, dt, px) {
      if (t < last) {
        dashAt = t;
        strikeAt = t + 2;
        jitterAt = t;
        trails.length = 0;
        strike = null;
      }
      last = t;
      halo.scale(px, 36);
      ghost.scale(px, 36);
      sparks.dots.scale(px, 36);

      // dash, stop, crackle, dash again
      const k = (t - dashAt) / dashLen;
      if (k >= 1 && t - dashAt > dashLen + hold) {
        from.copy(to);
        pick();
        dashAt = t;
        dashLen = rand(0.08, 0.13);
        hold = rand(0.25, 0.65);
        trails.push({ a: from.clone(), b: to.clone(), born: t, pts: [], amp: 0.26 });
        if (trails.length > 7) trails.shift();
        ghosts.push({ at: from.clone(), born: t });
        if (ghosts.length > 6) ghosts.shift();
      }
      const kk = Math.min(1, Math.max(0, (t - dashAt) / dashLen));
      now.copy(from).lerp(to, kk);
      if (kk >= 1 && t - dashAt - dt < dashLen) {
        for (let i = 0; i < 18; i++) sparks.emit(now, v3(rand(-3, 3), rand(-1, 4), rand(-2, 2)), rand(0.02, 0.05), rand(0.25, 0.6));
      }

      if (t >= strikeAt) {
        const top = v3(now.x + rand(-2, 2), 7.5, now.z);
        strike = { a: top, b: now.clone(), born: t, pts: [], amp: 0.6 };
        strike.pts = jag(strike.a, strike.b, 26, strike.amp);
        lastStrike = t;
        strikeAt = t + rand(1.6, 3);
      }

      if (t >= jitterAt) {
        jitterAt = t + 0.045;
        for (const tr of trails) tr.pts = jag(tr.a, tr.b, 18, tr.amp);
        if (strike) strike.pts = jag(strike.a, strike.b, 26, strike.amp);
        arcs = Array.from({ length: 4 }, () => {
          const end = now.clone().add(v3(rand(-0.7, 0.7), rand(-0.7, 0.7), 0));
          return jag(now, end, 5, 0.12);
        });
      }

      bolts.begin();
      for (const tr of trails) {
        const age = t - tr.born;
        const a = Math.max(0, 1 - age / 0.9);
        if (a > 0) bolts.line(tr.pts, 0.05, a * a);
      }
      if (strike) {
        const age = t - strike.born;
        const a = Math.max(0, 1 - age / 0.3);
        if (a > 0) {
          bolts.line(strike.pts, 0.07, a);
          const mid = strike.pts[Math.floor(strike.pts.length * 0.45)];
          bolts.line(jag(mid, mid.clone().add(v3(rand(-1.6, 1.6), -1.4, 0)), 8, 0.25), 0.03, a * 0.8);
        }
        sky.material.uniforms.uFlash.value = a * a;
        if (a <= 0) strike = null;
      } else sky.material.uniforms.uFlash.value = 0;
      const crackle = kk >= 1 ? 1 : 0.4;
      for (const arc of arcs) bolts.line(arc, 0.028, crackle * 0.9);
      bolts.end();

      halo.pos.set([now.x, now.y, now.z, now.x, now.y, now.z]);
      halo.size[0] = 1.6;
      halo.size[1] = 0.45;
      halo.alpha[0] = 0.55;
      halo.alpha[1] = 1;
      halo.flush();
      ghosts.forEach((g, i) => {
        ghost.pos.set([g.at.x, g.at.y, g.at.z], i * 3);
        ghost.size[i] = 0.9;
        ghost.alpha[i] = Math.max(0, 0.5 - (t - g.born) * 0.5);
      });
      ghost.flush();
      sky.material.uniforms.uAt.value = screenXY(camera, now);
      sky.material.uniforms.uHor.value = screenY(camera, v3(0, -1.4, -44));
      ((floor.material as THREE.ShaderMaterial).uniforms.uAt.value as V3).copy(now);
      (floor.material as THREE.ShaderMaterial).uniforms.uK.value = 1 / (1 + Math.max(0, now.y + 1.4) * 0.5);
      sparks.step(dt, 1);
      // the dashes come every half second, too often for a beat; the bolt from the sky is the moment
      return Math.max(flash(t, lastStrike), flash(t, strikeAt));
    },
  };
};

/* ── gon: the charge (both sides; light is the kid, dark is what anger made) ── */

const gon: Build = (p) => {
  const dark = p.dark;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  const camAt = v3(0, 1.9, 10);
  camera.position.copy(camAt);
  camera.lookAt(0, 1.4, 0);
  const look = camera.quaternion.clone();

  const green = v3(0.16, 0.62, 0.34);
  const aura = dark ? p.accent : green;
  const paper = mixV(p.bg, v3(1, 1, 1), 0.3);
  const orbAt = v3(0, 1.45, 0);

  const sky = backdrop(
    { uBg: p.bg, uAura: aura, uAt: new THREE.Vector2(0.5, 0.5), uK: 0, uHor: 0.3, uDark: dark ? 1 : 0 },
    /* glsl */ `
    uniform vec3 uBg, uAura; uniform vec2 uAt; uniform float uK, uHor, uDark;
    varying vec2 vUv;
    void main(){
      float d = length(vUv - uAt);
      vec3 col = uBg;
      if (uDark > 0.5) {
        col = mix(uBg * 0.6, uBg + uAura * 0.08, exp(-max(vUv.y - uHor, 0.0) * 4.0));
        // a burning column behind him, so the black smoke reads against it
        float colm = exp(-abs(vUv.x - uAt.x) * 5.0) * exp(-max(vUv.y - uAt.y, 0.0) * 1.2) * step(uHor, vUv.y);
        col += uAura * (exp(-d * 2.4) * (0.2 + 0.5 * uK) + colm * (0.1 + 0.4 * uK));
        gl_FragColor = vec4(col, 1.0);
      } else {
        float a = exp(-d * 3.2) * (0.1 + 0.3 * uK);
        gl_FragColor = vec4(uAura, a);
      }
    }`
  );
  scene.add(sky);

  // cracked ground, a ring of it lit from the charge
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2),
    shader(
      { uBg: p.bg, uInk: p.ink, uAura: aura, uK: 0, uDark: dark ? 1 : 0, uPaper: paper },
      /* glsl */ `
      ${NOISE}
      uniform vec3 uBg, uInk, uAura, uPaper; uniform float uK, uDark;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec2 q = vW.xz;
        float r = length(q);
        float a = atan(q.y, q.x);
        float n = snoise(vec3(a * 3.0, r * 0.6, 1.0));
        float spoke = smoothstep(uDark > 0.5 ? 0.43 : 0.455, 0.495, abs(fract(a * 2.5 + n * 0.25) - 0.5)) * smoothstep(4.5, 0.6, r);
        float ring = smoothstep(0.05, 0.0, abs(r - 1.6 - n * 0.2)) * 0.8;
        float crack = max(spoke, ring) * smoothstep(0.2, 0.9, uK);
        float fade = smoothstep(14.0, 5.0, r);
        vec3 col;
        if (uDark > 0.5) {
          col = uBg * (0.9 + 0.2 * n) + uAura * (crack * 1.3 + exp(-r * 0.5) * 0.3 * uK);
        } else {
          col = mix(uBg, uInk, crack * 0.5) + uAura * exp(-r * 0.7) * 0.12 * uK;
        }
        gl_FragColor = vec4(col, fade);
      }`,
      { transparent: true, depthWrite: false }
    )
  );
  ground.renderOrder = -5;
  scene.add(ground);

  // the charge
  const orbMat = shader(
    { uAura: aura, uCam: camera.position, uTime: 0, uK: 0, uDark: dark ? 1 : 0, uBg: p.bg },
    /* glsl */ `
    ${NOISE}
    uniform vec3 uAura, uCam, uBg; uniform float uTime, uK, uDark;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      vec3 N = normalize(vN);
      float f = max(dot(N, normalize(uCam - vW)), 0.0);
      float n = snoise(N * 3.0 + vec3(0.0, -uTime * 1.5, uTime * 0.4)) * 0.5 + 0.5;
      vec3 col;
      if (uDark > 0.5) {
        col = uBg * 0.4 + uAura * (pow(1.0 - f, 2.0) * 1.4 + n * 0.12 * uK);
        col += vec3(1.0, 0.85, 0.7) * pow(1.0 - f, 6.0) * 0.6;
      } else {
        col = mix(vec3(1.0), uAura, pow(1.0 - f, 1.4) * (0.75 + 0.25 * n));
      }
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), orbMat);
  orb.position.copy(orbAt);
  scene.add(orb);

  // rocks lifted off the ground by it
  const rockMat = shader(
    { uBg: p.bg, uInk: p.ink, uAura: aura, uOrb: orbAt, uK: 0, uDark: dark ? 1 : 0, uPaper: paper },
    /* glsl */ `
    uniform vec3 uBg, uInk, uAura, uOrb, uPaper; uniform float uK, uDark;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      vec3 N = normalize(vN);
      float lit = max(dot(N, normalize(uOrb - vW)), 0.0);
      float top = max(N.y, 0.0);
      vec3 base = uDark > 0.5 ? uBg * 1.4 : mix(uPaper, uInk, 0.55 - top * 0.25);
      gl_FragColor = vec4(base + uAura * lit * (0.25 + 0.6 * uK), 1.0);
    }`
  );
  const rockN = dark ? 22 : 14;
  const rocks = Array.from({ length: rockN }, (_, i) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.09, dark ? 0.3 : 0.22), 0), rockMat);
    const a = (i / rockN) * Math.PI * 2 + rand(-0.2, 0.2);
    const r = rand(1.1, 2.6);
    scene.add(m);
    return { m, a, r, h: rand(0.6, 2.8), spin: v3(rand(-2, 2), rand(-2, 2), rand(-2, 2)), out: v3(0, 0, 0), lift: rand(0.6, 1) };
  });

  const wisps = new Spray(dark ? 360 : 240, dark ? p.bg.clone().multiplyScalar(0.3) : mixV(paper, green, 0.55), false, dark ? 1.4 : 0.8, 0.5);
  const embers = new Spray(160, dark ? mixV(p.accent, v3(1, 0.8, 0.6), 0.3) : mixV(green, v3(1, 1, 1), 0.2), dark, dark ? 2 : 1.2, 0.4);
  scene.add(wisps.dots.points, embers.dots.points);

  const shock = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1, 96).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: toColor(dark ? p.accent : green), transparent: true, depthWrite: false })
  );
  shock.position.y = 0.03;
  scene.add(shock);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    shader(
      { uAura: aura, uCam: camera.position, uA: 0 },
      /* glsl */ `
      uniform vec3 uAura, uCam; uniform float uA;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        float f = abs(dot(normalize(vN), normalize(uCam - vW)));
        gl_FragColor = vec4(uAura, pow(1.0 - f, 3.0) * uA);
      }`,
      { transparent: true, depthWrite: false }
    )
  );
  shell.position.copy(orbAt);
  scene.add(shell);

  const period = dark ? 8.5 : 6;
  const charge = dark ? 5.6 : 3.4;
  const P = v3(0, 0, 0);
  return {
    scene,
    camera,
    update(t, dt, px) {
      wisps.dots.scale(px, 36);
      embers.dots.scale(px, 36);
      const c = t % period;
      const k = smooth(0.2, charge, c) * (1 - smooth(charge, charge + 0.15, c));
      const blast = c > charge ? c - charge : -1;
      const calm = blast >= 0 ? 1 - smooth(0, period - charge - 0.4, blast) : 1;

      const r = (dark ? 0.32 : 0.22) + k * (dark ? 0.75 : 0.5) + Math.sin(t * 30) * 0.015 * k;
      orb.scale.setScalar(blast >= 0 ? Math.max(0.001, r * (1 - smooth(0, 0.12, blast))) : r);
      orbMat.uniforms.uTime.value = t;
      orbMat.uniforms.uK.value = k;
      sky.material.uniforms.uAt.value = screenXY(camera, orbAt);
      sky.material.uniforms.uK.value = blast >= 0 ? Math.exp(-blast * 4) : k;
      sky.material.uniforms.uHor.value = screenY(camera, v3(0, 0, -60));
      const gm = ground.material as THREE.ShaderMaterial;
      gm.uniforms.uK.value = blast >= 0 ? Math.max(0, 1 - blast * 0.8) : k;
      rockMat.uniforms.uK.value = k;

      rocks.forEach((rk, i) => {
        if (blast < 0) {
          const lift = smooth(0.4 + i * 0.05, charge * 0.8, c) * rk.lift;
          const a = rk.a + t * (dark ? 0.25 : 0.4) * lift;
          rk.m.position.set(Math.cos(a) * rk.r, 0.1 + lift * rk.h + Math.sin(t * 2 + i) * 0.05 * lift, Math.sin(a) * rk.r * 0.7);
          rk.m.rotation.set(t * rk.spin.x * 0.2 * lift, t * rk.spin.y * 0.2 * lift, 0);
          rk.out.set(rk.m.position.x, rk.m.position.y - orbAt.y * 0.5, rk.m.position.z).normalize().multiplyScalar(dark ? 14 : 10);
          rk.m.visible = true;
        } else {
          rk.m.position.addScaledVector(rk.out, dt);
          rk.out.y -= 9 * dt;
          rk.m.rotation.x += rk.spin.x * dt;
          rk.m.visible = blast < 1.6;
        }
      });

      if (blast < 0) {
        const rate = (dark ? 5 : 3) * (0.3 + k);
        for (let i = 0; i < rate; i++) {
          const a = rand(0, Math.PI * 2);
          const rr = rand(0.2, dark ? 1.6 : 1.0) * (0.5 + k);
          P.set(Math.cos(a) * rr, rand(0, 0.4), Math.sin(a) * rr * 0.7);
          wisps.emit(P, v3(-Math.cos(a) * 0.3, rand(1, 2.4) * (dark ? 1.3 : 1), -Math.sin(a) * 0.2), rand(0.25, dark ? 0.9 : 0.5), rand(0.9, 1.8));
        }
        if (Math.random() < 0.3 + k) {
          P.copy(orbAt).add(v3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(r * rand(1.4, 2.6)));
          embers.emit(P, orbAt.clone().sub(P).multiplyScalar(2.2), rand(0.03, 0.07), rand(0.3, 0.5));
        }
      } else if (blast < dt * 1.5) {
        for (let i = 0; i < 90; i++) {
          const d = v3(rand(-1, 1), rand(-0.4, 1), rand(-1, 1)).normalize();
          embers.emit(orbAt, d.multiplyScalar(rand(4, 9)), rand(0.04, 0.1), rand(0.4, 1.1));
          if (i < 50) wisps.emit(orbAt.clone().addScaledVector(d, 0.5), d.multiplyScalar(0.4), rand(0.4, dark ? 1.4 : 0.8), rand(1, 2));
        }
      }
      wisps.step(dt, dark ? 0.55 * calm + 0.1 : 0.6, 1.6);
      embers.step(dt, 0.9);

      const sr = blast >= 0 ? 0.5 + blast * (dark ? 14 : 10) : 0;
      shock.visible = blast >= 0 && blast < 1;
      shock.scale.set(sr, 1, sr);
      (shock.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - blast));
      const sh = blast >= 0 ? 0.6 + blast * (dark ? 9 : 6) : 0;
      shell.visible = blast >= 0 && blast < 0.8;
      shell.scale.setScalar(sh);
      (shell.material as THREE.ShaderMaterial).uniforms.uA.value = Math.max(0, 1 - blast / 0.8);

      const shake = (dark ? k * k * 0.05 : 0) + (blast >= 0 ? Math.exp(-blast * 6) * (dark ? 0.25 : 0.12) : 0);
      camera.position.set(camAt.x + rand(-1, 1) * shake, camAt.y + rand(-1, 1) * shake, camAt.z);
      camera.quaternion.copy(look);
      // the punch: the charge lets go
      return bump(c, charge - 0.45, charge, charge + 0.25, charge + 0.9);
    },
  };
};

/* ── batman: the signal ────────────────────────────────────────────────────── */

const batTexture = () => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#000';
  g.beginPath();
  // a plain bat: body, ears, two scalloped wings
  g.moveTo(256, 92);
  g.lineTo(244, 70);
  g.lineTo(238, 96);
  g.quadraticCurveTo(200, 70, 120, 74);
  g.quadraticCurveTo(70, 80, 30, 120);
  g.quadraticCurveTo(80, 118, 96, 150);
  g.quadraticCurveTo(120, 128, 150, 150);
  g.quadraticCurveTo(180, 132, 206, 162);
  g.quadraticCurveTo(232, 150, 256, 196);
  g.quadraticCurveTo(280, 150, 306, 162);
  g.quadraticCurveTo(332, 132, 362, 150);
  g.quadraticCurveTo(392, 128, 416, 150);
  g.quadraticCurveTo(432, 118, 482, 120);
  g.quadraticCurveTo(442, 80, 392, 74);
  g.quadraticCurveTo(312, 70, 274, 96);
  g.lineTo(268, 70);
  g.closePath();
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
};

const batman: Build = (p) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(0, 1.0, 16);
  camera.lookAt(-0.6, 6.2, 0);

  const night = mixV(p.ink, v3(0.03, 0.035, 0.07), 0.5);
  const glow = mixV(night, p.accent, 0.42);
  const paper = v3(0.97, 0.96, 0.93);

  const sky = backdrop(
    { uNight: night, uGlow: glow, uHor: 0.25 },
    /* glsl */ `
    uniform vec3 uNight, uGlow; uniform float uHor;
    varying vec2 vUv;
    void main(){
      vec3 col = mix(uNight * 0.8, uGlow, exp(-max(vUv.y - uHor, 0.0) * 3.4) * 0.85);
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  // clouds, with the signal on them
  const spot = v3(-2.6, 11, -6);
  const cloud = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 50, 1, 1).rotateX(Math.PI / 2).translate(0, 11, -14),
    shader(
      { uTime: 0, uNight: night, uGlow: glow, uPaper: paper, uSpot: spot, uBat: batTexture(), uOn: 1 },
      /* glsl */ `
      ${NOISE}
      uniform float uTime, uOn; uniform vec3 uNight, uGlow, uPaper, uSpot; uniform sampler2D uBat;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec2 q = vW.xz * 0.11 + vec2(uTime * 0.02, 0.0);
        float dens = smoothstep(-0.25, 0.65, fbm(vec3(q, uTime * 0.03)));
        vec3 col = mix(uNight * 0.9, uGlow * 1.15, dens);
        vec2 s = (vW.xz - uSpot.xz) / vec2(3.4, 2.4);
        float r = length(s);
        float disc = smoothstep(1.0, 0.9, r);
        vec2 bu = s * vec2(0.5, -0.62) * 0.95 + 0.5;
        float bat = texture2D(uBat, bu).r;
        float lightAmt = disc * mix(0.55, 1.0, dens) * uOn;
        col = mix(col, uPaper * 0.95, lightAmt * bat);
        col = mix(col, uNight * 0.6, lightAmt * (1.0 - bat) * 0.85);
        col += uPaper * exp(-r * r * 0.9) * 0.08 * uOn;
        float edge = smoothstep(18.0, 40.0, length(vW.xz - vec2(0.0, -10.0)));
        float a = (0.45 + 0.55 * dens) * (1.0 - edge);
        gl_FragColor = vec4(col, max(a, lightAmt));
      }`,
      { transparent: true, side: THREE.DoubleSide, depthWrite: false }
    )
  );
  scene.add(cloud);

  // the city
  const cityMat = shader(
    { uNight: night, uGlow: glow, uLit: mixV(paper, p.accent, 0.25) },
    /* glsl */ `
    uniform vec3 uNight, uGlow, uLit;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 N = normalize(vN);
      vec3 col = uNight * (0.7 + 0.3 * smoothstep(-1.0, 1.0, N.x));
      if (abs(N.z) > 0.5) {
        vec2 g = vec2(vW.x * 3.2, vW.y * 3.8);
        vec2 cell = fract(g);
        float on = step(0.72, h(floor(g) + floor(vW.z * 3.0)));
        float win = step(0.25, cell.x) * step(cell.x, 0.75) * step(0.3, cell.y) * step(cell.y, 0.75);
        col = mix(col, uLit, on * win * 0.75);
      }
      col = mix(col, uGlow * 0.9, smoothstep(-2.0, -22.0, vW.z) * 0.55);
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), cityMat, 60);
  const dummy = new THREE.Object3D();
  let n = 0;
  [
    [-1, 9, 4.2],
    [-7, 11, 6.5],
    [-18, 13, 9],
  ].forEach(([z, cnt, hMax]) => {
    let x = -15;
    for (let i = 0; i < cnt * 2 && n < 60 && x < 15; i++) {
      const w = rand(1.0, 2.6);
      // the blocks go well below the frame's foot, for the tall card
      dummy.position.set(x + w / 2, -6, z + rand(-1, 1));
      dummy.scale.set(w, 5.8 + rand(1.2, hMax) + (Math.abs(x) < 4 && z === -1 ? -0.6 : 0), rand(1, 2.5));
      dummy.updateMatrix();
      city.setMatrixAt(n++, dummy.matrix);
      x += w + rand(0.1, 0.5);
    }
  });
  city.count = n;
  scene.add(city);

  // the beam
  const lamp = v3(3.2, 3.4, -1.2);
  const dir = spot.clone().sub(lamp);
  const len = dir.length();
  const beamMat = shader(
    { uCol: mixV(paper, p.accent, 0.12), uCam: camera.position, uI: 1 },
    /* glsl */ `
    uniform vec3 uCol, uCam; uniform float uI;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){
      float f = abs(dot(normalize(vN), normalize(uCam - vW)));
      float a = pow(f, 1.6) * (0.08 + 0.32 * (1.0 - vUv.y)) * uI;
      a *= smoothstep(1.0, 0.86, vUv.y);
      gl_FragColor = vec4(uCol, a);
    }`,
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }
  );
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 0.16, len, 40, 1, true).translate(0, len / 2, 0).rotateX(0), beamMat);
  beam.position.copy(lamp);
  beam.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.clone().normalize());
  // flip v so 0 is at the lamp
  const uv = beam.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  scene.add(beam);
  const lampGlow = new Dots(1, paper, true, 0);
  lampGlow.pos.set([lamp.x, lamp.y, lamp.z]);
  lampGlow.size[0] = 1.6;
  lampGlow.alpha[0] = 0.9;
  lampGlow.flush();
  scene.add(lampGlow.points);
  const specks = new Dots(120, paper, true);
  const sp: number[] = [];
  for (let i = 0; i < specks.n; i++) sp.push(rand(0.05, 0.9), rand(0, 1), rand(0.3, 1));
  scene.add(specks.points);

  const cm = cloud.material as THREE.ShaderMaterial;
  const P = v3(0, 0, 0);
  return {
    scene,
    camera,
    update(t, _dt, px) {
      sky.material.uniforms.uHor.value = screenY(camera, v3(0, 0, -40));
      specks.scale(px, 40);
      lampGlow.scale(px, 40);
      cm.uniforms.uTime.value = t;
      // the lamp is struck, stutters, catches; burns; goes out for a breath
      const c = t % 11;
      const stutter = c < 1.6 ? (Math.sin(c * 40) > 0 ? 1 : 0.2) : 1;
      const on = smooth(1.0, 1.1, c) * (1 - smooth(10.0, 10.7, c)) * stutter;
      const flick = (0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 3.1)) * on;
      cm.uniforms.uOn.value = flick;
      beamMat.uniforms.uI.value = flick;
      lampGlow.alpha[0] = 0.2 + 0.7 * on;
      lampGlow.flush();
      const d = dir.clone().normalize();
      for (let i = 0; i < specks.n; i++) {
        const k = (sp[i * 3] + t * 0.02 * sp[i * 3 + 2]) % 1;
        const a = sp[i * 3 + 1] * Math.PI * 2;
        const r = 0.16 + k * 2.6 * sp[i * 3 + 2];
        P.copy(lamp).addScaledVector(d, k * len);
        P.x += Math.cos(a) * r;
        P.z += Math.sin(a) * r;
        specks.pos.set([P.x, P.y, P.z], i * 3);
        specks.size[i] = 0.05;
        specks.alpha[i] = 0.35 * Math.sin(k * Math.PI) * on;
      }
      specks.flush();
      // the signal coming on
      return bump(c, 0.85, 1.45, 2.6, 3.3);
    },
  };
};

/* ── cap: the shield ───────────────────────────────────────────────────────── */

const cap: Build = (p, env) => {
  const scene = new THREE.Scene();
  scene.environment = env();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.4, 10);
  camera.lookAt(0, 0.1, 0);

  const red = new THREE.MeshStandardMaterial({ color: toColor(v3(0.72, 0.1, 0.13)), metalness: 0.55, roughness: 0.3, side: THREE.DoubleSide });
  const silver = new THREE.MeshStandardMaterial({ color: toColor(v3(0.86, 0.87, 0.9)), metalness: 0.95, roughness: 0.2, side: THREE.DoubleSide });
  const blue = new THREE.MeshStandardMaterial({ color: toColor(p.accent), metalness: 0.5, roughness: 0.32, side: THREE.DoubleSide });

  const Rr = 2.1;
  const dome = (r: number) => 0.42 * (1 - (r / Rr) ** 2);
  const band = (r0: number, r1: number, mat: THREE.Material) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const r = r0 + ((r1 - r0) * i) / 10;
      pts.push(new THREE.Vector2(r, dome(r)));
    }
    return new THREE.Mesh(new THREE.LatheGeometry(pts, 120), mat);
  };
  const shield = new THREE.Group();
  shield.add(band(0.001, 0.82, blue), band(0.82, 1.24, red), band(1.24, 1.66, silver), band(1.66, Rr, red));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(Rr, 0.035, 10, 120).rotateX(Math.PI / 2), silver);
  shield.add(lip);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.27 : 0.68;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i) starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.02, bevelSegments: 2 }).rotateX(-Math.PI / 2),
    silver
  );
  star.position.y = dome(0) - 0.01;
  shield.add(star);

  const holder = new THREE.Group();
  holder.add(shield);
  scene.add(holder);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 5, 6);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.35));

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
    shader(
      { uInk: p.ink },
      /* glsl */ `
      uniform vec3 uInk; varying vec2 vUv;
      void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uInk, 0.22 * (1.0 - smoothstep(0.0, 1.0, d))); }`,
      { transparent: true, depthWrite: false }
    )
  );
  shadow.position.y = -2.7;
  scene.add(shadow);

  // the hit: something rings off it, it kicks back and spins up, sparks fly
  const sparkCol = v3(1, 0.88, 0.66);
  const sparks = new Spray(120, sparkCol, true, -6, 0.9);
  scene.add(sparks.dots.points);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.86, 1, 64),
    new THREE.MeshBasicMaterial({ color: toColor(sparkCol), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  ring.visible = false;
  scene.add(ring);
  const period = 9;
  const hitAt = 4.6;
  const impact = v3(0, 0, 0);
  let spin = 0;
  let hitN = -1;

  return {
    scene,
    camera,
    update(t, dt, px) {
      sparks.dots.scale(px, 30);
      const c = t % period;
      const d = c - hitAt;
      const recoil = d >= 0 ? Math.exp(-d * 4) * Math.cos(d * 11) * smooth(0, 0.035, d) : 0;
      // face the camera, turn about its own axis, and rock so the light runs across it
      holder.rotation.set(Math.PI / 2 - 0.18 + Math.sin(t * 0.5) * 0.32 + recoil * 0.3, Math.sin(t * 0.37) * 0.45, Math.sin(t * 0.23) * 0.12 - recoil * 0.12);
      spin += dt * (0.9 + (d >= 0 ? 5 * Math.exp(-d * 1.6) : 0));
      shield.rotation.y = spin;
      holder.position.y = 0.15 + Math.sin(t * 0.8) * 0.12;
      holder.position.z = -0.7 * recoil;
      key.intensity = 2.2 + (d >= 0 ? 4 * Math.exp(-d * 7) : 0);
      const s = 2.0 + Math.cos(t * 0.5) * 0.15;
      shadow.scale.set(s, 1, s * 0.35);

      const n = Math.floor(t / period);
      if (d >= 0 && hitN !== n) {
        hitN = n;
        impact.set(0.45, holder.position.y + 0.5, 0.55);
        for (let i = 0; i < 70; i++) {
          sparks.emit(impact, v3(rand(-1, 1.2), rand(-0.4, 1.4), rand(0.2, 1)).normalize().multiplyScalar(rand(3, 8)), rand(0.02, 0.05), rand(0.3, 0.8));
        }
        ring.position.copy(impact);
      }
      ring.visible = d >= 0 && d < 0.45;
      if (ring.visible) {
        ring.scale.setScalar(0.15 + d * 6);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - d / 0.45);
      }
      sparks.step(dt, 1);
      return bump(c, hitAt - 0.35, hitAt + 0.05, hitAt + 0.3, hitAt + 0.95);
    },
  };
};

/* ── superman: the S ───────────────────────────────────────────────────────── */

// a polygon with its corners rounded off
const rounded = (pts: number[][], r: number) => {
  const sh = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[i];
    const [ax, ay] = pts[(i + n - 1) % n];
    const [bx, by] = pts[(i + 1) % n];
    const la = Math.hypot(ax - px, ay - py);
    const lb = Math.hypot(bx - px, by - py);
    const s = [px + ((ax - px) / la) * r, py + ((ay - py) / la) * r];
    const e = [px + ((bx - px) / lb) * r, py + ((by - py) / lb) * r];
    if (i) sh.lineTo(s[0], s[1]);
    else sh.moveTo(s[0], s[1]);
    sh.quadraticCurveTo(px, py, e[0], e[1]);
  }
  sh.closePath();
  return sh;
};

const superman: Build = (p, env) => {
  const scene = new THREE.Scene();
  scene.environment = env();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.15, 11);
  camera.lookAt(0, 0.05, 0);

  const sun = backdrop(
    { uSun: v3(1.0, 0.8, 0.36), uAt: new THREE.Vector2(0.5, 0.53), uTime: 0, uDark: p.dark ? 1 : 0, uFlare: 0 },
    /* glsl */ `
    uniform vec3 uSun; uniform vec2 uAt; uniform float uTime, uDark, uFlare;
    varying vec2 vUv;
    void main(){
      vec2 q = vUv - uAt;
      float d = length(q);
      float rays = pow(0.5 + 0.5 * sin(atan(q.y, q.x) * 12.0 + uTime * 0.15), 6.0) * exp(-d * (2.6 - uFlare * 0.8));
      float a = exp(-d * (3.4 - uFlare * 0.9)) * (0.55 + 0.25 * uFlare) + rays * (0.14 + 0.2 * uFlare);
      gl_FragColor = vec4(uSun, min(a * (uDark > 0.5 ? 0.6 : 1.0), 1.0));
    }`
  );
  scene.add(sun);

  const gold = new THREE.MeshStandardMaterial({ color: toColor(v3(1.0, 0.74, 0.22)), metalness: 1, roughness: 0.26 });
  const red = new THREE.MeshStandardMaterial({ color: toColor(v3(0.74, 0.05, 0.07)), metalness: 0.45, roughness: 0.32 });
  const outline = (s: number) =>
    rounded(
      [
        [-1.2 * s, 1.1 * s],
        [1.2 * s, 1.1 * s],
        [1.95 * s, 0.42 * s],
        [0, -1.8 * s],
        [-1.95 * s, 0.42 * s],
      ],
      0.16 * s
    );

  const holder = new THREE.Group();
  const shield = new THREE.Group();
  holder.add(shield);
  scene.add(holder);

  // a raised gold frame around a red field
  const frame = outline(1);
  frame.holes.push(new THREE.Path(outline(0.86).getPoints(12).reverse()));
  shield.add(new THREE.Mesh(new THREE.ExtrudeGeometry(frame, { depth: 0.3, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 12 }).translate(0, 0, -0.15), gold));
  shield.add(new THREE.Mesh(new THREE.ExtrudeGeometry(outline(0.88), { depth: 0.18, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 12 }).translate(0, 0, -0.09), red));

  // the S: one brush stroke, thick through the middle and thin at the ends
  const spine = new THREE.CatmullRomCurve3(
    [
      [0.98, 0.6],
      [0.15, 0.74],
      [-0.72, 0.52],
      [-0.66, 0.12],
      [0.0, -0.06],
      [0.62, -0.3],
      [0.5, -0.74],
      [-0.12, -0.92],
      [-0.6, -0.66],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    'centripetal'
  );
  const N = 90;
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const pt = spine.getPointAt(u);
    const tg = spine.getTangentAt(u);
    const w = 0.035 + 0.13 * Math.pow(Math.sin(Math.PI * u), 0.8);
    left.push(new THREE.Vector2(pt.x - tg.y * w, pt.y + tg.x * w));
    right.push(new THREE.Vector2(pt.x + tg.y * w, pt.y - tg.x * w));
  }
  const sShape = new THREE.Shape([...left, ...right.reverse()]);
  const sGeo = new THREE.ExtrudeGeometry(sShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 4 });
  const sFront = new THREE.Mesh(sGeo, gold);
  sFront.position.z = 0.1;
  const sBack = new THREE.Mesh(sGeo, gold);
  sBack.rotation.y = Math.PI;
  sBack.position.z = -0.1;
  shield.add(sFront, sBack);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-3, 4, 6);
  const rim = new THREE.DirectionalLight(0xffe2b0, 1.6);
  rim.position.set(4, 1, -3);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.3));

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
    shader(
      { uInk: p.ink, uA: p.dark ? 0.0 : 0.16 },
      /* glsl */ `
      uniform vec3 uInk; uniform float uA; varying vec2 vUv;
      void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uInk, uA * (1.0 - smoothstep(0.0, 1.0, d))); }`,
      { transparent: true, depthWrite: false }
    )
  );
  shadow.position.y = -2.55;
  scene.add(shadow);

  return {
    scene,
    camera,
    update(t) {
      sun.material.uniforms.uTime.value = t;
      // a slow full turn, easing through the face so it rests there a moment
      const turn = t * 0.42;
      shield.rotation.y = turn - 0.5 * Math.sin(turn * 2) * 0.55;
      holder.rotation.x = Math.sin(t * 0.5) * 0.1;
      holder.rotation.z = Math.sin(t * 0.37) * 0.05;
      holder.position.y = 0.1 + Math.sin(t * 0.8) * 0.1;
      const face = Math.abs(Math.cos(shield.rotation.y));
      const s = 1.7 + face * 0.3;
      shadow.scale.set(s, 1, 0.35);
      // the S flares as it comes round to face you
      const flare = smooth(0.95, 0.998, face);
      sun.material.uniforms.uFlare.value = flare;
      rim.intensity = 1.6 + flare * 1.2;
      return flare;
    },
  };
};

/* ── thorfinn: vinland ─────────────────────────────────────────────────────── */

const thorfinn: Build = (p) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  camera.position.set(0, 1.55, 9);
  camera.lookAt(0, 1.0, -10);

  const paper = mixV(p.bg, v3(1, 1, 1), 0.35);
  const wheat = v3(0.8, 0.62, 0.3);
  const sunCol = v3(1.0, 0.82, 0.5);
  const sky = backdrop(
    { uPaper: paper, uSun: sunCol, uAccent: p.accent, uInk: p.ink, uAt: new THREE.Vector2(0.65, 0.45), uHor: 0.4, uA: 1 },
    /* glsl */ `
    uniform vec3 uPaper, uSun, uAccent, uInk; uniform vec2 uAt; uniform float uHor, uA;
    varying vec2 vUv;
    void main(){
      float d = length(vUv - uAt);
      vec3 col = mix(uPaper, uSun, exp(-d * 4.0) * 0.45 * uA);
      col = mix(col, uAccent, smoothstep(0.35, 0.0, vUv.y - uHor) * 0.05);
      float disc = smoothstep(0.062, 0.056, d) * uA;
      col = mix(col, mix(uSun, vec3(1.0, 0.95, 0.86), 0.35), disc);
      col = mix(col, uInk, smoothstep(0.004, 0.0, abs(d - 0.062)) * 0.5 * uA);
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  // the sea, a strip of it beyond the field
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 260).rotateX(-Math.PI / 2).translate(0, -0.02, -150),
    shader(
      { uPaper: paper, uAccent: p.accent, uInk: p.ink, uSun: sunCol, uTime: 0, uSunX: 0 },
      /* glsl */ `
      ${NOISE}
      uniform vec3 uPaper, uAccent, uInk, uSun; uniform float uTime, uSunX;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        float lines = smoothstep(0.44, 0.49, abs(fract(vW.z * 0.25 + snoise(vec3(vW.xz * 0.05, uTime * 0.1)) * 0.6) - 0.5));
        float glint = exp(-abs(vW.x - uSunX) * 0.12) * (0.5 + 0.5 * snoise(vec3(vW.xz * 0.3, uTime * 0.6)));
        vec3 col = mix(uPaper, uAccent, 0.2);
        col = mix(col, uInk, lines * 0.18);
        col = mix(col, uSun, glint * 0.35);
        gl_FragColor = vec4(col, 1.0);
      }`
    )
  );
  scene.add(sea);

  // the field: furrows running out to the sea
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 34, 160, 50).rotateX(-Math.PI / 2).translate(0, 0, -8),
    new THREE.ShaderMaterial({
      uniforms: { uPaper: { value: paper }, uInk: { value: p.ink }, uWheat: { value: wheat }, uCam: { value: camera.position } },
      vertexShader: /* glsl */ `
        varying vec3 vW; varying float vR;
        void main(){
          vec3 pos = position;
          float r = 1.0 - abs(sin(pos.x * 3.14159 * 0.9));
          pos.y += r * 0.09 * smoothstep(-25.0, 4.0, pos.z);
          vR = r;
          vec4 w = modelMatrix * vec4(pos, 1.0); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uPaper, uInk, uWheat, uCam;
        varying vec3 vW; varying float vR;
        void main(){
          float d = length(vW - uCam);
          float trough = smoothstep(0.12, 0.0, vR) * (1.0 - smoothstep(8.0, 30.0, d));
          vec3 soil = mix(uPaper, uWheat, 0.18);
          vec3 col = mix(soil, uInk, trough * 0.22 + (1.0 - vR) * 0.025);
          col = mix(col, uPaper, smoothstep(14.0, 26.0, d) * 0.5);
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  scene.add(field);

  // wheat, close, swaying in long gusts
  const wheatMat = (head: boolean) =>
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCol: { value: head ? wheat : mixV(wheat, p.ink, 0.25) }, uInk: { value: p.ink }, uH: { value: 1.1 } },
      vertexShader: /* glsl */ `
        uniform float uTime, uH;
        varying float vY; varying float vShade;
        void main(){
          vec3 o = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec4 lp = instanceMatrix * vec4(position, 1.0);
          float h = max(lp.y - o.y, 0.0);
          float gust = 0.5 + 0.5 * sin(o.x * 0.5 + o.z * 0.25 - uTime * 1.6);
          float bend = (0.08 + 0.32 * gust * gust) * pow(h / uH, 2.0);
          lp.x += bend + sin(uTime * 3.1 + o.x * 4.0 + o.z) * 0.02 * h;
          lp.y -= bend * bend * 0.4;
          vY = h / uH;
          vShade = 0.85 + 0.15 * gust;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * lp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCol, uInk;
        varying float vY; varying float vShade;
        void main(){
          vec3 col = mix(mix(uCol, uInk, 0.35), uCol, smoothstep(0.0, 0.8, vY)) * vShade;
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.DoubleSide,
    });
  const stalkMat = wheatMat(false);
  const headMat = wheatMat(true);
  const COUNT = 420;
  const stalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.014, 1.1, 3, 6).translate(0, 0.55, 0), stalkMat, COUNT);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6).scale(0.05, 0.19, 0.05).translate(0, 1.12, 0), headMat, COUNT);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < COUNT; i++) {
    const rightSide = i % 3 !== 0;
    const z = rand(2.4, 7.4);
    const x = rightSide ? rand(0.5, 2.2 + (z - 2.4) * 0.6) : rand(-2.2 - (z - 2.4) * 0.6, -1.4);
    dummy.position.set(x, -0.05, z);
    dummy.rotation.set(rand(-0.06, 0.06), rand(0, Math.PI), rand(-0.08, 0.08));
    dummy.scale.setScalar(rand(0.85, 1.3));
    dummy.updateMatrix();
    stalks.setMatrixAt(i, dummy.matrix);
    heads.setMatrixAt(i, dummy.matrix);
  }
  stalks.frustumCulled = heads.frustumCulled = false;
  scene.add(stalks, heads);

  // a longship, far out
  const ship = new THREE.Group();
  const hull = new THREE.Shape();
  hull.moveTo(-1.3, 0.35);
  hull.quadraticCurveTo(-1.1, -0.05, -0.6, -0.1);
  hull.lineTo(0.6, -0.1);
  hull.quadraticCurveTo(1.1, -0.05, 1.3, 0.35);
  hull.lineTo(1.0, 0.12);
  hull.lineTo(-1.0, 0.12);
  hull.closePath();
  const inkMat = new THREE.MeshBasicMaterial({ color: toColor(mixV(p.ink, paper, 0.25)), side: THREE.DoubleSide });
  ship.add(new THREE.Mesh(new THREE.ShapeGeometry(hull), inkMat));
  const mast = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 1.2), inkMat);
  mast.position.set(0, 0.68, 0);
  const sail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.7),
    shader(
      { uInk: p.ink, uAccent: p.accent, uPaper: paper },
      /* glsl */ `
      uniform vec3 uInk, uAccent, uPaper; varying vec2 vUv;
      void main(){
        vec3 col = mix(uPaper, uAccent, step(0.5, fract(vUv.x * 3.0)));
        float edge = 1.0 - smoothstep(0.0, 0.05, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
        gl_FragColor = vec4(mix(col, uInk, edge * 0.7), 1.0);
      }`,
      { side: THREE.DoubleSide }
    )
  );
  sail.position.set(0, 0.8, 0.01);
  ship.add(mast, sail);
  ship.position.set(-7, 0.02, -46);
  scene.add(ship);

  // gulls
  const gullN = 3;
  const gullPos = new Float32Array(gullN * 12);
  const gulls = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(gullPos, 3).setUsage(THREE.DynamicDrawUsage)),
    new THREE.LineBasicMaterial({ color: toColor(p.ink) })
  );
  gulls.frustumCulled = false;
  scene.add(gulls);

  const sm = sea.material as THREE.ShaderMaterial;
  const sunWorld = v3(0, 0, 0);
  return {
    scene,
    camera,
    update(t) {
      stalkMat.uniforms.uTime.value = t;
      headMat.uniforms.uTime.value = t;
      sm.uniforms.uTime.value = t;
      // the sun comes up out of the sea, slowly, and comes up again
      const u = (t % 30) / 30;
      sunWorld.set(9, -2 + u * 16, -150);
      sky.material.uniforms.uAt.value = screenXY(camera, sunWorld);
      sky.material.uniforms.uA.value = smooth(0, 0.05, u) * (1 - smooth(0.92, 1, u));
      sky.material.uniforms.uHor.value = screenY(camera, v3(0, 0, -150));
      sm.uniforms.uSunX.value = 9;
      ship.position.x = -9 + ((t * 0.12) % 18);
      ship.position.y = 0.02 + Math.sin(t * 0.9) * 0.03;
      for (let i = 0; i < gullN; i++) {
        const x = -3 + i * 1.8 + Math.sin(t * 0.2 + i) * 0.8;
        const y = 4.2 + i * 0.35 + Math.sin(t * 0.5 + i * 2) * 0.2;
        const z = -4 - i * 3;
        const f = Math.sin(t * 5 + i * 1.7) * 0.16;
        gullPos.set([x - 0.3, y + f, z, x, y - 0.06, z, x, y - 0.06, z, x + 0.3, y + f, z], i * 12);
      }
      gulls.geometry.attributes.position.needsUpdate = true;
      // the sun clearing the sea
      return bump(u * 30, 3.0, 3.8, 6.0, 6.8);
    },
  };
};

/* ── gojo: unlimited void ──────────────────────────────────────────────────── */

// the hand sign on a tall strip: index and middle crossed, ring and little finger
// folded under the thumb, the palm toward you, a dark sleeve down to the bottom.
// It is laid on a plane 2.85 units wide; the fingertips sit HAND_TIP px from the top.
const HAND_W = 448;
const HAND_H = 1792;
const HAND_TIP = 85;
const handTexture = () => {
  const c = document.createElement('canvas');
  c.width = HAND_W;
  c.height = HAND_H;
  const g = c.getContext('2d')!;
  // the hand on its own layer, so its shading stays on the skin
  const hc = document.createElement('canvas');
  hc.width = HAND_W;
  hc.height = 720;
  const h = hc.getContext('2d')!;
  h.lineCap = 'round';
  h.lineJoin = 'round';
  const skin = '#e9ab88';
  const ink = '#3a1810';
  const X = HAND_W / 2;
  const PT = 250; // the top of the palm

  type Part = { path: () => void; w: number; clip?: [number, number, number, number] };
  const stroke = (pts: number[]) => () => {
    h.beginPath();
    h.moveTo(pts[0], pts[1]);
    if (pts.length === 4) h.lineTo(pts[2], pts[3]);
    else h.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
  };
  const palm: Part = {
    w: 0,
    path: () => {
      h.beginPath();
      h.moveTo(X - 66, PT + 6);
      h.quadraticCurveTo(X - 10, PT - 8, X + 52, PT + 2);
      h.quadraticCurveTo(X + 74, PT + 40, X + 70, PT + 92);
      h.quadraticCurveTo(X + 62, PT + 128, X + 46, PT + 150);
      h.lineTo(X - 50, PT + 150);
      h.quadraticCurveTo(X - 76, PT + 80, X - 66, PT + 6);
      h.closePath();
    },
  };
  const IDX = [X + 26, PT + 8, X + 6, PT - 74, X - 30, PT - 158];
  const MID = [X - 18, PT + 4, X + 4, PT - 84, X + 46, PT - 166];
  const wrist: Part = { w: 92, path: stroke([X - 2, PT + 120, X, PT + 300]) };
  const index: Part = { w: 29, path: stroke(IDX) };
  const middle: Part = { w: 31, path: stroke(MID), clip: [0, 0, HAND_W, PT - 6] };
  const ring: Part = { w: 29, path: stroke([X - 40, PT + 6, X - 58, PT + 36, X - 34, PT + 60]) };
  const pinky: Part = { w: 25, path: stroke([X - 64, PT + 20, X - 80, PT + 48, X - 58, PT + 70]) };
  const thumb: Part = { w: 33, path: stroke([X + 60, PT + 118, X + 34, PT + 70, X - 30, PT + 64]), clip: [0, 0, X + 44, HAND_H] };

  const outline = (p: Part) => {
    p.path();
    h.strokeStyle = ink;
    if (p.w) {
      h.lineWidth = p.w + 7;
      h.stroke();
    } else {
      h.lineWidth = 7;
      h.stroke();
    }
  };
  const fill = (p: Part) => {
    p.path();
    if (p.w) {
      h.strokeStyle = skin;
      h.lineWidth = p.w;
      h.stroke();
    } else {
      h.fillStyle = skin;
      h.fill();
    }
  };
  const all = [wrist, palm, index, middle, ring, pinky, thumb];
  // one silhouette with one border, then the parts that lie in front drawn again over it
  all.forEach(outline);
  all.forEach(fill);
  for (const p of [ring, pinky, thumb, middle]) {
    h.save();
    if (p.clip) {
      h.beginPath();
      h.rect(...p.clip);
      h.clip();
    }
    outline(p);
    fill(p);
    h.restore();
  }
  // joint creases across the raised fingers, where they show
  h.strokeStyle = 'rgba(58,24,16,0.7)';
  h.lineWidth = 2.5;
  const crease = (b: number[], t: number, half: number) => {
    const u = 1 - t;
    const x = u * u * b[0] + 2 * u * t * b[2] + t * t * b[4];
    const y = u * u * b[1] + 2 * u * t * b[3] + t * t * b[5];
    const tx = 2 * u * (b[2] - b[0]) + 2 * t * (b[4] - b[2]);
    const ty = 2 * u * (b[3] - b[1]) + 2 * t * (b[5] - b[3]);
    const l = Math.hypot(tx, ty);
    const nx = -ty / l;
    const ny = tx / l;
    h.beginPath();
    h.moveTo(x - nx * half, y - ny * half);
    h.quadraticCurveTo(x + (tx / l) * 3, y + (ty / l) * 3, x + nx * half, y + ny * half);
    h.stroke();
  };
  crease(IDX, 0.66, 8);
  crease(IDX, 0.86, 7);
  crease(MID, 0.64, 9);
  crease(MID, 0.84, 8);

  // light: warm from below, falling off up the fingers, shadow down the far side
  h.globalCompositeOperation = 'source-atop';
  let gr = h.createLinearGradient(0, PT + 200, 0, PT - 170);
  gr.addColorStop(0, 'rgba(255,160,80,0.7)');
  gr.addColorStop(0.45, 'rgba(255,150,70,0.2)');
  gr.addColorStop(1, 'rgba(255,150,70,0)');
  h.fillStyle = gr;
  h.fillRect(0, 0, HAND_W, 720);
  gr = h.createLinearGradient(0, PT - 175, 0, PT - 30);
  gr.addColorStop(0, 'rgba(40,14,12,0.5)');
  gr.addColorStop(1, 'rgba(40,14,12,0)');
  h.fillStyle = gr;
  h.fillRect(0, 0, HAND_W, 720);
  gr = h.createLinearGradient(X - 95, 0, X + 20, 0);
  gr.addColorStop(0, 'rgba(60,20,12,0.6)');
  gr.addColorStop(1, 'rgba(60,20,12,0)');
  h.fillStyle = gr;
  h.fillRect(0, 0, HAND_W, 720);
  const hi = h.createRadialGradient(X + 20, PT + 110, 4, X + 20, PT + 110, 90);
  hi.addColorStop(0, 'rgba(255,215,170,0.45)');
  hi.addColorStop(1, 'rgba(255,215,170,0)');
  h.fillStyle = hi;
  h.fillRect(0, 0, HAND_W, 720);

  g.drawImage(hc, 0, 0);

  // the sleeve, its cuff over the wrist
  const y0 = PT + 212;
  g.beginPath();
  g.moveTo(X - 74, y0 + 4);
  g.quadraticCurveTo(X, y0 + 22, X + 74, y0 - 4);
  g.quadraticCurveTo(X + 110, y0 + 420, X + 190, HAND_H);
  g.lineTo(X - 190, HAND_H);
  g.quadraticCurveTo(X - 120, y0 + 400, X - 74, y0 + 4);
  g.closePath();
  const sg = g.createLinearGradient(0, y0, 0, y0 + 900);
  sg.addColorStop(0, '#2a2532');
  sg.addColorStop(0.25, '#16131c');
  sg.addColorStop(1, '#0a090d');
  g.fillStyle = sg;
  g.fill();
  g.strokeStyle = '#06050a';
  g.lineWidth = 5;
  g.stroke();
  // cuff seam and a few folds
  g.strokeStyle = 'rgba(120,104,128,0.45)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(X - 78, y0 + 46);
  g.quadraticCurveTo(X, y0 + 66, X + 80, y0 + 38);
  g.stroke();
  g.strokeStyle = 'rgba(110,92,110,0.28)';
  [
    [X - 40, y0 + 120, X - 20, y0 + 260, X - 50, y0 + 420],
    [X + 46, y0 + 90, X + 30, y0 + 220, X + 70, y0 + 380],
    [X - 70, y0 + 300, X - 90, y0 + 520, X - 110, y0 + 700],
  ].forEach(([a, b, cx, cy, d, e]) => {
    g.beginPath();
    g.moveTo(a, b);
    g.quadraticCurveTo(cx, cy, d, e);
    g.stroke();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
};

const gojo: Build = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 11);
  camera.lookAt(0, 0, 0);

  // the void stays dark on both sides of the theme
  const sky = backdrop(
    { uTime: 0, uWarm: 0, uDom: 0, uR: 0, uRing: 0, uFlash: 0, uAt: new THREE.Vector2(0.5, 0.6) },
    /* glsl */ `
    ${NOISE}
    uniform float uTime, uWarm, uDom, uR, uRing, uFlash; uniform vec2 uAt;
    varying vec2 vUv;
    // infinite space: light rushing out of the hand, stars flying past
    vec3 space(vec2 q, float r){
      float a = atan(q.y, q.x);
      vec3 col = vec3(0.012, 0.018, 0.06);
      col += vec3(0.25, 0.55, 1.0) * exp(-r * 3.5) * 0.5;
      col += vec3(0.5, 0.3, 1.0) * exp(-r * 1.3) * 0.1;
      for (int L = 0; L < 2; L++) {
        float fl = float(L);
        float n = mix(150.0, 64.0, fl);
        float u = (a / 6.28318 + 0.5) * n;
        float id = floor(u);
        float f = fract(u) - 0.5;
        float h1 = hash12(vec2(id, 3.0 + fl * 11.0));
        float h2 = hash12(vec2(id, 7.0 + fl * 5.0));
        float z = log(r + 0.03) * (1.4 + h2) - uTime * (0.8 + 1.8 * h1) + h2 * 17.0;
        float seg = fract(z);
        float dash = smoothstep(0.0, 0.03, seg) * smoothstep(0.5, 0.04, seg);
        float arc = abs(f) / n * 6.28318 * r;
        float line = smoothstep(0.003 + 0.003 * r, 0.0, arc);
        vec3 c = mix(vec3(0.55, 0.85, 1.0), vec3(0.85, 0.78, 1.0), h2);
        col += c * dash * line * step(0.45, h1) * smoothstep(0.02, 0.3, r) * (0.7 + r) * mix(0.9, 1.4, fl);
      }
      for (int L = 0; L < 3; L++) {
        float fl = float(L);
        float depth = fract(uTime * 0.2 + fl / 3.0);
        vec2 g = q * mix(24.0, 2.5, depth) + fl * 17.3;
        vec2 gi = floor(g);
        vec2 o = vec2(hash12(gi + 5.3), hash12(gi + 9.1)) - 0.5;
        float d = length(fract(g) - 0.5 - o * 0.6);
        float st = smoothstep(0.07 + 0.06 * depth, 0.0, d) * step(0.78, hash12(gi + fl * 31.0));
        col += vec3(0.8, 0.9, 1.0) * st * smoothstep(0.0, 0.3, depth) * smoothstep(1.0, 0.7, depth) * 1.3;
      }
      return col;
    }
    void main(){
      vec3 col = vec3(0.006, 0.006, 0.01);
      // a warm glow low in the frame, smoke moving through it
      float low = exp(-max(vUv.y + 0.05, 0.0) * 3.2) * exp(-abs(vUv.x - 0.5) * 1.2) * uWarm;
      if (low > 0.004) {
        float sm = snoise(vec3(vUv * vec2(2.2, 3.0) - vec2(0.0, uTime * 0.1), uTime * 0.05)) * 0.5 + 0.5;
        sm += 0.5 * snoise(vec3(vUv * vec2(4.6, 6.0) - vec2(0.0, uTime * 0.18), 3.0));
        col += vec3(1.0, 0.36, 0.08) * low * (0.3 + 0.45 * clamp(sm, 0.0, 1.4));
      }
      vec2 q = vUv - uAt;
      float r = length(q);
      if (uDom > 0.001) {
        float inside = smoothstep(uR + 0.01, uR - 0.04, r) * uDom;
        if (inside > 0.0) col = mix(col, space(q, r), inside);
      }
      float rd = abs(r - uR);
      col += vec3(0.7, 0.9, 1.0) * (smoothstep(0.014, 0.0, rd) + exp(-rd * 22.0) * 0.4) * uRing;
      col += vec3(0.75, 0.9, 1.0) * exp(-r * 5.0) * uFlash;
      gl_FragColor = vec4(col, 1.0);
    }`
  );
  scene.add(sky);

  // the six eyes: lids, white lashes, a faceted iris that shimmers, a dark pupil
  const eyeMat = (flip: number) =>
    shader(
      { uOpen: 0, uIgnite: 0, uFlare: 0, uTime: 0, uFlip: flip },
      /* glsl */ `
      ${NOISE}
      uniform float uOpen, uIgnite, uFlare, uTime, uFlip;
      varying vec2 vUv;
      void main(){
        // eye units: x runs -1 at the outer corner to 1 at the inner one
        vec2 p = (vUv - 0.5) * vec2(2.9, 2.0);
        p.x *= uFlip;
        float s = clamp((p.x + 1.0) * 0.5, 0.0, 1.0);
        float sn = sin(3.14159 * s);
        float base = mix(0.12, -0.12, s);
        float shut = base - 0.05 * sn;
        float U = mix(shut, base + 0.5 * pow(sn, 0.5) * (1.0 - 0.28 * s), uOpen);
        float L = mix(shut, base - 0.4 * pow(sn, 0.8) * (0.8 + 0.2 * s), uOpen);
        float aa = fwidth(p.y) * 1.2;
        float inX = step(abs(p.x), 1.0);
        float inside = inX * smoothstep(-aa, aa, U - p.y) * smoothstep(-aa, aa, p.y - L);

        // the white, warm and shaded under the lid
        vec3 white = vec3(0.98, 0.85, 0.78) * mix(0.45, 1.0, uIgnite);
        white *= mix(0.42, 1.0, smoothstep(0.0, 0.24, U - p.y));
        white *= mix(0.6, 1.0, smoothstep(1.0, 0.55, abs(p.x)));

        // the iris
        vec2 ip = p - vec2(0.03, -0.03);
        float ri = 0.48;
        float ir = length(ip) / ri;
        float ia = atan(ip.y, ip.x);
        float ra = fwidth(ir) * 1.5;
        vec3 iris = vec3(0.0);
        // only where the iris is, which keeps the cell search off most of the plane
        if (ir < 1.08) {
        vec2 vp = ip / ri * 4.2;
        vec2 gi = floor(vp);
        vec2 gf = fract(vp);
        float d1 = 8.0, d2 = 8.0, cid = 0.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 o = vec2(float(i), float(j));
          vec2 hh = vec2(hash12(gi + o), hash12(gi + o + 17.0));
          vec2 pt = o + 0.5 + 0.38 * sin(uTime * 0.5 + 6.28 * hh);
          float d = length(pt - gf);
          if (d < d1) { d2 = d1; d1 = d; cid = hh.x; } else if (d < d2) d2 = d;
        }
        float edge = d2 - d1;
        float facet = 0.5 + 0.5 * sin(cid * 40.0 + uTime * 2.4);
        vec3 deep = vec3(0.02, 0.2, 0.68);
        vec3 sky = vec3(0.22, 0.7, 1.0);
        vec3 ice = vec3(0.8, 0.97, 1.0);
        iris = mix(sky, deep, smoothstep(0.5, 1.0, ir));
        iris = mix(iris, ice, smoothstep(0.85, 0.35, ir) * facet * 0.6);
        iris += ice * smoothstep(0.07, 0.0, edge) * 0.4 * smoothstep(1.0, 0.45, ir);
        iris *= 0.85 + 0.15 * sin(ia * 23.0 + ir * 4.0);
        iris = mix(iris, vec3(0.0, 0.06, 0.28), smoothstep(0.84, 0.99, ir));
        float pr = 0.34 + 0.035 * sin(ia * 5.0 + 1.3) + 0.02 * sin(ia * 9.0 - uTime) - uFlare * 0.07;
        iris = mix(iris, vec3(0.01, 0.035, 0.14), smoothstep(pr + 0.05, pr - 0.02, ir));
        iris *= mix(0.1, 1.0, uIgnite) * (1.0 + 0.7 * uFlare);
        iris += vec3(1.0) * smoothstep(0.14, 0.08, length(ip / ri - vec2(-0.3, 0.36))) * 0.8 * uIgnite;
        }
        vec3 eye = mix(white, iris, smoothstep(1.0 + ra, 1.0 - ra, ir));
        eye *= mix(0.5, 1.0, smoothstep(0.0, 0.14, U - p.y));

        // lashes: a white line along the lid, two uneven combs of spikes raking outward
        float dy = p.y - U;
        float lash = 0.0;
        float shade = 0.0;
        for (int k = 0; k < 2; k++) {
          float fk = float(k);
          float x0 = p.x + dy * mix(1.0, 1.7, fk);
          float q = x0 * mix(6.5, 10.0, fk) + fk * 0.37;
          float id = floor(q);
          float f = abs(fract(q) - 0.5);
          float s0 = clamp((x0 + 1.0) * 0.5, 0.0, 1.0);
          float hL = mix(0.42, 0.07, s0) * mix(1.0, 0.65, fk) * (0.4 + 0.6 * hash12(vec2(id, 4.0 + fk))) * (0.5 + 0.5 * uOpen);
          float taper = 1.0 - clamp(dy / hL, 0.0, 1.0);
          float qa = fwidth(q);
          float sp = smoothstep(0.5 * taper + qa, 0.5 * taper - qa, f) * step(0.0, dy) * step(dy, hL) * step(-1.04, x0) * step(x0, 0.92);
          shade = max(shade, sp * (1.0 - taper));
          lash = max(lash, sp);
        }
        float th = mix(0.065, 0.02, s);
        lash = max(lash, smoothstep(th + aa, th - aa, dy) * step(-0.02, dy) * inX);
        vec3 lashCol = mix(vec3(0.62, 0.65, 0.74), vec3(0.97, 0.98, 1.0), smoothstep(0.0, 0.6, shade + smoothstep(0.0, th, dy) * 0.3)) * mix(0.4, 1.0, uIgnite);
        float lower = smoothstep(0.022 + aa, 0.022 - aa, L - p.y) * step(0.0, L - p.y) * step(abs(p.x + 0.1), 0.85) * uOpen;

        vec3 col = mix(eye, lashCol, lash);
        float a = max(inside, lash);
        col = mix(col, vec3(0.45, 0.42, 0.48), lower * (1.0 - inside));
        a = max(a, lower * 0.8);
        // the glow they throw on the dark, added on (premultiplied), gone by the plane's edge
        vec2 e = abs(vUv - 0.5) * 2.0;
        float glow = exp(-length(ip) * (2.6 - uFlare)) * uIgnite * (0.3 + 0.5 * uFlare) * smoothstep(1.0, 0.7, max(e.x, e.y));
        gl_FragColor = vec4(col * a + vec3(0.25, 0.62, 1.0) * glow * (1.0 - a), a);
      }`,
      { transparent: true, depthWrite: false, premultipliedAlpha: true }
    );
  const eyes = [-1, 1].map((side) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.0), eyeMat(-side));
    m.position.set(side * 2.15, 0.35, 0);
    scene.add(m);
    return m.material as THREE.ShaderMaterial;
  });

  // the hand, lit from below, rimmed warm in the dark and cold in the void
  const handTex = handTexture();
  const handW = 2.85;
  const handH = handW * (HAND_H / HAND_W);
  const handMat = shader(
    { uMap: handTex, uTexel: new THREE.Vector2(1 / HAND_W, 1 / HAND_H), uDom: 0, uLit: 1 },
    /* glsl */ `
    uniform sampler2D uMap; uniform vec2 uTexel; uniform float uDom, uLit;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(uMap, vUv);
      if (c.a < 0.01) discard;
      vec2 o = uTexel * 7.0;
      float n = texture2D(uMap, vUv + vec2(o.x, 0.0)).a + texture2D(uMap, vUv - vec2(o.x, 0.0)).a
              + texture2D(uMap, vUv + vec2(0.0, o.y)).a + texture2D(uMap, vUv - vec2(0.0, o.y)).a;
      float rim = clamp(1.0 - n * 0.25, 0.0, 1.0);
      // the rim is warmer low down, where the glow is
      float low = smoothstep(0.75, 0.2, vUv.y);
      vec3 rimCol = mix(vec3(1.0, 0.55, 0.25) * (0.5 + 0.8 * low), vec3(0.65, 0.88, 1.0) * 1.3, uDom);
      // graded into the dark: the shadows deepen and cool, the warm under-light stays
      vec3 skin = c.rgb * uLit;
      skin = mix(skin * vec3(0.46, 0.38, 0.4), skin, 0.25 + 0.6 * low);
      vec3 col = skin * (1.0 - 0.45 * uDom) + rimCol * rim * 0.9;
      gl_FragColor = vec4(col, c.a);
    }`,
    { transparent: true }
  );
  const hand = new THREE.Mesh(new THREE.PlaneGeometry(handW, handH), handMat);
  const handG = new THREE.Group();
  // the group's origin is at the fingertips; drawn after the eyes' glow, before the embers
  hand.position.y = -handH / 2 + (HAND_TIP / HAND_H) * handH;
  hand.renderOrder = 1;
  handG.add(hand);
  scene.add(handG);
  const tipRest = 1.0;

  // embers drifting up through the dark
  const EN = 150;
  const embers = new Dots(EN, v3(1.0, 0.5, 0.16), true, 0.12);
  const E = Array.from({ length: EN }, () => ({ x: rand(-4.5, 4.5), y: rand(-8, 6.5), z: rand(-3, 4.5), v: rand(0.25, 0.8), ph: rand(0, 7), s: rand(0.02, 0.065) }));
  embers.points.renderOrder = 2;
  scene.add(embers.points);

  const period = 11.5;
  const tip = v3(0, 0, 0);
  return {
    scene,
    camera,
    update(t, dt, px) {
      embers.scale(px, 34);
      const c = t % period;
      const open = smooth(0.7, 1.7, c) * (1 - smooth(10.3, 11.1, c));
      const ignite = smooth(1.1, 2.0, c) * (1 - smooth(10.1, 10.9, c)) * (c < 1.9 ? 0.7 + 0.3 * Math.sin(c * 57) : 1);
      const k = Math.min(1, Math.max(0, (c - 2.3) / 1.7));
      const rise = (1 - Math.pow(1 - k, 3)) * (1 - smooth(9.0, 10.5, c));
      const dom = smooth(4.55, 4.95, c) * (1 - smooth(7.9, 9.0, c));
      const kr = Math.min(1, Math.max(0, (c - 4.55) / 1.7));
      const flare = bump(c, 4.5, 5.0, 7.6, 8.7);
      const push = bump(c, 4.55, 4.7, 5.0, 5.9);

      // the hand comes up into frame and sets the sign
      handG.position.set(0, tipRest - 10 * (1 - rise), 0);
      handG.rotation.z = Math.sin(t * 0.6) * 0.015 + (1 - rise) * 0.08;
      handG.scale.setScalar(1 + 0.05 * bump(c, 4.2, 4.5, 4.6, 5.3));
      handMat.uniforms.uDom.value = dom;
      handMat.uniforms.uLit.value = 0.75 + 0.25 * rise;

      camera.position.z = 11 - 0.4 * dom;
      camera.updateMatrixWorld();
      tip.set(0, handG.position.y - 0.5, 0);
      const u = sky.material.uniforms;
      u.uTime.value = t;
      u.uAt.value = screenXY(camera, tip);
      u.uWarm.value = 0.35 + 0.65 * rise;
      u.uDom.value = dom;
      // the ring opens out of the sign, slow then rushing, and is off the card by ~6.2
      u.uR.value = 2.4 * Math.pow(kr, 1.5);
      u.uRing.value = smooth(4.55, 4.65, c) * (1 - smooth(5.8, 6.3, c));
      u.uFlash.value = bump(c, 4.5, 4.6, 4.65, 5.3) * 0.9;

      eyes.forEach((m) => {
        m.uniforms.uOpen.value = open;
        m.uniforms.uIgnite.value = ignite;
        m.uniforms.uFlare.value = flare;
        m.uniforms.uTime.value = t;
      });

      for (let i = 0; i < EN; i++) {
        const e = E[i];
        e.y += dt * e.v;
        if (push > 0) {
          e.x += dt * e.x * 3 * push;
          e.y += dt * (e.y - tipRest) * 3 * push;
        }
        if (e.y > 6.5 || e.y < -9 || Math.abs(e.x) > 7) {
          // the ones the blast threw out come back anywhere, under cover of the light
          e.y = push > 0 ? rand(-8, 6) : rand(-8.5, -7);
          e.x = rand(-4.5, 4.5);
        }
        embers.pos.set([e.x + Math.sin(t * 0.7 + e.ph) * 0.25, e.y, e.z], i * 3);
        embers.size[i] = e.s;
        embers.alpha[i] = (0.3 + 0.7 * smooth(4, -3, e.y)) * (0.6 + 0.4 * Math.sin(t * 7 + e.ph * 3)) * (1 - 0.5 * dom);
      }
      embers.flush();
      // the domain expanding
      return bump(c, 4.2, 4.85, 7.6, 8.4);
    },
  };
};

/* ── spider-man: the web ───────────────────────────────────────────────────── */

const spiderman: Build = (p) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const spokes = 22;
  const turns = 24;
  const angles = Array.from({ length: spokes }, (_, i) => (i / spokes) * Math.PI * 2 + Math.sin(i * 7.3) * 0.08);
  const reach = angles.map((a, i) => 4.6 + Math.sin(i * 3.1) * 0.5 + Math.abs(Math.cos(a)) * 0.6);
  const segs: number[] = [];
  const seg = (a: number[], b: number[]) => segs.push(...a, ...b);
  const at = (i: number, r: number) => {
    const a = angles[((i % spokes) + spokes) % spokes];
    return [Math.cos(a) * r, Math.sin(a) * r, 0];
  };
  angles.forEach((_, i) => seg(at(i, 0.12), at(i, reach[i])));
  for (let k = 0; k < turns * spokes; k++) {
    const r0 = 0.45 + (k / spokes) * 0.16;
    const r1 = 0.45 + ((k + 1) / spokes) * 0.16;
    if (r1 > reach[k % spokes] * 0.92) continue;
    // each thread sags a little between spokes
    const a = at(k, r0);
    const b = at(k + 1, r1);
    const m = [(a[0] + b[0]) * 0.47, (a[1] + b[1]) * 0.47, 0];
    seg(a, m);
    seg(m, b);
  }
  // anchor lines out of frame
  [0.6, 2.3, 3.9, 5.2].forEach((a) => seg([Math.cos(a) * 4.8, Math.sin(a) * 4.8, 0], [Math.cos(a) * 12, Math.sin(a) * 12, 0]));

  const webMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uInk: { value: p.ink }, uA: { value: p.dark ? 0.6 : 0.7 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying float vR;
      void main(){
        vec3 pos = position;
        float r = length(pos.xy);
        vR = r;
        pos.z += sin(uTime * 1.1 + r * 0.9) * 0.12 * min(r, 5.0) * 0.4 + sin(uTime * 2.3 + pos.x) * 0.03;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk; uniform float uA;
      varying float vR;
      void main(){ gl_FragColor = vec4(uInk, uA * (1.0 - smoothstep(5.5, 11.0, vR) * 0.7)); }`,
    transparent: true,
    depthWrite: false,
  });
  const web = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(segs, 3)), webMat);
  const group = new THREE.Group();
  group.add(web);

  // dew on the threads
  const dropN = 140;
  const drops = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 14, 10),
    shader(
      { uInk: p.ink, uAccent: p.accent, uCam: camera.position },
      /* glsl */ `
      uniform vec3 uInk, uAccent, uCam;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 N = normalize(vN);
        vec3 V = normalize(uCam - vW);
        float f = 1.0 - max(dot(N, V), 0.0);
        float spec = pow(max(dot(reflect(-normalize(vec3(-0.5, 0.8, 0.6)), N), V), 0.0), 40.0);
        vec3 col = mix(vec3(1.0), uAccent, 0.35 + 0.4 * f);
        col = mix(col, uInk, pow(f, 3.0) * 0.8);
        col += spec;
        gl_FragColor = vec4(col, 0.35 + 0.65 * f);
      }`,
      { transparent: true }
    ),
    dropN
  );
  const dropAt: number[][] = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < dropN; i++) {
    const s = Math.floor(rand(0, segs.length / 6));
    const tt = Math.random();
    const a = segs.slice(s * 6, s * 6 + 3);
    const b = segs.slice(s * 6 + 3, s * 6 + 6);
    const x = a[0] + (b[0] - a[0]) * tt;
    const y = a[1] + (b[1] - a[1]) * tt;
    if (Math.hypot(x, y) > 5.2) {
      i--;
      continue;
    }
    dropAt.push([x, y, rand(0.025, 0.07)]);
  }
  group.add(drops);

  // a small spider letting itself down on a thread
  const spider = new THREE.Group();
  const bodyMat = new THREE.MeshBasicMaterial({ color: toColor(p.ink) });
  const abd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), bodyMat);
  abd.scale.set(1, 1.25, 1);
  abd.position.y = 0.16;
  const thx = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), bodyMat);
  thx.position.y = -0.06;
  const legPts: number[] = [];
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const a = -0.6 + i * 0.4;
      const kx = s * 0.28;
      const ky = -0.06 + Math.sin(a) * 0.2 + 0.1;
      legPts.push(0, -0.06, 0, kx, ky, 0.02, kx, ky, 0.02, s * 0.42, ky - 0.2 + i * 0.03, 0.04);
    }
  }
  const legs = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(legPts, 3)),
    new THREE.LineBasicMaterial({ color: toColor(p.ink) })
  );
  const silkPos = new Float32Array(6);
  const silk = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(silkPos, 3)),
    new THREE.LineBasicMaterial({ color: toColor(p.ink), transparent: true, opacity: 0.6 })
  );
  silk.frustumCulled = false;
  spider.add(abd, thx, legs);
  scene.add(group, spider, silk);

  return {
    scene,
    camera,
    update(t) {
      webMat.uniforms.uTime.value = t;
      for (let i = 0; i < dropN; i++) {
        const [x, y, s] = dropAt[i];
        const r = Math.hypot(x, y);
        dummy.position.set(x, y - s * 0.4, Math.sin(t * 1.1 + r * 0.9) * 0.12 * Math.min(r, 5) * 0.4);
        dummy.scale.set(s, s * 1.15, s);
        dummy.updateMatrix();
        drops.setMatrixAt(i, dummy.matrix);
      }
      drops.instanceMatrix.needsUpdate = true;
      camera.position.set(Math.sin(t * 0.21) * 2.6, Math.cos(t * 0.17) * 1.2, 10);
      camera.lookAt(0, 0, 0);
      group.rotation.z = t * 0.015;
      // drop on the thread, bounce on it, hang, climb back
      const c = t % 14;
      const drop = smooth(0.8, 1.75, c) * (1 - smooth(9.8, 13.3, c));
      const d = c - 1.75;
      const bounce = d > 0 ? Math.exp(-d * 2.6) * Math.sin(d * 9) * 0.35 : 0;
      const top = v3(2.35, 4.9, 0.3);
      spider.position.set(top.x + Math.sin(t * 0.9) * 0.08 * drop, top.y - 0.4 - drop * 3.3 - bounce + Math.sin(t * 2.2) * 0.04, top.z);
      spider.rotation.z = Math.sin(t * 0.9) * 0.1;
      silkPos.set([top.x, top.y + 6, top.z, spider.position.x, spider.position.y + 0.3, top.z]);
      silk.geometry.attributes.position.needsUpdate = true;
      // the drop and the catch on the thread
      return bump(c, 0.95, 1.75, 2.3, 3.0);
    },
  };
};

/* ── musashi: two swords in the circle ─────────────────────────────────────── */

const musashi: Build = (p, env) => {
  const scene = new THREE.Scene();
  scene.environment = env();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  // the ensō: one brush stroke, thick to thin, drawn and then let go
  const ensoN = 220;
  const ensoPos: number[] = [];
  const ensoUv: number[] = [];
  const ensoIdx: number[] = [];
  const span = Math.PI * 2 * 0.9;
  for (let i = 0; i <= ensoN; i++) {
    const k = i / ensoN;
    const a = Math.PI * 0.62 - k * span;
    const R = 2.8 + Math.sin(k * 9) * 0.04;
    const w = 0.34 * Math.pow(1 - k, 0.6) * smooth(0, 0.04, k) + 0.035;
    for (const s of [-1, 1]) {
      const r = R + s * w;
      ensoPos.push(Math.cos(a) * r, Math.sin(a) * r, -1.2);
      ensoUv.push(k, s * 0.5 + 0.5);
    }
    if (i < ensoN) ensoIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const ensoGeo = new THREE.BufferGeometry();
  ensoGeo.setAttribute('position', new THREE.Float32BufferAttribute(ensoPos, 3));
  ensoGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ensoUv, 2));
  ensoGeo.setIndex(ensoIdx);
  const ensoMat = new THREE.ShaderMaterial({
    uniforms: { uInk: { value: p.ink }, uDraw: { value: 0 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uInk; uniform float uDraw, uFade;
      varying vec2 vUv;
      void main(){
        if (vUv.x > uDraw) discard;
        float across = abs(vUv.y - 0.5) * 2.0;
        float dry = snoise(vec3(vUv.x * 7.0, vUv.y * 26.0, 3.0)) * 0.5 + 0.5;
        float bristle = smoothstep(0.25 + 0.6 * vUv.x, 0.0, dry * (0.4 + across));
        float edge = smoothstep(1.0, 0.82 - 0.2 * dry, across);
        float a = edge * mix(1.0, bristle, smoothstep(0.35, 1.0, vUv.x) * 0.9 + 0.1 * across);
        a *= smoothstep(uDraw, uDraw - 0.02, vUv.x) * uFade;
        gl_FragColor = vec4(uInk, a * 0.92);
      }`,
    transparent: true,
    depthWrite: false,
    // the strip winds clockwise, so it faces away; without this it was culled and never showed
    side: THREE.DoubleSide,
  });
  scene.add(new THREE.Mesh(ensoGeo, ensoMat));

  // a katana: curved blade, guard, wrapped grip
  const steel = new THREE.MeshStandardMaterial({ color: toColor(v3(0.86, 0.87, 0.9)), metalness: 1, roughness: 0.16 });
  const dark = new THREE.MeshStandardMaterial({ color: toColor(p.ink), metalness: 0.3, roughness: 0.55 });
  const wrap = new THREE.MeshStandardMaterial({ color: toColor(p.accent), metalness: 0.1, roughness: 0.6 });
  const katana = () => {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    const len = 4.4;
    const curve = (x: number) => 0.09 * (x / len) ** 2 * len;
    s.moveTo(0, 0.085);
    for (let i = 1; i <= 20; i++) {
      const x = (i / 20) * len;
      s.lineTo(x, 0.085 - (0.02 * i) / 20 + curve(x));
    }
    s.lineTo(len + 0.18, curve(len) + 0.02);
    for (let i = 20; i >= 0; i--) {
      const x = (i / 20) * len;
      s.lineTo(x, -0.075 + (0.015 * i) / 20 + curve(x) - (i === 20 ? 0.04 : 0));
    }
    const blade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -0.011),
      steel
    );
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 28).rotateZ(Math.PI / 2), dark);
    guard.position.x = -0.03;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 1.25, 16).rotateZ(Math.PI / 2), wrap);
    grip.position.x = -0.7;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), dark);
    cap.position.x = -1.34;
    g.add(blade, guard, grip, cap);
    g.position.x = -1.5;
    const pivot = new THREE.Group();
    pivot.add(g);
    return pivot;
  };
  const a = katana();
  const b = katana();
  const pair = new THREE.Group();
  a.rotation.z = 0.72;
  b.rotation.z = Math.PI - 0.72;
  b.rotation.x = Math.PI;
  a.position.set(0.15, -0.2, 0.1);
  b.position.set(-0.15, -0.2, -0.1);
  pair.add(a, b);
  scene.add(pair);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 6, 8);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.4));

  const ink = new Spray(160, p.ink, false, -0.4, 0.4);
  scene.add(ink.dots.points);

  const period = 12;
  const P = v3(0, 0, 0);
  return {
    scene,
    camera,
    update(t, dt, px) {
      ink.dots.scale(px, 32);
      const c = t % period;
      ensoMat.uniforms.uDraw.value = smooth(0.2, 1.8, c) * 1.02;
      ensoMat.uniforms.uFade.value = 1 - smooth(10.6, 11.8, c);
      // the cut: the blades snap round as the brush goes down, then ease back
      const cutK = smooth(0.05, 0.3, c) * Math.exp(-Math.max(0, c - 0.3) * 1.6);
      pair.rotation.y = Math.sin(t * 0.32) * 0.75;
      pair.rotation.x = Math.sin(t * 0.21) * 0.18;
      pair.rotation.z = -0.32 * cutK;
      pair.position.y = Math.sin(t * 0.6) * 0.08;
      key.intensity = 1.6 + 1.8 * cutK;
      if (Math.random() < 0.35) {
        const ang = rand(0, Math.PI * 2);
        const rr = rand(2.5, 3.2);
        P.set(Math.cos(ang) * rr, Math.sin(ang) * rr, rand(-1, 1));
        ink.emit(P, v3(rand(-0.15, 0.15), rand(-0.1, 0.2), 0), rand(0.02, 0.07), rand(2, 4.5));
      }
      ink.step(dt, 0.55);
      // the cut and the ensō going down with it
      return bump(c, 0.0, 0.5, 1.7, 2.4);
    },
  };
};

const BUILDERS: Record<SigilId, Build> = {
  paul,
  anakin,
  eren,
  sukuna,
  jinwoo,
  killua,
  gon,
  batman,
  cap,
  superman,
  spiderman,
  musashi,
  thorfinn,
  gojo,
};

/* ── the shared renderer ───────────────────────────────────────────────────── */

interface Plate {
  kit: Kit;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  visible: boolean;
  time: number;
  first: (() => void) | null;
  beat: ((b: number) => void) | null;
  // seconds drawn since mount; the beat eases in over the first of them, so a
  // plate that mounts mid-moment does not jump its text
  age: number;
}

class Hub {
  private renderer: THREE.WebGLRenderer | null = null;
  private env: THREE.Texture | null = null;
  private plates = new Set<Plate>();
  private raf = 0;
  private last = 0;

  get gl() {
    if (!this.renderer) {
      const r = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, alpha: true, powerPreference: 'low-power' });
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.setPixelRatio(1);
      r.autoClear = false;
      this.renderer = r;
    }
    return this.renderer;
  }

  envMap = () => {
    if (!this.env) {
      const pm = new THREE.PMREMGenerator(this.gl);
      this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      pm.dispose();
    }
    return this.env;
  };

  add(p: Plate) {
    this.plates.add(p);
    this.kick();
  }

  remove(p: Plate) {
    this.plates.delete(p);
    if (this.plates.size) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.env?.dispose();
    this.env = null;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
  }

  kick() {
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    let any = false;
    for (const p of this.plates) {
      if (!p.visible || !p.w || !p.h) continue;
      any = true;
      try {
        this.draw(p, dt);
      } catch (e) {
        // one broken scene must not stop the others
        p.visible = false;
        p.w = 0;
        if (import.meta.env.DEV) console.error(e);
      }
    }
    if (any) this.raf = requestAnimationFrame(this.frame);
  };

  private draw(p: Plate, dt: number) {
    const r = this.gl;
    const cv = r.domElement;
    if (cv.width < p.w || cv.height < p.h) r.setSize(Math.max(cv.width, p.w), Math.max(cv.height, p.h), false);
    r.setViewport(0, 0, p.w, p.h);
    r.setScissor(0, 0, p.w, p.h);
    r.setScissorTest(true);
    r.setClearColor(0x000000, 0);
    r.clear();
    p.time += dt;
    const b = p.kit.update(p.time, dt, Math.min(p.w, p.h));
    r.render(p.kit.scene, p.kit.camera);
    p.ctx.clearRect(0, 0, p.w, p.h);
    p.ctx.drawImage(cv, 0, cv.height - p.h, p.w, p.h, 0, 0, p.w, p.h);
    if (p.first) {
      p.first();
      p.first = null;
    }
    p.age += dt;
    p.beat?.(typeof b === 'number' && b > 0 ? Math.min(1, b) * smooth(0, 0.6, p.age) : 0);
  }
}

const hub = new Hub();

const disposeScene = (scene: THREE.Scene) => {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach((mat) => {
      const u = (mat as THREE.ShaderMaterial).uniforms;
      if (u) Object.values(u).forEach((x) => (x.value as THREE.Texture)?.isTexture && (x.value as THREE.Texture).dispose());
      mat.dispose();
    });
  });
};

export const platesSupported = () => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

/**
 * Mounts a live plate into `host`. Returns the cleanup. `onBeat` gets the
 * plate's beat (0..1) after every drawn frame.
 */
export const mountPlate = (id: SigilId, host: HTMLElement, onFirstFrame?: () => void, onBeat?: (b: number) => void) => {
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => canvas.remove();
  const kit = BUILDERS[id](readPalette(host), hub.envMap);
  const plate: Plate = { kit, ctx, w: 0, h: 0, visible: false, time: rand(0, 0.5), first: onFirstFrame ?? null, beat: onBeat ?? null, age: 0 };
  // every scene is framed for a square card
  const tan0 = Math.tan(THREE.MathUtils.degToRad(kit.camera.fov / 2));

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = host.clientWidth;
    const ch = host.clientHeight;
    // the longest side is capped, which on a 390 x 700 phone card still leaves ~1.6 px per css px
    const k = Math.min(dpr, 1100 / Math.max(cw, ch, 1));
    const w = Math.max(1, Math.round(cw * k));
    const h = Math.max(1, Math.round(ch * k));
    // the observer's first call repeats the size; resizing the canvas would blank the frame just drawn
    if (w === plate.w && h === plate.h) return;
    plate.w = canvas.width = w;
    plate.h = canvas.height = h;
    const cam = kit.camera;
    const asp = cw / Math.max(ch, 1);
    cam.aspect = asp;
    // a tall card shows the square's width, with the extra room above and below it
    cam.fov = asp < 1 ? THREE.MathUtils.radToDeg(2 * Math.atan(tan0 / asp)) : THREE.MathUtils.radToDeg(2 * Math.atan(tan0));
    cam.updateProjectionMatrix();
    // and its centre sits 40% down rather than half way, so the subject clears
    // the text over the card's lower part; the shift stays inside the square
    if (asp < 1) {
      cam.projectionMatrix.elements[9] = -Math.min(0.2, 1 - asp);
      cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    }
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  const io = new IntersectionObserver(
    ([e]) => {
      plate.visible = e.isIntersecting;
      if (plate.visible) hub.kick();
    },
    { rootMargin: '10%' }
  );
  io.observe(host);
  hub.add(plate);

  return () => {
    io.disconnect();
    ro.disconnect();
    hub.remove(plate);
    disposeScene(kit.scene);
    canvas.remove();
  };
};

if (import.meta.env.DEV) Object.assign(window, { __plates: { mountPlate, hub } });
