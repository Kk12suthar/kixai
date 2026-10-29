import React from 'react';
import type { SigilId } from '../content';

/* Line-art plates, one per character. Drawn in currentColor so they read as
 * ember-on-night in the dark and ink-on-paper in the light. Anything with
 * class "d" draws itself in when the parent chapter gets .is-on; "f" fades in.
 * --d sets the delay. */

const C = 200;
const deg = (a: number) => (a * Math.PI) / 180;
const polar = (r: number, a: number, cx = C, cy = C) => [cx + r * Math.cos(deg(a)), cy + r * Math.sin(deg(a))] as const;
const d = (s: number): React.CSSProperties => ({ ['--d' as string]: `${s}s` });

const Paul = () => {
  const rings = [44, 72, 100, 128, 156, 182];
  return (
    <>
      <defs>
        <radialGradient id="sg-maw">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="f" cx={C} cy={C} r={70} fill="url(#sg-maw)" style={d(1.4)} />
      {rings.map((r, i) => {
        const n = 18 + i * 10;
        const len = 9 + i * 2.2;
        return (
          <g key={r} className={i % 2 ? 'spin' : 'spin-rev'} style={{ animationDuration: `${50 + i * 14}s` }}>
            <circle className="d" pathLength={1} cx={C} cy={C} r={r} fill="none" strokeWidth={i === rings.length - 1 ? 1.6 : 1} style={d(0.1 * i)} />
            {Array.from({ length: n }, (_, k) => {
              const a = (360 / n) * k + i * 7;
              const [x1, y1] = polar(r, a);
              const [x2, y2] = polar(r - len, a + 4);
              return (
                <line key={k} className="d" pathLength={1} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.9} style={d(0.5 + 0.1 * i + k * 0.004)} />
              );
            })}
          </g>
        );
      })}
      <circle className="d" pathLength={1} cx={C} cy={C} r={14} fill="none" strokeWidth={1} style={d(1.2)} />
    </>
  );
};

const Anakin = () => (
  <>
    <defs>
      {/* user-space region: a vertical line has a zero-width bbox, which would clip the glow away */}
      <filter id="sg-blur" filterUnits="userSpaceOnUse" x={140} y={10} width={120} height={300}>
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </defs>
    {/* Tatooine: two suns going down */}
    <line className="d" pathLength={1} x1={20} y1={292} x2={380} y2={292} strokeWidth={1} />
    <path className="d" pathLength={1} d="M 58 292 A 34 34 0 0 1 126 292" fill="none" strokeWidth={1} style={d(0.3)} />
    <path className="d" pathLength={1} d="M 278 292 A 22 22 0 0 1 322 292" fill="none" strokeWidth={1} style={d(0.45)} />
    {[304, 314, 322, 328].map((y, i) => (
      <line key={y} className="d" pathLength={1} x1={60 + i * 18} y1={y} x2={340 - i * 18} y2={y} strokeWidth={0.7} style={d(0.5 + i * 0.08)} />
    ))}
    {/* the blade */}
    <g className="blade">
      <line x1={C} y1={268} x2={C} y2={44} strokeWidth={16} strokeLinecap="round" filter="url(#sg-blur)" className="blade-glow" />
      <line x1={C} y1={268} x2={C} y2={44} strokeWidth={6} strokeLinecap="round" className="blade-core" />
    </g>
    {/* hilt */}
    <g className="f" style={d(0.2)}>
      <rect x={191} y={268} width={18} height={84} rx={2} fill="var(--bg)" strokeWidth={1.4} />
      <rect x={187} y={268} width={26} height={10} rx={1} fill="var(--bg)" strokeWidth={1.4} />
      {[292, 300, 308, 316, 324].map((y) => (
        <line key={y} x1={193} y1={y} x2={207} y2={y} strokeWidth={1} />
      ))}
      <circle cx={C} cy={340} r={3} fill="none" strokeWidth={1} />
    </g>
  </>
);

const BAT =
  'M0,-6 L4,-18 L7,-8 C14,-12 22,-12 28,-6 C40,-20 58,-22 78,-12 C68,-8 64,0 66,10 C58,4 50,6 46,14 C40,8 32,8 28,16 C20,12 10,14 0,30 C-10,14 -20,12 -28,16 C-32,8 -40,8 -46,14 C-50,6 -58,4 -66,10 C-64,0 -68,-8 -78,-12 C-58,-22 -40,-20 -28,-6 C-22,-12 -14,-12 -7,-8 L-4,-18 Z';

const Batman = () => {
  const sky = [
    [0, 352], [22, 352], [22, 318], [40, 318], [40, 334], [62, 334], [62, 290], [70, 284], [78, 290], [78, 340],
    [104, 340], [104, 310], [128, 310], [128, 348], [150, 348], [150, 300], [158, 300], [158, 272], [166, 300], [174, 300],
    [174, 346], [206, 346], [206, 324], [232, 324], [232, 352], [258, 352], [258, 296], [282, 296], [282, 336], [304, 336],
    [304, 316], [330, 316], [330, 352], [352, 352], [352, 326], [372, 326], [372, 352], [400, 352],
  ];
  return (
    <>
      <defs>
        <linearGradient id="sg-beam" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path className="f beam" d="M 52 372 L 168 74 L 336 168 Z" fill="url(#sg-beam)" stroke="none" style={d(0.2)} />
      <line className="d" pathLength={1} x1={52} y1={372} x2={168} y2={74} strokeWidth={0.8} style={d(0.2)} />
      <line className="d" pathLength={1} x1={52} y1={372} x2={336} y2={168} strokeWidth={0.8} style={d(0.3)} />
      <circle className="d" pathLength={1} cx={250} cy={128} r={92} fill="none" strokeWidth={1.4} style={d(0.6)} />
      <circle className="f" cx={250} cy={128} r={92} fill="currentColor" fillOpacity={0.06} stroke="none" style={d(0.8)} />
      <path className="f" d={BAT} transform="translate(250 128) scale(1.05)" fill="currentColor" stroke="none" style={d(1.1)} />
      <polyline className="d" pathLength={1} points={sky.map((p) => p.join(',')).join(' ')} fill="var(--bg)" strokeWidth={1.1} style={d(0.9)} />
      {[[30, 326], [86, 316], [112, 322], [186, 330], [240, 334], [266, 308], [312, 328], [360, 338]].map(([x, y], i) => (
        <rect key={i} className="f" x={x} y={y} width={3} height={4} fill="currentColor" stroke="none" style={d(1.5 + i * 0.05)} />
      ))}
    </>
  );
};

const star = (cx: number, cy: number, R: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -90 + i * 36;
    const rr = i % 2 ? r : R;
    pts.push(`${(cx + rr * Math.cos(deg(a))).toFixed(1)},${(cy + rr * Math.sin(deg(a))).toFixed(1)}`);
  }
  return pts.join(' ');
};

const Cap = () => (
  <>
    {[0, 1, 2].map((i) => (
      <line key={i} className="d speed" pathLength={1} x1={14} y1={160 + i * 40} x2={110 - i * 20} y2={160 + i * 40} strokeWidth={0.9} style={d(0.1 + i * 0.1)} />
    ))}
    <g className="shield">
      <circle cx={C} cy={C} r={150} fill="currentColor" strokeWidth={1.4} />
      <circle cx={C} cy={C} r={120} fill="var(--paper)" stroke="none" />
      <circle cx={C} cy={C} r={90} fill="currentColor" stroke="none" />
      <circle cx={C} cy={C} r={60} fill="var(--accent)" stroke="none" />
      <polygon points={star(C, C, 52, 20)} fill="var(--paper)" stroke="none" />
      <circle cx={C} cy={C} r={150} fill="none" stroke="var(--paper)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="2 6" />
    </g>
  </>
);

const Spiderman = () => {
  const cx = 190;
  const cy = 170;
  const spokes = 12;
  const angles = Array.from({ length: spokes }, (_, i) => i * (360 / spokes) + 8);
  const radii = [16, 34, 54, 76, 100, 126, 154, 184];
  return (
    <>
      {angles.map((a, i) => {
        const [x, y] = polar(300, a, cx, cy);
        return <line key={a} className="d" pathLength={1} x1={cx} y1={cy} x2={x} y2={y} strokeWidth={1} style={d(i * 0.04)} />;
      })}
      {radii.map((r, ri) => {
        let p = '';
        angles.forEach((a, i) => {
          const b = angles[(i + 1) % spokes];
          const [x1, y1] = polar(r, a, cx, cy);
          const [x2, y2] = polar(r, b, cx, cy);
          const [mx, my] = polar(r * 0.9, (a + b + (i === spokes - 1 ? 360 : 0)) / 2, cx, cy);
          p += `${i === 0 ? `M ${x1.toFixed(1)} ${y1.toFixed(1)}` : ''} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} `;
        });
        return <path key={r} className="d" pathLength={1} d={p} fill="none" strokeWidth={0.8} style={d(0.6 + ri * 0.14)} />;
      })}
      <g className="dangle">
        <line className="d" pathLength={1} x1={318} y1={0} x2={318} y2={292} strokeWidth={0.8} style={d(1.6)} />
        <g className="f" style={d(2.2)}>
          <ellipse cx={318} cy={300} rx={6} ry={8} fill="currentColor" stroke="none" />
          <circle cx={318} cy={290} r={4} fill="currentColor" stroke="none" />
          {[-1, 1].map((s) =>
            [0, 1, 2, 3].map((k) => (
              <path
                key={`${s}${k}`}
                d={`M ${318 + s * 4} ${296 + k * 3} q ${s * 8} ${-6 + k * 3} ${s * 13} ${2 + k * 4}`}
                fill="none"
                strokeWidth={1}
              />
            ))
          )}
        </g>
      </g>
    </>
  );
};

// a brush ring: filled polygon, swollen in the middle, dry at the tail
const enso = () => {
  const outer: string[] = [];
  const inner: string[] = [];
  const start = 112;
  const sweep = 318;
  const steps = 140;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = start + sweep * t;
    const w = 26 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.55) * (1 - t * 0.35) + 2 + Math.sin(t * 40) * 1.1;
    const r = 132 + Math.sin(t * 6.2) * 4;
    const [ox, oy] = polar(r + w / 2, a);
    const [ix, iy] = polar(r - w / 2, a);
    outer.push(`${ox.toFixed(1)},${oy.toFixed(1)}`);
    inner.unshift(`${ix.toFixed(1)},${iy.toFixed(1)}`);
  }
  return `M ${outer.join(' L ')} L ${inner.join(' L ')} Z`;
};
const ENSO = enso();

const Musashi = () => (
  <>
    <defs>
      <filter id="sg-dry">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
        <feDisplacementMap in="SourceGraphic" scale="5" />
      </filter>
      <mask id="sg-brush">
        <circle className="brush" cx={C} cy={C} r={132} fill="none" stroke="#fff" strokeWidth={60} pathLength={1} transform="rotate(112 200 200)" />
      </mask>
    </defs>
    <path d={ENSO} fill="currentColor" stroke="none" filter="url(#sg-dry)" mask="url(#sg-brush)" />
    {/* katana and wakizashi, the two heavens */}
    <path className="d" pathLength={1} d="M 112 300 Q 210 220 300 92" fill="none" strokeWidth={2.2} strokeLinecap="round" style={d(1.4)} />
    <ellipse className="f" cx={134} cy={283} rx={9} ry={4} transform="rotate(-38 134 283)" fill="var(--bg)" strokeWidth={1.2} style={d(1.6)} />
    <path className="d" pathLength={1} d="M 140 128 Q 214 182 262 268" fill="none" strokeWidth={1.8} strokeLinecap="round" style={d(1.7)} />
    <ellipse className="f" cx={158} cy={141} rx={7} ry={3.5} transform="rotate(34 158 141)" fill="var(--bg)" strokeWidth={1.1} style={d(1.9)} />
    <text className="f jp" x={358} y={92} style={d(2)}>
      武
    </text>
    <text className="f jp" x={358} y={130} style={d(2.1)}>
      蔵
    </text>
    <g className="f" style={d(2.4)}>
      <rect x={340} y={146} width={34} height={34} fill="var(--seal)" stroke="none" />
      <text x={357} y={170} className="jp seal" textAnchor="middle">
        道
      </text>
    </g>
  </>
);

const Thorfinn = () => {
  const vx = 200;
  const vy = 214;
  return (
    <>
      <defs>
        <clipPath id="sg-sky">
          <rect x={0} y={0} width={400} height={vy} />
        </clipPath>
      </defs>
      <g clipPath="url(#sg-sky)">
        <g className="rise">
          <circle cx={292} cy={vy} r={38} fill="var(--accent)" fillOpacity={0.12} strokeWidth={1.2} />
        </g>
      </g>
      <line className="d" pathLength={1} x1={0} y1={vy} x2={400} y2={vy} strokeWidth={1.2} />
      {Array.from({ length: 15 }, (_, i) => {
        const x = -160 + i * 52;
        return <line key={i} className="d" pathLength={1} x1={x} y1={400} x2={vx + (x - vx) * 0.04} y2={vy + 2} strokeWidth={0.9} style={d(0.3 + Math.abs(i - 7) * 0.05)} />;
      })}
      {[236, 262, 300, 352].map((y, i) => (
        <line key={y} className="d" pathLength={1} x1={0} y1={y} x2={400} y2={y} strokeWidth={0.5} style={d(0.9 + i * 0.08)} />
      ))}
      {/* a longship, far out */}
      <g className="sail">
        <path className="d" pathLength={1} d="M 70 206 Q 96 214 124 206 L 128 200 M 70 206 L 66 200" fill="none" strokeWidth={1.2} style={d(1.4)} />
        <line className="d" pathLength={1} x1={97} y1={208} x2={97} y2={172} strokeWidth={1} style={d(1.5)} />
        <rect className="f" x={84} y={176} width={26} height={22} fill="var(--bg)" strokeWidth={1} style={d(1.7)} />
        {[180, 186, 192].map((y) => (
          <line key={y} className="f" x1={84} y1={y} x2={110} y2={y} strokeWidth={0.6} style={d(1.8)} />
        ))}
      </g>
      {/* wheat in the near furrow */}
      <g className="f" style={d(2)}>
        {[0, 1, 2].map((k) => (
          <g key={k} transform={`translate(${312 + k * 16} ${392 - k * 6}) rotate(${-8 + k * 7})`}>
            <line x1={0} y1={0} x2={0} y2={-70} strokeWidth={1} />
            {[0, 1, 2, 3, 4].map((j) => (
              <g key={j}>
                <ellipse cx={-3.5} cy={-56 - j * 7} rx={2} ry={4.5} transform={`rotate(-24 -3.5 ${-56 - j * 7})`} fill="none" strokeWidth={0.9} />
                <ellipse cx={3.5} cy={-56 - j * 7} rx={2} ry={4.5} transform={`rotate(24 3.5 ${-56 - j * 7})`} fill="none" strokeWidth={0.9} />
              </g>
            ))}
          </g>
        ))}
      </g>
    </>
  );
};

const feather = (x: number, y: number, a: number, len: number, w: number) => {
  const dx = Math.cos(deg(a));
  const dy = -Math.sin(deg(a));
  const mx = x + dx * len * 0.55;
  const my = y + dy * len * 0.55;
  const f = (n: number) => n.toFixed(1);
  return `M ${f(x)} ${f(y)} Q ${f(mx - dy * w)} ${f(my + dx * w)} ${f(x + dx * len)} ${f(y + dy * len)} Q ${f(mx + dy * w * 0.55)} ${f(my - dx * w * 0.55)} ${f(x)} ${f(y)} Z`;
};

const Eren = () => (
  <>
    {/* two wings, crossed */}
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={`b${i}`} className="d" pathLength={1} d={feather(232, 300, 162 - i * 16, 170 - i * 18, 16 - i * 1.5)} fill="var(--bg)" strokeWidth={1.1} style={d(0.1 + i * 0.08)} />
    ))}
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={`f${i}`} className="d" pathLength={1} d={feather(168, 300, 18 + i * 16, 170 - i * 18, 16 - i * 1.5)} fill="var(--bg)" strokeWidth={1.3} style={d(0.6 + i * 0.08)} />
    ))}
    {Array.from({ length: 5 }, (_, i) => (
      <path key={i} className="d accent" pathLength={1} d={`M ${40 + i * 6} ${330 + i * 12} Q ${C} ${318 + i * 16} ${360 - i * 6} ${330 + i * 12}`} fill="none" strokeWidth={0.7} style={d(1.4 + i * 0.06)} />
    ))}
  </>
);

const Sukuna = () => (
  <>
    <path className="d" pathLength={1} d="M 70 300 L 330 300 M 90 288 L 310 288" fill="none" strokeWidth={1.2} />
    {[112, 162, 238, 288].map((x, i) => (
      <line key={x} className="d" pathLength={1} x1={x} y1={288} x2={x} y2={218} strokeWidth={1.2} style={d(0.2 + i * 0.05)} />
    ))}
    <path className="d" pathLength={1} d="M 50 205 Q 80 222 120 218 L 280 218 Q 320 222 350 205 L 290 186 L 110 186 Z" fill="var(--bg)" strokeWidth={1.4} style={d(0.4)} />
    <path className="d" pathLength={1} d="M 150 186 L 150 168 L 250 168 L 250 186" fill="none" strokeWidth={1.1} style={d(0.6)} />
    <path className="d" pathLength={1} d="M 96 168 Q 118 178 145 175 L 255 175 Q 282 178 304 168 L 264 150 L 136 150 Z" fill="var(--bg)" strokeWidth={1.3} style={d(0.7)} />
    <path className="d" pathLength={1} d="M 170 224 L 176 238 L 182 224 L 188 240 L 194 224 L 200 241 L 206 224 L 212 240 L 218 224 L 224 238 L 230 224" fill="none" strokeWidth={1} style={d(1)} />
    <path className="d" pathLength={1} d="M 170 286 L 176 270 L 182 286 L 188 268 L 194 286 L 200 267 L 206 286 L 212 268 L 218 286 L 224 270 L 230 286" fill="none" strokeWidth={1} style={d(1.1)} />
    <circle className="f" cx={C} cy={255} r={28} fill="var(--accent)" fillOpacity={0.16} stroke="none" style={d(1.3)} />
    {[
      [30, 110, 370, 236],
      [54, 344, 340, 70],
      [20, 262, 380, 168],
    ].map(([x1, y1, x2, y2], i) => (
      <line key={i} className="d accent" pathLength={1} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.6} style={d(1.6 + i * 0.25)} />
    ))}
  </>
);

const shade = (x: number, y: number, s: number) =>
  `M ${x - 34 * s} ${y + 86 * s} L ${x - 30 * s} ${y + 28 * s} Q ${x - 27 * s} ${y + 18 * s} ${x - 14 * s} ${y + 18 * s} L ${x + 14 * s} ${y + 18 * s} Q ${x + 27 * s} ${y + 18 * s} ${x + 30 * s} ${y + 28 * s} L ${x + 34 * s} ${y + 86 * s}`;

const Jinwoo = () => (
  <>
    <ellipse className="d" pathLength={1} cx={C} cy={120} rx={46} ry={64} fill="none" strokeWidth={1} />
    <ellipse className="f" cx={C} cy={120} rx={42} ry={60} fill="var(--accent)" fillOpacity={0.08} stroke="none" style={d(0.6)} />
    <ellipse className="d" pathLength={1} cx={C} cy={316} rx={176} ry={44} fill="none" strokeWidth={1.2} style={d(0.2)} />
    <ellipse className="d" pathLength={1} cx={C} cy={316} rx={150} ry={36} fill="none" strokeWidth={0.7} style={d(0.3)} />
    {Array.from({ length: 36 }, (_, i) => {
      const a = deg((i / 36) * 360);
      return i % 3 ? (
        <line
          key={i}
          className="d"
          pathLength={1}
          x1={C + Math.cos(a) * 152}
          y1={316 + Math.sin(a) * 37}
          x2={C + Math.cos(a) * 174}
          y2={316 + Math.sin(a) * 43}
          strokeWidth={0.7}
          style={d(0.5 + i * 0.01)}
        />
      ) : null;
    })}
    {[
      [118, 216, 0.8],
      [282, 216, 0.8],
      [200, 186, 1.15],
    ].map(([x, y, s], i) => (
      <g key={i}>
        <path className="d" pathLength={1} d={shade(x, y, s)} fill="var(--bg)" strokeWidth={1.2} style={d(0.9 + i * 0.2)} />
        <circle className="d" pathLength={1} cx={x} cy={y} r={13 * s} fill="var(--bg)" strokeWidth={1.2} style={d(1 + i * 0.2)} />
        <circle className="f" cx={x - 4 * s} cy={y + 1} r={1.8 * s} fill="var(--accent)" stroke="none" style={d(2 + i * 0.15)} />
        <circle className="f" cx={x + 4 * s} cy={y + 1} r={1.8 * s} fill="var(--accent)" stroke="none" style={d(2 + i * 0.15)} />
      </g>
    ))}
  </>
);

const Killua = () => {
  const bolt = 'M 36 84 L 128 146 L 106 164 L 214 218 L 190 236 L 304 296 L 282 310 L 352 346';
  return (
    <>
      <path className="d accent" pathLength={1} d={bolt} fill="none" strokeWidth={5} strokeOpacity={0.25} />
      <path className="d" pathLength={1} d={bolt} fill="none" strokeWidth={1.6} />
      {['M 128 146 L 150 128 L 146 112', 'M 214 218 L 238 206 L 252 214', 'M 190 236 L 172 262 L 180 278', 'M 304 296 L 326 280'].map((b, i) => (
        <path key={i} className="d" pathLength={1} d={b} fill="none" strokeWidth={0.9} style={d(0.6 + i * 0.1)} />
      ))}
      <circle className="d accent" pathLength={1} cx={352} cy={346} r={16} fill="none" strokeWidth={1} style={d(1.2)} />
      <circle className="f" cx={352} cy={346} r={6} fill="var(--accent)" stroke="none" style={d(1.4)} />
      {[180, 260, 370].map((y, i) => (
        <line key={y} className="d" pathLength={1} x1={20} y1={y} x2={110 - i * 20} y2={y} strokeWidth={0.5} style={d(1 + i * 0.1)} />
      ))}
    </>
  );
};

const Gon = () => (
  <>
    <line className="d" pathLength={1} x1={20} y1={318} x2={380} y2={318} strokeWidth={1.1} />
    {[-60, -30, 0, 30, 60].map((a, i) => (
      <line key={a} className="d" pathLength={1} x1={C} y1={318} x2={C + Math.sin(deg(a)) * 120} y2={318 + Math.cos(deg(a)) * 50} strokeWidth={0.8} style={d(1.2 + i * 0.05)} />
    ))}
    <circle className="f" cx={C} cy={196} r={46} fill="var(--accent)" fillOpacity={0.16} stroke="none" style={d(0.6)} />
    <circle className="d" pathLength={1} cx={C} cy={196} r={46} fill="none" strokeWidth={1.6} style={d(0.3)} />
    {Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * 360;
      const [x1, y1] = polar(58, a, C, 196);
      const [x2, y2] = polar(i % 2 ? 78 : 96, a, C, 196);
      return <line key={i} className="d" pathLength={1} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.9} style={d(0.8 + i * 0.02)} />;
    })}
    {[
      [92, 250, 9],
      [312, 236, 11],
      [130, 120, 7],
      [286, 128, 8],
      [60, 196, 6],
      [344, 300, 7],
    ].map(([x, y, r], i) => (
      <path
        key={i}
        className="d"
        pathLength={1}
        d={`M ${x - r} ${y} L ${x - r * 0.3} ${y - r} L ${x + r} ${y - r * 0.4} L ${x + r * 0.6} ${y + r * 0.8} L ${x - r * 0.5} ${y + r} Z`}
        fill="var(--bg)"
        strokeWidth={1}
        style={d(1.4 + i * 0.08)}
      />
    ))}
  </>
);

const Gojo = () => (
  <>
    <g className="spin" style={{ animationDuration: '80s' }}>
      <ellipse className="d" pathLength={1} cx={C} cy={C} rx={160} ry={52} fill="none" strokeWidth={0.7} transform="rotate(-24 200 200)" />
    </g>
    <g className="spin-rev" style={{ animationDuration: '110s' }}>
      <ellipse className="d" pathLength={1} cx={C} cy={C} rx={176} ry={76} fill="none" strokeWidth={0.6} transform="rotate(32 200 200)" style={d(0.2)} />
    </g>
    <path
      className="d"
      pathLength={1}
      d="M 200 200 C 168 156 112 156 112 200 C 112 244 168 244 200 200 C 232 156 288 156 288 200 C 288 244 232 244 200 200 Z"
      fill="none"
      strokeWidth={1.6}
      style={d(0.4)}
    />
    <circle className="f" cx={146} cy={C} r={20} fill="var(--accent)" fillOpacity={0.5} stroke="none" style={d(1.2)} />
    <circle className="d" pathLength={1} cx={254} cy={C} r={20} fill="none" strokeWidth={1.4} style={d(1.3)} />
    <circle className="f" cx={C} cy={C} r={6} fill="currentColor" stroke="none" style={d(1.8)} />
  </>
);

const Superman = () => (
  <>
    <g className="rise">
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * 360;
        const [x1, y1] = polar(170, a, C, 200);
        const [x2, y2] = polar(i % 2 ? 186 : 196, a, C, 200);
        return <line key={i} className="d" pathLength={1} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.8} style={d(1.4 + i * 0.02)} />;
      })}
    </g>
    <path
      className="d"
      pathLength={1}
      d="M 116 102 L 284 102 Q 296 102 305 110 L 346 148 Q 356 158 346 170 L 210 326 Q 200 338 190 326 L 54 170 Q 44 158 54 148 L 95 110 Q 104 102 116 102 Z"
      fill="var(--bg)"
      strokeWidth={1.6}
    />
    <path className="d" pathLength={1} d="M 124 116 L 276 116 L 330 160 L 200 308 L 70 160 Z" fill="none" strokeWidth={0.7} style={d(0.3)} />
    <path
      className="d accent"
      pathLength={1}
      d="M 278 142 C 250 128 180 124 142 148 C 120 165 135 182 200 195 C 262 208 262 240 240 249 C 220 262 180 270 152 243"
      fill="none"
      strokeWidth={9}
      style={d(0.8)}
    />
  </>
);

const PLATES: Record<SigilId, React.FC> = {
  paul: Paul,
  anakin: Anakin,
  eren: Eren,
  sukuna: Sukuna,
  jinwoo: Jinwoo,
  killua: Killua,
  gon: Gon,
  batman: Batman,
  cap: Cap,
  superman: Superman,
  spiderman: Spiderman,
  musashi: Musashi,
  thorfinn: Thorfinn,
  gojo: Gojo,
};

export const Sigil: React.FC<{ id: SigilId }> = ({ id }) => {
  const Plate = PLATES[id];
  return (
    <svg className={`sg sg--${id}`} viewBox="0 0 400 400" fill="none" stroke="currentColor" aria-hidden="true">
      <Plate />
    </svg>
  );
};
