import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import type { ThemeMode } from '../types';
import { gita } from '../content';
import { reducedMotion, useReveal } from '../lib/reveal';

const deg = (a: number) => (a * Math.PI) / 180;
const pt = (r: number, a: number) => [200 + r * Math.cos(deg(a)), 200 + r * Math.sin(deg(a))] as const;

/* A chariot wheel after the Konark sun temple: eight wide spokes, eight thin. */
const Wheel = () => {
  const major = Array.from({ length: 8 }, (_, i) => i * 45);
  const minor = major.map((a) => a + 22.5);
  return (
    <svg viewBox="0 0 400 400" fill="none" stroke="currentColor" strokeWidth={0.8}>
      <circle cx={200} cy={200} r={197} />
      <circle cx={200} cy={200} r={186} />
      <circle cx={200} cy={200} r={168} />
      <circle cx={200} cy={200} r={162} />
      {Array.from({ length: 72 }, (_, i) => {
        const [x, y] = pt(191.5, i * 5);
        return <circle key={i} cx={x} cy={y} r={2.2} />;
      })}
      {major.map((a) => {
        const p = [pt(38, a - 6), pt(162, a - 3.2), pt(162, a + 3.2), pt(38, a + 6)];
        const [mx, my] = pt(108, a);
        return (
          <g key={a}>
            <polygon points={p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />
            <circle cx={mx} cy={my} r={15} fill="var(--bg)" />
            <circle cx={mx} cy={my} r={9} />
            <circle cx={mx} cy={my} r={3} />
          </g>
        );
      })}
      {minor.map((a) => {
        const [x1, y1] = pt(38, a);
        const [x2, y2] = pt(162, a);
        const [bx, by] = pt(108, a);
        return (
          <g key={a}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} />
            <circle cx={bx} cy={by} r={4} fill="var(--bg)" />
          </g>
        );
      })}
      <circle cx={200} cy={200} r={38} fill="var(--bg)" />
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = pt(28, i * 30);
        return <ellipse key={i} cx={x} cy={y} rx={8} ry={3.5} transform={`rotate(${i * 30} ${x} ${y})`} />;
      })}
      <circle cx={200} cy={200} r={16} />
      <circle cx={200} cy={200} r={6} />
    </svg>
  );
};

const Kurukshetra: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  const root = useRef<HTMLElement>(null);
  const side = gita.side[mode];
  useReveal(root);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to('.gita-wheel svg', {
        rotation: mode === 'calm' ? 120 : -120,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
      });
      gsap.from('.gita-verse span', {
        opacity: 0,
        y: 26,
        filter: 'blur(8px)',
        duration: 1.4,
        ease: 'expo.out',
        stagger: 0.07,
        scrollTrigger: { trigger: '.gita-verse', start: 'top 80%', once: true },
      });
    }, root);
    return () => ctx.revert();
  }, [mode]);

  return (
    <section className="gita" id="gita" ref={root} aria-labelledby="gita-title">
      <div className="gita-wheel" aria-hidden="true">
        <Wheel />
      </div>
      <h2 className="sr-only" id="gita-title">
        Kurukshetra, the field between the two sides
      </h2>
      <p className="gita-ref" data-reveal>
        {gita.center.ref}
      </p>
      <p className="gita-verse" lang="sa">
        {gita.center.lines.map((line, i) => (
          <React.Fragment key={i}>
            {line.split(' ').map((w, j) => (
              <span key={j}>{w}&nbsp;</span>
            ))}
            {i === 0 && <br />}
          </React.Fragment>
        ))}
      </p>
      <p className="gita-iast" data-reveal>
        {gita.center.iast}
      </p>
      <p className="gita-en" data-reveal>
        {gita.center.english}
      </p>

      <div className="gita-grid">
        <div className="gita-side" data-reveal>
          <h3>{mode === 'calm' ? 'For the light side' : 'For the dark side'} · {side.ref}</h3>
          <p className="deva" lang="sa">
            {side.line}
          </p>
          <p className="iast">{side.iast}</p>
          <p className="en">{side.english}</p>
        </div>
      </div>
    </section>
  );
};

export default Kurukshetra;
