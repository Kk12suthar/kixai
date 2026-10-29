import React, { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { reducedMotion } from '../lib/reveal';

const SEEN_KEY = 'kix-intro-seen';

const readSeen = () => {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

/* Black bars close to a letterbox, then leave the frame. */
const Intro: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const root = useRef<HTMLDivElement>(null);
  const [seen] = useState(readSeen);
  const [gone, setGone] = useState(false);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reducedMotion()) {
      setGone(true);
      onDone();
      return;
    }
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({
      onComplete: () => {
        try {
          window.sessionStorage.setItem(SEEN_KEY, '1');
        } catch {
          /* ignore */
        }
        setGone(true);
      },
    });
    tl.to(q('.intro-bar--top'), { yPercent: -82, duration: 1, ease: 'expo.inOut' }, seen ? 0.05 : 0.3)
      .to(q('.intro-bar--bottom'), { yPercent: 82, duration: 1, ease: 'expo.inOut' }, '<')
      .add(onDone, '-=0.45')
      .to(q('.intro-bar--top'), { yPercent: -101, duration: 1.2, ease: 'expo.inOut' }, '+=0.35')
      .to(q('.intro-bar--bottom'), { yPercent: 101, duration: 1.2, ease: 'expo.inOut' }, '<');
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;

  return (
    <div className="intro" ref={root} aria-hidden="true">
      <div className="intro-bar intro-bar--top" />
      <div className="intro-bar intro-bar--bottom" />
    </div>
  );
};

export default Intro;
