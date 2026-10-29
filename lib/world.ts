import * as THREE from 'three';
import gsap from 'gsap';

/* ─────────────────────────────────────────────────────────────────────────────
 *  The World
 *
 *  One persistent WebGL scene behind the whole site. Same terrain, two readings:
 *    dark  (uMode = 0) → Arrakis at night. Dunes, an eclipsed sun, spice in the wind.
 *    light (uMode = 1) → Caladan at dawn. A calm sea, a low white sun.
 *  Paul's story runs in the opposite direction, sea → desert. Here you choose.
 * ──────────────────────────────────────────────────────────────────────────── */

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+10.0)*x);}
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0*fract(p*C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
  vec3 g;
  g.x = a0.x*x0.x + h.x*x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0*dot(m, g);
}
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

// Sky colour as a function of view direction. Shared by the sky dome, the
// terrain fog and the sea reflections so everything sits in one atmosphere.
const SKY = /* glsl */ `
uniform float uMode;
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;

vec3 skyBase(vec3 d){
  float y = d.y;
  vec3 dTop = vec3(0.012, 0.012, 0.014);
  vec3 dMid = vec3(0.036, 0.028, 0.027);
  vec3 dHor = vec3(0.170, 0.080, 0.045);
  vec3 dark = mix(dHor, dMid, smoothstep(-0.02, 0.10, y));
  dark = mix(dark, dTop, smoothstep(0.08, 0.55, y));

  vec3 lTop = vec3(0.300, 0.450, 0.680);
  vec3 lMid = vec3(0.580, 0.680, 0.800);
  vec3 lHor = vec3(0.840, 0.850, 0.860);
  vec3 light = mix(lHor, lMid, smoothstep(-0.02, 0.12, y));
  light = mix(light, lTop, smoothstep(0.10, 0.75, y));
  return mix(dark, light, uMode);
}

vec3 sunGlow(vec3 d){
  vec3 s = normalize(uSunDir);
  float a = acos(clamp(dot(d, s), -1.0, 1.0));
  // dark: ember corona around the eclipse; light: warm haze around the dawn sun
  vec3 dark = vec3(1.0, 0.40, 0.14) * (exp(-a * 9.0) * 0.55 + exp(-a * 2.4) * 0.12);
  vec3 light = vec3(1.0, 0.88, 0.70) * (exp(-a * 14.0) * 0.45 + exp(-a * 3.5) * 0.08);
  return mix(dark, light, uMode);
}

vec3 skyColor(vec3 d){
  return skyBase(d) + sunGlow(d);
}
`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const SKY_FRAG = /* glsl */ `
${NOISE}
${SKY}
varying vec3 vDir;

float disc(float a, float r, float soft){ return 1.0 - smoothstep(r - soft, r + soft, a); }

void main(){
  vec3 d = normalize(vDir);
  vec3 col = skyColor(d);

  // ── the sun / the eclipse
  vec3 s = normalize(uSunDir);
  float a = acos(clamp(dot(d, s), -1.0, 1.0));
  float r = mix(0.085, 0.045, uMode);
  float body = disc(a, r, 0.0015);
  float ring = exp(-abs(a - r) * 160.0);
  // dark: a black moon in front of a burning sun, thin white-hot ring
  vec3 eclipse = mix(col, vec3(0.012, 0.010, 0.010), body) + vec3(1.0, 0.62, 0.36) * ring * 1.4;
  // light: a white-gold disc sitting in its own warm haze
  vec3 dawn = mix(col, vec3(1.0, 0.93, 0.78), body) + vec3(1.0, 0.85, 0.60) * ring * 0.5;
  col = mix(eclipse, dawn, uMode);

  // ── the second moon of Arrakis (dark only)
  vec3 m = normalize(uMoonDir);
  float am = acos(clamp(dot(d, m), -1.0, 1.0));
  float mb = disc(am, 0.022, 0.0012);
  float shade = clamp(dot(normalize(d - m), normalize(vec3(-1.0, 0.2, 0.0))) * 0.5 + 0.6, 0.0, 1.0);
  col = mix(col, vec3(0.78, 0.80, 0.84) * shade, mb * (1.0 - uMode));
  col += vec3(0.55, 0.6, 0.7) * exp(-am * 60.0) * 0.08 * (1.0 - uMode);

  // ── stars (fade out at dawn and near the horizon)
  vec2 sph = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
  vec2 grid = sph * vec2(110.0, 110.0);
  vec2 cell = floor(grid);
  vec2 f = fract(grid) - 0.5;
  float h = hash12(cell);
  vec2 off = vec2(hash12(cell + 11.3), hash12(cell + 27.1)) - 0.5;
  float star = smoothstep(0.075, 0.0, length(f - off * 0.7)) * step(0.955, h);
  float tw = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
  float starMask = smoothstep(0.04, 0.25, d.y) * (1.0 - uMode);
  col += vec3(0.88, 0.92, 1.0) * star * tw * starMask * (0.5 + h * 0.9);

  gl_FragColor = vec4(col, 1.0);
}
`;

const TERRAIN_VERT = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uMode;
uniform float uShock;
uniform vec2 uShockCenter;
uniform vec2 uCamXZ;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vH;

float duneProfile(float s){ s = fract(s); return smoothstep(0.0, 0.78, s) * (1.0 - smoothstep(0.78, 1.0, s)); }

float dunes(vec2 p){
  vec2 q = p * 0.036;
  float warp = snoise(q * 0.5) * 1.7 + snoise(q * 1.9 + 3.1) * 0.45;
  float big = snoise(q * 0.25 + 7.1) * 0.5 + 0.5;
  float h = duneProfile(q.y * 0.9 + q.x * 0.3 + warp) * (0.5 + 2.1 * big);
  // smaller dunes riding on the big ones
  vec2 q2 = p * 0.10;
  float warp2 = snoise(q2 * 0.6 + 11.0) * 1.3;
  h += duneProfile(q2.y * 0.85 - q2.x * 0.4 + warp2) * (0.55 - 0.3 * big);
  h += snoise(q * 3.0) * 0.10;
  return h;
}

// wormsign: a ridge that ploughs across the view every so often
float worm(vec2 p){
  float T = 30.0;
  float t = mod(uTime + 9.0, T);
  vec2 head = uCamXZ + vec2(-85.0 + t * 6.5, -52.0 + sin(t * 0.21) * 7.0);
  vec2 r = p - head;
  float trail = exp(-r.y * r.y * 0.30) * smoothstep(-34.0, 0.0, r.x) * (1.0 - smoothstep(0.0, 2.5, r.x));
  float bump = exp(-dot(r, r) * 0.18);
  return (trail * 0.85 + bump * 0.9) * (1.0 - uMode);
}

float waves(vec2 p){
  float t = uTime;
  float h = 0.0;
  h += sin(p.y * 0.28 + p.x * 0.05 + t * 0.8) * 0.30;
  h += sin(p.y * 0.55 - p.x * 0.22 + t * 1.25 + 1.3) * 0.13;
  h += sin(p.x * 0.40 + p.y * 0.30 - t * 1.10) * 0.07;
  h += snoise(p * 0.07 + vec2(0.0, t * 0.04)) * 0.42;
  h += snoise(p * 0.35 + vec2(t * 0.12, t * 0.05)) * 0.06;
  return h - 0.55;
}

float shock(vec2 p){
  float d = length(p - uShockCenter);
  float R = uShock * 150.0;
  return exp(-pow((d - R) * 0.18, 2.0)) * 1.4 * sin(uShock * 3.14159);
}

float height(vec2 p){
  float dh = dunes(p) + worm(p);
  float wh = waves(p);
  return mix(dh, wh, uMode) + shock(p);
}

void main(){
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 p = world.xz;
  float e = 0.32;
  float h = height(p);
  float hx = height(p + vec2(e, 0.0));
  float hz = height(p + vec2(0.0, e));
  world.y += h;
  vH = h;
  vNormal = normalize(vec3(h - hx, e, h - hz));
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const TERRAIN_FRAG = /* glsl */ `
${NOISE}
${SKY}
uniform vec3 uCamPos;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vH;

void main(){
  vec3 n = normalize(vNormal);
  vec3 toCam = uCamPos - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec3 sun = normalize(uSunDir);

  // contour lines, anti-aliased — the "map" quality of both worlds
  float k = mix(2.4, 3.2, uMode);
  float ch = vH * k;
  float cl = abs(fract(ch) - 0.5) / max(fwidth(ch), 1e-4);
  float contour = 1.0 - smoothstep(0.6, 1.6, cl);
  float near = 1.0 - smoothstep(14.0, 70.0, dist);

  // ── DARK: moonlit sand, backlit by the eclipse
  // wind ripples, only up close where they can't alias
  float rippleFade = (1.0 - smoothstep(6.0, 34.0, dist)) * (1.0 - uMode);
  float phase = vWorld.z * 2.8 + vWorld.x * 0.9 + snoise(vWorld.xz * 0.12) * 4.0;
  vec3 sn = normalize(n + vec3(-0.9, 0.0, -2.8) * cos(phase) * 0.035 * rippleFade);
  vec3 moon = normalize(vec3(-0.55, 0.50, -0.30));
  float diff = clamp(dot(sn, moon), 0.0, 1.0);
  vec3 dark = mix(vec3(0.026, 0.024, 0.024), vec3(0.34, 0.31, 0.29), pow(diff, 1.5));
  float rim = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);
  float facing = smoothstep(-0.2, 1.0, dot(-V, sun));
  float back = pow(clamp(dot(n, sun), 0.0, 1.0), 3.0);
  dark += vec3(1.0, 0.38, 0.14) * (rim * 0.26 + back * 0.19) * facing;
  float g = hash12(floor(vWorld.xz * 38.0));
  float glint = step(0.993, g) * pow(clamp(dot(reflect(-moon, n), V), 0.0, 1.0), 12.0);
  dark += vec3(1.0, 0.86, 0.72) * glint * near * 0.9;
  dark += vec3(1.0, 0.42, 0.16) * contour * near * 0.05;

  // ── LIGHT: a pale sea, ink contours, the sun's path on the water
  vec3 R = reflect(-V, n);
  R.y = abs(R.y);
  float fres = 0.04 + 0.96 * pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 5.0);
  vec3 deep = vec3(0.12, 0.20, 0.30);
  float crest = smoothstep(-0.2, 0.45, vH);
  deep = mix(deep, vec3(0.34, 0.43, 0.52), crest);
  vec3 light = mix(deep, skyColor(R), clamp(fres * 0.55 + 0.03, 0.0, 1.0));
  float spec = pow(clamp(dot(R, sun), 0.0, 1.0), 260.0);
  float sparkle = pow(clamp(dot(R, sun), 0.0, 1.0), 40.0) * step(0.86, hash12(floor(vWorld.xz * 6.0 + uTime * 2.0)));
  light += vec3(1.0, 0.94, 0.84) * (spec * 1.8 + sparkle * 0.7);
  // engraving: horizontal hatch lines riding the swell, heavier in the troughs
  float u = vWorld.z * 1.5 + vH * 2.2;
  float fw = fwidth(u);
  float shade = 1.0 - clamp(dot(n, normalize(vec3(0.15, 0.85, 0.5))) * 1.15 - 0.15, 0.0, 1.0);
  shade = clamp(shade + (1.0 - crest) * 0.35, 0.0, 1.0);
  float w = mix(0.03, 0.30, shade);
  float hd = abs(fract(u + 0.5) - 0.5);
  float hatch = 1.0 - smoothstep(w * 0.5 - fw, w * 0.5 + fw, hd);
  hatch *= 1.0 - smoothstep(0.12, 0.35, fw);
  light = mix(light, vec3(0.08, 0.10, 0.17), hatch * 0.42);

  vec3 col = mix(dark, light, uMode);

  // atmosphere
  vec3 dir = -V;
  vec3 fogDir = normalize(vec3(dir.x, max(dir.y, 0.0) * 0.4, dir.z));
  float fog = 1.0 - exp(-pow(dist * mix(0.0105, 0.0078, uMode), 1.7));
  col = mix(col, skyColor(fogDir), clamp(fog, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}
`;

const DUST_VERT = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uMode;
uniform float uWarp;
uniform float uPixelRatio;
uniform vec3 uCamPos;
varying float vAlpha;
varying float vSeed;

void main(){
  vec3 box = vec3(70.0, 16.0, 70.0);
  vec3 p = position;
  float speed = mix(4.5, 0.5, uMode) * (0.35 + aSeed.x);
  p.x += uTime * speed;
  p.y += mix(sin(uTime * 0.7 + aSeed.y * 6.28) * 0.4, uTime * 0.18 * (0.3 + aSeed.z), uMode);
  p.z += uTime * (0.4 + aSeed.z * 0.4) + uWarp * 220.0 * (0.5 + aSeed.x);
  vec3 rel = mod(p - uCamPos + box * 0.5, box) - box * 0.5;
  rel.y = mod(p.y, box.y) - 1.0; // keep it close to the ground
  vec3 world = vec3(uCamPos.x + rel.x, rel.y, uCamPos.z + rel.z);
  vec4 mv = viewMatrix * vec4(world, 1.0);
  float depth = -mv.z;
  float size = mix(2.4, 3.4, uMode) * (0.35 + aSeed.y * 1.1);
  gl_PointSize = min(size * (24.0 / max(depth, 0.5)), 9.0) * uPixelRatio * (1.0 + uWarp * 3.0);
  gl_Position = projectionMatrix * mv;
  float fade = smoothstep(2.5, 7.0, depth) * (1.0 - smoothstep(26.0, 34.0, depth));
  float flicker = 0.6 + 0.4 * sin(uTime * (2.0 + aSeed.z * 5.0) + aSeed.x * 30.0);
  vAlpha = fade * mix(flicker, 0.55, uMode);
  vSeed = aSeed.z;
}
`;

const DUST_FRAG = /* glsl */ `
uniform float uMode;
varying float vAlpha;
varying float vSeed;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.0, d);
  vec3 ember = mix(vec3(1.0, 0.42, 0.14), vec3(1.0, 0.78, 0.52), vSeed);
  vec3 mist = mix(vec3(0.16, 0.22, 0.42), vec3(0.30, 0.34, 0.42), vSeed);
  vec3 col = mix(ember, mist, uMode);
  float alpha = a * vAlpha * mix(0.8, 0.38, uMode);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

type CamKey = { p: number; pos: [number, number, number]; pitch: number; yaw: number };

// Scroll choreography. p is page progress 0 → 1.
const CAMERA_PATH: CamKey[] = [
  { p: 0.0, pos: [0, 5.4, 0], pitch: -0.07, yaw: 0 },
  { p: 0.18, pos: [2, 4.6, -26], pitch: -0.05, yaw: 0.10 },
  { p: 0.5, pos: [4, 4.2, -64], pitch: -0.04, yaw: 0.16 },
  { p: 0.66, pos: [3, 5.6, -84], pitch: 0.42, yaw: 0.06 },
  { p: 0.82, pos: [0, 10.5, -110], pitch: -0.12, yaw: -0.10 },
  { p: 1.0, pos: [0, 5.4, -140], pitch: -0.02, yaw: 0 },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SUN_DARK = new THREE.Vector3(0.36, 0.17, -1).normalize();
const SUN_LIGHT = new THREE.Vector3(0.22, 0.13, -1).normalize();
const MOON = new THREE.Vector3(-0.36, 0.2, -1).normalize();

export type WorldMode = 'rage' | 'calm';

export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private terrain: THREE.Mesh;
  private dust: THREE.Points;
  private sky: THREE.Mesh;
  private shared: Record<string, THREE.IUniform>;
  private terrainSize: number;
  private terrainSegments: number;
  private time = 0;
  private last = performance.now();
  private scroll = 0;
  private scrollSmooth = 0;
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private drift = 0;
  private running = true;
  private paused = false;
  private modeTarget = 0;
  private sunMoving = false;
  private reducedMotion: boolean;
  private pixelRatio: number;
  private slowTime = 0;
  private fastTime = 0;
  private warpValue = { v: 0 };
  private onResize = () => this.resize();
  private onPointer = (e: PointerEvent) => {
    this.pointer.x = e.clientX / window.innerWidth - 0.5;
    this.pointer.y = e.clientY / window.innerHeight - 0.5;
  };
  private onVisibility = () => {
    this.running = !document.hidden;
    this.last = performance.now();
  };

  constructor(container: HTMLElement, mode: WorldMode) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;

    // a fresh canvas per World, so a remount never inherits a used GL context
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio, small ? 1.5 : 1.75);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1200);

    const m = mode === 'calm' ? 1 : 0;
    this.modeTarget = m;
    this.shared = {
      uTime: { value: 0 },
      uMode: { value: m },
      uSunDir: { value: m ? SUN_LIGHT.clone() : SUN_DARK.clone() },
      uMoonDir: { value: MOON.clone() },
    };

    // sky dome
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 48, 24),
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: this.shared,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    // terrain — follows the camera, sampled in world space, so it never ends
    this.terrainSize = 240;
    this.terrainSegments = small ? 150 : 260;
    const geo = new THREE.PlaneGeometry(this.terrainSize, this.terrainSize, this.terrainSegments, this.terrainSegments);
    geo.rotateX(-Math.PI / 2);
    this.terrain = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: TERRAIN_VERT,
        fragmentShader: TERRAIN_FRAG,
        uniforms: {
          ...this.shared,
          uShock: { value: 0 },
          uShockCenter: { value: new THREE.Vector2() },
          uCamXZ: { value: new THREE.Vector2() },
          uCamPos: { value: new THREE.Vector3() },
        },
      })
    );
    this.terrain.frustumCulled = false;
    this.scene.add(this.terrain);

    // dust / spice / sea mist
    const count = small ? 1400 : 3200;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.pow(Math.random(), 2.2) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    this.dust = new THREE.Points(
      dustGeo,
      new THREE.ShaderMaterial({
        vertexShader: DUST_VERT,
        fragmentShader: DUST_FRAG,
        uniforms: {
          uTime: this.shared.uTime,
          uMode: this.shared.uMode,
          uWarp: { value: 0 },
          uPixelRatio: { value: this.renderer.getPixelRatio() },
          uCamPos: { value: new THREE.Vector3() },
        },
        transparent: true,
        depthWrite: false,
      })
    );
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    this.resize();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // On a tall phone screen the sky is narrow; pull the sun and moon toward the middle.
  private skyDir(base: THREE.Vector3) {
    const k = Math.min(1, Math.max(0.35, this.camera.aspect * 0.75));
    return new THREE.Vector3(base.x * k, base.y, base.z).normalize();
  }

  setMode(mode: WorldMode) {
    const target = mode === 'calm' ? 1 : 0;
    this.modeTarget = target;
    const u = this.shared.uMode;
    if (Math.abs(u.value - target) < 0.001) return;
    const tu = (this.terrain.material as THREE.ShaderMaterial).uniforms;
    const sun = this.shared.uSunDir.value as THREE.Vector3;
    const from = sun.clone();
    const to = this.skyDir(target ? SUN_LIGHT : SUN_DARK);
    const dur = this.reducedMotion ? 0.01 : 2.6;

    gsap.to(u, { value: target, duration: dur, ease: 'power2.inOut', overwrite: true });
    const s = { t: 0 };
    this.sunMoving = true;
    gsap.to(s, {
      t: 1,
      duration: dur,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => {
        sun.copy(from).lerp(to, s.t).normalize();
      },
      onComplete: () => {
        this.sunMoving = false;
      },
    });
    // a ring of displacement rolls out from just ahead of the camera
    (tu.uShockCenter.value as THREE.Vector2).set(this.camera.position.x, this.camera.position.z - 18);
    tu.uShock.value = 0;
    if (!this.reducedMotion) gsap.to(tu.uShock, { value: 1, duration: 2.8, ease: 'power1.out' });
  }

  setScroll(p: number) {
    this.scroll = Math.min(1, Math.max(0, p));
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.last = performance.now();
  }

  // Dynamic resolution: weak GPUs drop pixel ratio until the frame rate holds.
  private adapt(dt: number) {
    if (dt > 0.026) {
      this.slowTime += dt;
      this.fastTime = 0;
    } else if (dt < 0.014) {
      this.fastTime += dt;
      this.slowTime = 0;
    }
    const max = Math.min(window.devicePixelRatio, 1.75);
    if (this.slowTime > 1.5 && this.pixelRatio > 0.6) {
      this.pixelRatio = Math.max(0.6, this.pixelRatio - 0.25);
      this.slowTime = 0;
    } else if (this.fastTime > 6 && this.pixelRatio < max) {
      this.pixelRatio = Math.min(max, this.pixelRatio + 0.25);
      this.fastTime = 0;
    } else {
      return;
    }
    this.renderer.setPixelRatio(this.pixelRatio);
    this.resize();
    (this.dust.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = this.pixelRatio;
  }

  /** Rush forward into the light — used before leaving for the Engineer Realm. */
  warp(): Promise<void> {
    return new Promise((resolve) => {
      if (this.reducedMotion) return resolve();
      const du = (this.dust.material as THREE.ShaderMaterial).uniforms.uWarp;
      gsap.to(this.warpValue, { v: 1, duration: 1.1, ease: 'power3.in', onComplete: resolve });
      gsap.to(du, { value: 1, duration: 1.1, ease: 'power3.in' });
    });
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 64 : w / h < 1.2 ? 56 : 48;
    this.camera.updateProjectionMatrix();
    if (!this.sunMoving) {
      (this.shared.uSunDir.value as THREE.Vector3).copy(this.skyDir(this.modeTarget ? SUN_LIGHT : SUN_DARK));
    }
    (this.shared.uMoonDir.value as THREE.Vector3).copy(this.skyDir(MOON));
  }

  private cameraAt(p: number) {
    let i = 0;
    while (i < CAMERA_PATH.length - 2 && p > CAMERA_PATH[i + 1].p) i++;
    const a = CAMERA_PATH[i];
    const b = CAMERA_PATH[i + 1];
    const t = smooth(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
    return {
      x: lerp(a.pos[0], b.pos[0], t),
      y: lerp(a.pos[1], b.pos[1], t),
      z: lerp(a.pos[2], b.pos[2], t),
      pitch: lerp(a.pitch, b.pitch, t),
      yaw: lerp(a.yaw, b.yaw, t),
    };
  }

  private frame() {
    if (!this.running || this.paused) return;
    const now = performance.now();
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, raw);
    this.last = now;
    // a hidden or throttled tab reports huge gaps; only judge real frames
    if (raw < 0.1) this.adapt(raw);
    const speed = this.reducedMotion ? 0.15 : 1;
    this.time += dt * speed;
    this.drift += dt * speed * 0.35;
    this.shared.uTime.value = this.time;

    this.scrollSmooth += (this.scroll - this.scrollSmooth) * Math.min(1, dt * 3.2);
    this.pointer.sx += (this.pointer.x - this.pointer.sx) * Math.min(1, dt * 2.0);
    this.pointer.sy += (this.pointer.y - this.pointer.sy) * Math.min(1, dt * 2.0);

    const c = this.cameraAt(this.scrollSmooth);
    const w = this.warpValue.v;
    const cam = this.camera;
    cam.position.set(c.x + this.pointer.sx * 1.6, c.y - this.pointer.sy * 0.6, c.z - this.drift - w * 60);
    cam.rotation.order = 'YXZ';
    cam.rotation.y = -c.yaw - this.pointer.sx * 0.06;
    cam.rotation.x = c.pitch - this.pointer.sy * 0.03;
    if (w > 0) {
      cam.fov = 48 + w * 50;
      cam.updateProjectionMatrix();
    }

    // terrain follows the camera, snapped to its own grid so vertices don't swim
    const cell = this.terrainSize / this.terrainSegments;
    const tx = Math.round(cam.position.x / cell) * cell;
    const tz = Math.round((cam.position.z - this.terrainSize * 0.38) / cell) * cell;
    this.terrain.position.set(tx, 0, tz);
    const tu = (this.terrain.material as THREE.ShaderMaterial).uniforms;
    (tu.uCamXZ.value as THREE.Vector2).set(cam.position.x, cam.position.z);
    (tu.uCamPos.value as THREE.Vector3).copy(cam.position);
    ((this.dust.material as THREE.ShaderMaterial).uniforms.uCamPos.value as THREE.Vector3).copy(cam.position);
    this.sky.position.copy(cam.position);

    this.renderer.render(this.scene, cam);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointer);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | undefined;
      if (mat) mat.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export const supportsWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
};
