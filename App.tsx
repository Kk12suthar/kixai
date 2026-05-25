import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Hero from './components/Hero';
import SideQuests from './components/SideQuests';
import Screenwriter from './components/Screenwriter';
import Philosophy from './components/Philosophy';
import KrishnaAIPage from './components/KrishnaAIPage';
import Footer from './components/Footer';
import type { ThemeMode } from './types';
import { MirrorShatter } from './components/MirrorShatter';

const THEME_STORAGE_KEY = 'kixai-emotional-mode';

const getInitialMode = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'rage';
  }

  const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedMode === 'calm' ? 'calm' : 'rage';
};

const App: React.FC = () => {
  // Custom cursor logic for desktop
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [showKrishnaAI, setShowKrishnaAI] = useState(false);
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const isCalm = mode === 'calm';

  const [shatterState, setShatterState] = useState({
    isShattering: false,
    x: 0,
    y: 0,
  });

  const handleShatterTrigger = (clientX: number, clientY: number) => {
    if (shatterState.isShattering) return;
    setShatterState({
      isShattering: true,
      x: clientX,
      y: clientY,
    });
  };

  const handleShatterComplete = () => {
    window.location.href = '/about';
  };

  useEffect(() => {
    const updateCursor = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'A') {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateCursor);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  // Prevent body scroll when Krishna AI is open
  useEffect(() => {
    if (showKrishnaAI) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showKrishnaAI]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  return (
    <>
      <main
        className={`theme-shell theme-shell--${mode} min-h-screen w-full overflow-x-hidden transition-all duration-[1200ms] ease-out ${
          isCalm ? 'selection:bg-white selection:text-slate-900' : 'selection:bg-nolan-gold selection:text-black'
        } ${
          shatterState.isShattering
            ? 'scale-[0.96] filter blur-[8px] brightness-[0.2] pointer-events-none'
            : ''
        }`}
      >
        {/* Cinematic Custom Cursor (Hidden on Touch) */}
        <div
          className={`fixed top-0 left-0 z-50 hidden h-8 w-8 rounded-full pointer-events-none md:block transition-transform duration-100 ease-out ${
            isCalm
              ? 'border border-white/80 shadow-[0_0_24px_rgba(255,255,255,0.65)]'
              : 'mix-blend-difference border border-white/50'
          }`}
          style={{
            transform: `translate(${cursorPos.x - 16}px, ${cursorPos.y - 16}px) scale(${isHovering ? 2.5 : 1})`,
            backgroundColor: isHovering
              ? isCalm
                ? 'rgba(255, 255, 255, 0.28)'
                : 'rgba(255, 255, 255, 0.1)'
              : 'transparent'
          }}
        >
          <div
            className={`absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              isCalm ? 'bg-slate-500' : 'bg-white'
            }`}
          ></div>
        </div>

        <Header mode={mode} onChangeMode={setMode} onShatterTrigger={handleShatterTrigger} />
        <Hero mode={mode} onShatterTrigger={handleShatterTrigger} />
        <section id="sidequests">
          <SideQuests mode={mode} />
        </section>
        <section id="chatbot">
          <Screenwriter mode={mode} />
        </section>
        <section id="philosophy">
          <Philosophy mode={mode} onOpenKrishna={() => setShowKrishnaAI(true)} />
        </section>
        <Footer mode={mode} />
      </main>

      {/* Krishna AI Full Page Overlay */}
      <AnimatePresence>
        {showKrishnaAI && (
          <KrishnaAIPage onClose={() => setShowKrishnaAI(false)} />
        )}
      </AnimatePresence>

      <MirrorShatter
        isShattering={shatterState.isShattering}
        impactX={shatterState.x}
        impactY={shatterState.y}
        mode={mode}
        onComplete={handleShatterComplete}
      />
    </>
  );
};

export default App;
