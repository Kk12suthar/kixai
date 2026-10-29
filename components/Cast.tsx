import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { ThemeMode } from '../types';
import { cast, copy, type Chapter } from '../content';
import Plate3D from './Plate3D';
import { useReveal } from '../lib/reveal';

const pad = (n: number) => String(n).padStart(2, '0');

const ChapterView: React.FC<{ ch: Chapter }> = ({ ch }) => (
  <article className="ch" aria-labelledby={`ch-${ch.id}`}>
    <div className="ch-text">
      <h3 className="ch-name" id={`ch-${ch.id}`}>
        {/* the inner spans carry the beat; gsap owns the outer ones */}
        <span>
          <span>{ch.first}</span>
        </span>
        <span>
          <span>{ch.last}</span>
        </span>
      </h3>
      <blockquote className="ch-quote">
        “{ch.quote}”<cite>— {ch.quoteBy}</cite>
      </blockquote>
    </div>
    <figure className="ch-plate">
      <div className="plate-frame" role="img" aria-label={ch.fig}>
        <Plate3D id={ch.id} />
      </div>
      {ch.margin && (
        <aside className="ch-margin">
          <b>{ch.margin.ref}</b>
          <p className="deva" lang="sa">
            {ch.margin.verse}
          </p>
        </aside>
      )}
    </figure>
  </article>
);

const Cast: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  const chapters = cast[mode];
  const c = copy[mode];
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(0);
  useReveal(root);

  // desktop: the chapters slide past horizontally while the section is pinned
  useLayoutEffect(() => {
    const t = track.current;
    if (!t) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      const pin = t.parentElement as HTMLElement;
      const dist = () => t.scrollWidth - window.innerWidth;
      const slide = gsap.to(t, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.9,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
            setCurrent(Math.round(self.progress * (chapters.length - 1)));
          },
        },
      });
      gsap.utils.toArray<HTMLElement>('.ch', t).forEach((ch) => {
        const plate = ch.querySelector('.ch-plate');
        const st = { trigger: ch, containerAnimation: slide, start: 'left right', end: 'right left', scrub: true };
        if (plate) gsap.fromTo(plate, { y: 40 }, { y: -40, ease: 'none', scrollTrigger: st });
      });
    });
    // phones: the name and quote rise onto each scene, then drift slower than it
    mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.ch', t).forEach((ch) => {
        const text = ch.querySelector('.ch-text');
        if (!text) return;
        gsap.from(text.querySelectorAll('.ch-name > span, .ch-quote'), {
          y: 46,
          opacity: 0,
          duration: 1.2,
          ease: 'expo.out',
          stagger: 0.09,
          scrollTrigger: { trigger: text, start: 'top 92%', toggleActions: 'play none none reverse' },
        });
        gsap.fromTo(
          text,
          { y: 60 },
          { y: -50, ease: 'none', scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: true } }
        );
      });
    });
    return () => mm.revert();
  }, [chapters.length]);

  // a plate draws itself once its chapter is mostly on screen
  useEffect(() => {
    const els = root.current?.querySelectorAll('.ch');
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('is-on');
        }),
      { threshold: 0.42 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="cast" id="cast" ref={root}>
      <header className="sec-head">
        <h2 className="sec-title" data-reveal="mask">
          <span className="mask">
            <span>{c.castTitle[0]}</span>
          </span>
          <em className="mask">
            <span>{c.castTitle[1]}</span>
          </em>
        </h2>
      </header>

      <div className="cast-pin">
        <div className="cast-track" ref={track}>
          {chapters.map((ch) => (
            <ChapterView key={ch.id} ch={ch} />
          ))}
        </div>
        <div className="cast-hud" aria-hidden="true">
          <span>{pad(current + 1)}</span>
          <div className="bar">
            <i ref={bar} />
          </div>
          <span>{pad(chapters.length)}</span>
        </div>
      </div>
    </section>
  );
};

export default Cast;
