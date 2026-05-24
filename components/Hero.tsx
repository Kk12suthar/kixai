import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ThemeMode } from '../types';

interface HeroProps {
    mode: ThemeMode;
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

const AuraLines: React.FC<{ step: number; isMobile: boolean; mode: ThemeMode }> = ({ step, isMobile, mode }) => {
    const cornerPaths = useMemo(() => {
        const fullPaths = [
            'M0,0 C20,10 30,20 40,40',
            'M10,0 C20,15 30,25 45,35',
        ];

        return fullPaths;
    }, []);

    const stroke = mode === 'calm'
        ? step === 4 ? '#475569' : 'rgba(100, 116, 139, 0.4)'
        : step === 4 ? '#ef4444' : 'rgba(127, 29, 29, 0.55)';

    return (
        <svg
            className="absolute inset-0 h-full w-full overflow-visible pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
        >
            {!isMobile && (
                <defs>
                    <filter id={`glow-${mode}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
            )}

            {[0, 90, 180, 270].map((rotation, i) => (
                <g key={rotation} transform={`rotate(${rotation} 50 50)`}>
                    {cornerPaths.map((d, j) => (
                        <motion.path
                            key={`${i}-${j}`}
                            d={d}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={isMobile ? '0.4' : '0.3'}
                            filter={isMobile ? undefined : `url(#glow-${mode})`}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: isMobile ? [0.3, 0.7, 0.3] : [0.2, 0.8, 0.2],
                                opacity: mode === 'calm' ? [0.15, 0.5, 0.15] : [0.2, 0.55, 0.2],
                            }}
                            transition={{
                                duration: isMobile ? 4 : 3 + (j % 3),
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: j * 0.18,
                            }}
                        />
                    ))}
                </g>
            ))}
        </svg>
    );
};

const CalmNatureScene: React.FC<{ isMobile: boolean; step: number }> = ({ isMobile, step }) => {
    return (
        <>
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'url(/grate.jpeg)',
                }}
            />

            {/* Bottom gradient on mobile (quote sits at bottom) / right gradient on desktop */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/10 md:bg-gradient-to-l md:from-slate-900/85 md:via-slate-900/40 md:to-slate-900/10" />

            <motion.div
                animate={{
                    opacity: step === 4 ? 0.55 : 0.3,
                    scale: step === 4 ? 1.1 : 0.95,
                }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="absolute left-1/2 top-[18%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-white/30 blur-[120px] breathe-glow"
            />

            <AuraLines step={step} isMobile={isMobile} mode="calm" />
        </>
    );
};

const RageSeaScene: React.FC<{ isMobile: boolean; step: number }> = ({ isMobile, step }) => {
    return (
        <>
            {/* Wallpaper image — fills the whole hero. Face stays centered on
                every screen so the subject is always fully visible; the quote
                sits in the gradient area (bottom on mobile, right on desktop). */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'url(/Angry.jpg)',
                }}
            />

            {/* Mobile: dark gradient at bottom for the quote
                Desktop: dark gradient on right side for the quote */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/15 md:bg-gradient-to-l md:from-black/90 md:via-black/45 md:to-black/10" />

            {/* Soft red atmospheric pulse */}
            <motion.div
                animate={{
                    scale: step === 4 ? (isMobile ? 1.3 : 1.8) : 0.8,
                    opacity: step === 4 ? (isMobile ? 0.18 : 0.25) : 0.06,
                }}
                transition={{ duration: isMobile ? 0.5 : 0.8, ease: 'easeOut' }}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-nolan-aura mix-blend-screen ${
                    isMobile ? 'h-[300px] w-[300px] blur-[80px]' : 'h-[600px] w-[600px] blur-[150px]'
                }`}
            />
            <motion.div
                animate={{ opacity: [0.14, 0.28, 0.14], x: [-18, 12, -18] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-[12%] top-[14%] h-[220px] w-[220px] rounded-full bg-red-500/12 blur-[120px]"
            />
            <motion.div
                animate={{ opacity: [0.10, 0.22, 0.10], x: [18, -16, 18] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute right-[12%] top-[22%] h-[280px] w-[280px] rounded-full bg-orange-500/8 blur-[160px]"
            />

            {!isMobile && <div className="absolute inset-0 bg-film-grain opacity-15 mix-blend-overlay" />}
            <AuraLines step={step} isMobile={isMobile} mode="rage" />

            {/* Bottom fade so the status text below has a clean canvas */}
            <div className="absolute bottom-0 left-0 right-0 h-[28%] bg-gradient-to-t from-black via-black/80 to-transparent" />
            <div className="absolute bottom-[18%] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            <div className="wave-line absolute bottom-[11%] left-[-14%] h-[20%] w-[128%] rounded-[100%] border-t border-nolan-aura/35 opacity-70" />
            <div className="wave-line absolute bottom-[8%] left-[-10%] h-[18%] w-[120%] rounded-[100%] border-t border-red-500/20 opacity-60" />
        </>
    );
};

const Hero: React.FC<HeroProps> = ({ mode }) => {
    const isMobile = useIsMobile();
    const isCalm = mode === 'calm';
    const [step, setStep] = useState(0);

    useEffect(() => {
        let isMounted = true;

        const runSequence = async () => {
            while (isMounted) {
                setStep(0);
                await new Promise((resolve) => setTimeout(resolve, 5000));
                if (!isMounted) break;

                setStep(1);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                if (!isMounted) break;

                setStep(2);
                await new Promise((resolve) => setTimeout(resolve, 2500));
                if (!isMounted) break;

                setStep(3);
                await new Promise((resolve) => setTimeout(resolve, 1500));
                if (!isMounted) break;

                setStep(4);
                await new Promise((resolve) => setTimeout(resolve, 6000));
            }
        };

        runSequence();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <section
            className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden select-none ${
                isCalm ? 'bg-transparent text-slate-900' : 'bg-transparent text-white'
            }`}
        >
            <div className="absolute inset-0 z-0 pointer-events-none">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0"
                    >
                        {isCalm ? <CalmNatureScene isMobile={isMobile} step={step} /> : <RageSeaScene isMobile={isMobile} step={step} />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Foreground content — fills the hero, quote anchors to bottom on
                mobile (below the centered face) and to the side on desktop. */}
            <div className="relative z-20 flex min-h-screen w-full flex-col px-5 pb-16 pt-24 sm:px-8 md:px-12 md:pb-20 md:pt-28">
                {/* Spacer to keep the image visible above the quote on mobile */}
                <div className="flex-1" />

                {isCalm ? (
                    /* ─── CALM MODE: Quote bottom on mobile, left on desktop ─── */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                        className="w-full text-left md:max-w-[55%] lg:max-w-[48%]"
                    >
                        <blockquote className="font-cinematic text-xl font-bold leading-[1.3] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] sm:text-2xl md:text-3xl lg:text-4xl">
                            "Sometimes the bad things that happen in our lives put us directly on the path to the best things that will ever happen to us."
                        </blockquote>
                        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.4em] text-white/85 sm:mt-6 sm:text-[11px]">
                            — Nicole Reed
                        </p>
                    </motion.div>
                ) : (
                    /* ─── RAGE MODE: Quote bottom on mobile, right on desktop ─── */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                        className="w-full text-left md:ml-auto md:max-w-[50%] md:text-right lg:max-w-[44%]"
                    >
                        <blockquote className="font-cinematic text-xl font-bold italic leading-[1.25] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] sm:text-2xl md:text-3xl lg:text-4xl">
                            "If you gaze into the abyss for long, the abyss will gaze back to you."
                        </blockquote>
                        <div className="mt-5 h-px w-12 bg-red-500/70 md:ml-auto md:w-16" />
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: step === 4 ? 1 : 0 }}
                    transition={{ duration: 1 }}
                    className="mt-8 flex justify-center md:mt-10"
                >
                    <ChevronDown className={`h-6 w-6 animate-bounce ${isCalm ? 'text-white/80' : 'text-nolan-aura'}`} />
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
