import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { World, supportsWebGL } from './lib/world';
import { ENGINEER_REALM_URL } from './content';
import type { ThemeMode } from './types';
import Intro from './components/Intro';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Cast from './components/Cast';
import Wall from './components/Wall';
import Kurukshetra from './components/Kurukshetra';
import Realm from './components/Realm';
import Credits from './components/Credits';

gsap.registerPlugin(ScrollTrigger);

const THEME_STORAGE_KEY = 'kixai-emotional-mode';

const getInitialMode = (): ThemeMode => {
  try {
    const q = new URLSearchParams(window.location.search).get('mode');
    if (q === 'rage' || q === 'calm') return q;
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'calm' ? 'calm' : 'rage';
  } catch {
    return 'rage';
  }
};

// another origin (local dev) cannot read our localStorage, so the side travels in the URL
const withMode = (url: string, mode: ThemeMode) =>
  /^https?:/.test(url) && new URL(url).origin !== window.location.origin
    ? `${url}${url.includes('?') ? '&' : '?'}mode=${mode}`
    : url;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const App: React.FC = () => {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [ready, setReady] = useState(false);
  const worldHost = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const lenis = useRef<Lenis | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // the URL carried the side in; it has done its job
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('mode')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  }, []);

  // the world
  useEffect(() => {
    if (!worldHost.current || !supportsWebGL()) {
      document.documentElement.classList.add('no-webgl');
      return;
    }
    const w = new World(worldHost.current, getInitialMode());
    world.current = w;
    if (import.meta.env.DEV) Object.assign(window, { __world: w, __gsap: gsap, __st: ScrollTrigger });
    return () => {
      w.dispose();
      world.current = null;
    };
  }, []);

  // smooth scroll, driven by the gsap ticker so ScrollTrigger and Lenis agree
  useEffect(() => {
    // the film always starts at the opening scene
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const reduce = prefersReducedMotion();
    const l = new Lenis({ lerp: reduce ? 1 : 0.085, smoothWheel: !reduce });
    lenis.current = l;
    l.on('scroll', (inst: Lenis) => {
      ScrollTrigger.update();
      world.current?.setScroll(inst.progress);
    });
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      lenis.current = null;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'calm' ? '#f4f4f1' : '#0b0a09');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* private mode */
    }
    world.current?.setMode(mode);
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [mode]);

  const changeMode = useCallback(
    (next: ThemeMode, origin?: { x: number; y: number }) => {
      if (next === mode) return;
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (!doc.startViewTransition || prefersReducedMotion()) {
        setMode(next);
        return;
      }
      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? window.innerHeight / 2;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const root = document.documentElement.style;
      root.setProperty('--vt-x', `${x}px`);
      root.setProperty('--vt-y', `${y}px`);
      root.setProperty('--vt-r', `${r}px`);
      doc.startViewTransition(() => flushSync(() => setMode(next)));
    },
    [mode]
  );

  const toggleMode = useCallback(
    (origin?: { x: number; y: number }) => changeMode(mode === 'rage' ? 'calm' : 'rage', origin),
    [mode, changeMode]
  );

  const goTo = useCallback((target: string) => {
    lenis.current?.scrollTo(target, { offset: 0, duration: 1.6 });
  }, []);

  const enterRealm = useCallback(async () => {
    const url = withMode(ENGINEER_REALM_URL, modeRef.current);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
    document.documentElement.classList.add('is-warping');
    lenis.current?.stop();
    await Promise.all([world.current?.warp(), new Promise((r) => setTimeout(r, 1100))]);
    window.location.href = url;
  }, []);

  // coming back with the browser's back button restores a frozen page
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  return (
    <>
      <div className="world" ref={worldHost} aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <Nav mode={mode} onToggle={toggleMode} onNavigate={goTo} onRealm={enterRealm} />

      <main className="page">
        <Hero key={`hero-${mode}`} mode={mode} ready={ready} onCross={toggleMode} />
        <Cast key={`cast-${mode}`} mode={mode} />
        <Wall key={`wall-${mode}`} mode={mode} />
        <Kurukshetra key={`gita-${mode}`} mode={mode} />
        <Realm key={`realm-${mode}`} mode={mode} onEnter={enterRealm} />
        <Credits onTop={() => goTo('#top')} />
      </main>

      <div className="warp-veil" aria-hidden="true" />
      <Intro onDone={() => setReady(true)} />
    </>
  );
};

export default App;
