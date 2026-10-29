import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { ThemeMode } from '../types';
import { copy } from '../content';
import { reducedMotion } from '../lib/reveal';
import { originOf } from './Nav';

interface HeroProps {
  mode: ThemeMode;
  ready: boolean;
  onCross: (origin?: { x: number; y: number }) => void;
}

/* The full name runs round a ring. It turns once and stops, then K and I from Kishor, K from
   Kumar and S from Suthar get picked out. Everything else falls away, the four lift off the
   ring and set as KiKS, then the K and S fuse into the X. Then it rewinds. */
const RING = 'KISHOR•KUMAR•SUTHAR•'.split('');
const KEEP = [0, 1, 7, 13]; // K I K S

const SPIN = 2.6; // one full turn of the ring
const READ = 1.6; // the ring sits still long enough to read the whole name
const PICK_AT = SPIN + READ;
const HOLD_MARK = 3.4; // seconds on KiX
const POP = 1.25; // how much a picked letter grows on the ring

const Hero: React.FC<HeroProps> = ({ mode, ready, onCross }) => {
  const c = copy[mode];
  const root = useRef<HTMLElement>(null);
  const [still] = useState(reducedMotion);

  useLayoutEffect(() => {
    const el = root.current;
    if (still || !el) return;
    const once = gsap.context(() => {
      gsap.set('.mask.sub > span', { yPercent: 112 });
      gsap.set(['.mark', '.ring'], { opacity: 0 });
      gsap.set('[data-in]', { opacity: 0, y: 18 });
    }, el);
    if (!ready) return () => once.revert();

    let loop: gsap.Context | null = null;
    let alive = true;
    let timer = 0;

    const build = (first: boolean) => {
      loop?.revert();
      loop = gsap.context((self) => {
        const q = self.selector!;
        const title = q('.hero-title')[0] as HTMLElement;
        const ring = q('.ring')[0] as HTMLElement;
        const mark = q('.mark')[0] as HTMLElement;
        const sub = q('.mask.sub > span');
        const ringLetters = q('.r-l') as HTMLElement[];
        const kept = KEEP.map((i) => ringLetters[i]);
        const dropped = ringLetters.filter((_, i) => !KEEP.includes(i));
        const letters = q('.mark .m-l:not(.m-x)') as HTMLElement[]; // K i K S
        const pair = letters.slice(2);
        const x = q('.m-x')[0] as HTMLElement;
        const xGlyph = q('.m-x b')[0] as HTMLElement;
        const shock = q('.m-shock')[0] as HTMLElement;

        // ── the ring: each letter stands on the circle, facing out
        const R = ring.offsetWidth / 2;
        const step = 360 / RING.length;
        const angle = (i: number) => ((i * step + 180) % 360) - 180;
        gsap.set(ring, { opacity: 1, rotation: 0 });
        ringLetters.forEach((n, i) => {
          const a = (i * step * Math.PI) / 180;
          gsap.set(n, { xPercent: -50, yPercent: -50, x: R * Math.sin(a), y: -R * Math.cos(a), rotation: i * step, '--p': 0 });
        });

        // ── the mark at full size; it scales down only where a phone is too narrow
        const room = title.clientWidth * 0.96;
        const slot = letters.map((n) => n.offsetWidth);
        const xW = x.offsetWidth;
        const bW = xGlyph.offsetWidth;
        const kiks = slot.reduce((s, w) => s + w, 0);
        const kix = kiks - slot[2] - slot[3] + xW;
        const kiksScale = Math.min(1, room / kiks) * 0.86;
        const kixScale = Math.min(1, room / kix);
        const em = parseFloat(getComputedStyle(mark).fontSize);
        gsap.set(mark, { scale: kiksScale, opacity: 1 });
        gsap.set(letters, { width: (i: number) => slot[i], '--p': 1 }); // fixed slots, picked colour
        gsap.set(x, { width: 0 });

        // K and S meet halfway between them, and the X grows out of that point
        const meet = (slot[2] + slot[3]) / 4;
        gsap.set(xGlyph, { opacity: 0, x: -(slot[2] * 0.25 + slot[3] * 0.75 + bW / 2) });
        gsap.set(shock, { opacity: 0, scale: 0.3 });

        // park each mark letter on its twin on the ring, tilted the same way and as big as the picked letter
        const fsRing = parseFloat(getComputedStyle(ringLetters[0]).fontSize);
        const s = (fsRing * POP) / (em * kiksScale);
        const centre = (r: DOMRect) => [r.left + r.width / 2, r.top + r.height / 2];
        const park = letters.map((n, j) => {
          const [ax, ay] = centre(n.getBoundingClientRect());
          const [bx, by] = centre(kept[j].getBoundingClientRect());
          return { x: (bx - ax) / kiksScale, y: (by - ay) / kiksScale, rotation: angle(KEEP[j]) };
        });
        gsap.set(letters, {
          x: (i: number) => park[i].x,
          y: (i: number) => park[i].y,
          rotation: (i: number) => park[i].rotation,
          scale: s,
          opacity: 0,
        });

        // ── the ring turns once and comes to rest
        const turn = gsap.fromTo(ring, { rotation: 0 }, { rotation: 360, duration: SPIN, ease: 'power2.inOut' });

        const fold = gsap.timeline({ paused: true });
        fold
          // pick K, I, K, S out of the name, one after another
          .to(kept, { '--p': 1, scale: POP, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.3 }, 0)
          .to(dropped, { opacity: 0.2, duration: 0.6, ease: 'power2.out' }, 1.0)
          // the rest of the name falls away
          .to(dropped, { opacity: 0, scale: 0.6, duration: 0.5, ease: 'power2.in', stagger: 0.012 }, 1.75)
          // the four lift off the ring and set as KiKS
          .to(kept, { opacity: 0, duration: 0.2, ease: 'none' }, 1.95)
          .to(letters, { opacity: 1, duration: 0.2, ease: 'none' }, 1.95)
          .to(letters, { x: 0, y: 0, rotation: 0, scale: 1, duration: 1.35, ease: 'expo.inOut', stagger: 0.09 }, 1.95)
          .to(letters.slice(0, 2), { '--p': 0, duration: 0.7, ease: 'power2.out' }, 3.65)
          // K and S slide into each other...
          .to(pair[0], { x: meet, scale: 0.8, duration: 0.5, ease: 'power3.in' }, 4.2)
          .to(pair[1], { x: -meet, scale: 0.8, duration: 0.5, ease: 'power3.in' }, 4.2)
          .to(pair, { opacity: 0, duration: 0.14, ease: 'none' }, 4.58)
          // ...and the X comes out of where they met
          .fromTo(
            xGlyph,
            { opacity: 0, scale: 0.2, rotate: -40 },
            { opacity: 1, scale: 1, rotate: 0, duration: 0.95, ease: 'expo.out', immediateRender: false },
            4.65
          )
          .fromTo(shock, { opacity: 0.7, scale: 0.3 }, { opacity: 0, scale: 2.6, duration: 1, ease: 'expo.out', immediateRender: false }, 4.65)
          .to(pair, { width: 0, duration: 0.9, ease: 'expo.inOut' }, 4.75)
          .to(x, { width: xW, duration: 0.9, ease: 'expo.inOut' }, 4.75)
          .to(xGlyph, { x: 0, duration: 0.9, ease: 'expo.inOut' }, 4.75)
          .to(mark, { scale: kixScale, duration: 1.1, ease: 'expo.inOut' }, 4.75)
          .fromTo(sub, { yPercent: 112 }, { yPercent: 0, duration: 1.4, ease: 'expo.out' }, 5.2);

        // forwards at reading speed, back as a quick rewind, then the name rests on the ring again
        const end = fold.duration();
        const cycle = gsap.timeline({ repeat: -1, repeatDelay: 1.2, paused: true });
        cycle
          .add(turn, 0)
          .add(fold.tweenFromTo(0, end), PICK_AT)
          .add(fold.tweenFromTo(end, 0, { duration: end * 0.55, ease: 'power1.inOut' }), `+=${HOLD_MARK}`);

        // every arrival, including a switch of sides, starts on the full name
        if (first) {
          gsap.fromTo(ring, { scale: 0.88 }, { scale: 1, duration: 1.4, ease: 'expo.out' });
          gsap.from(ringLetters, { opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.035 });
        }
        cycle.play(0);

        // no point turning letters nobody can see
        gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: 'bottom top',
            onLeave: () => cycle.pause(),
            onEnterBack: () => cycle.resume(),
          },
        });
      }, el);
    };

    document.fonts.ready.then(() => {
      if (!alive) return;
      once.add(() => {
        gsap.to('[data-in]', { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07, delay: 0.6 });
        gsap.to('.hero-title', {
          yPercent: -18,
          opacity: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
      build(true);
    });

    // positions are measured in pixels, so a new viewport needs a new build
    let lastW = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastW) return; // mobile toolbars only change the height
      lastW = window.innerWidth;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => build(false), 250);
    };
    window.addEventListener('resize', onResize);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      loop?.revert();
      once.revert();
    };
  }, [ready, still]);

  return (
    <section className="hero" id="top" ref={root}>
      <h1 className="hero-title" aria-label={`KiX, Kishor Kumar Suthar. ${c.titleBottom}`}>
        <span className="mask big" aria-hidden="true">
          <span className={`morph ${still ? 'is-still' : ''}`}>
            <span className="ring">
              {RING.map((ch, i) => (
                <span key={i} className={`r-l ${ch === '•' ? 'r-dot' : ''}`}>
                  {ch}
                </span>
              ))}
            </span>
            <span className="mark">
              <span className="m-l">K</span>
              <span className="m-l">i</span>
              <span className="m-l m-pair">K</span>
              <span className="m-l m-pair">S</span>
              <span className="m-l m-x">
                <b>
                  X
                  <i className="m-shock" />
                </b>
              </span>
            </span>
          </span>
        </span>
        <span className="mask sub" aria-hidden="true">
          <span>{c.titleBottom}</span>
        </span>
      </h1>

      <div className="hero-foot">
        <button type="button" className="hero-cross" data-in onClick={(e) => onCross(originOf(e))}>
          <span>{c.cross} →</span>
        </button>
      </div>
    </section>
  );
};

export default Hero;
