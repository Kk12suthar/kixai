import React, { useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, type Variants } from 'framer-motion';
import { Menu, Moon, Sun, X } from 'lucide-react';
import type { ThemeMode } from '../types';

interface HeaderProps {
    mode: ThemeMode;
    onChangeMode: (mode: ThemeMode) => void;
    onShatterTrigger: (x: number, y: number) => void;
}

const navItems = [
    { name: 'Side Quest', href: '#sidequests' },
    { name: 'Ask KiX', href: '#chatbot' },
    { name: 'Way of Life', href: '#philosophy' },
    { name: 'Engineer Realm', href: 'https://aikishor.live/about' },
];

const logoStages = ['full', 'initials', 'kiks', 'kix'] as const;
type LogoStage = (typeof logoStages)[number];

// Cinematic easing curves
const EASE_SMOOTH: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_CINEMATIC: [number, number, number, number] = [0.65, 0, 0.35, 1];

// Each stage holds for a tailored duration so the sequence breathes.
const stageDurations: Record<LogoStage, number> = {
    full: 2600,
    initials: 2200,
    kiks: 2000,
    kix: 3400,
};

const LogoMark: React.FC<{ mode: ThemeMode; stage: LogoStage }> = ({ mode, stage }) => {
    const isCalm = mode === 'calm';
    const accent = isCalm ? 'text-slate-900' : 'text-nolan-aura';
    const ghost = isCalm ? 'text-slate-600' : 'text-gray-500/80';

    // Soft smoke dissolve for trailing letters (shor / umar / uthar)
    const smokeVariant: Variants = {
        initial: { opacity: 0, y: 4, filter: 'blur(6px)' },
        animate: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { duration: 0.6, ease: EASE_SMOOTH },
        },
        exit: {
            opacity: 0,
            y: -10,
            filter: 'blur(8px)',
            letterSpacing: '0.06em',
            transition: { duration: 0.7, ease: EASE_CINEMATIC },
        },
    };

    // Subtle glitch for the two initials (K and S)
    const glitchVariant: Variants = {
        animate: {
            x: [0, -1.2, 1.2, -0.6, 0.6, 0],
            y: [0, 0.6, -0.6, 0],
            textShadow: isCalm
                ? [
                      '0 0 0 transparent',
                      '1px 0 6px rgba(71,85,105,0.35)',
                      '-1px 0 6px rgba(148,163,184,0.35)',
                      '0 0 0 transparent',
                  ]
                : [
                      '0 0 0 transparent',
                      '1.5px 0 8px rgba(239,68,68,0.75)',
                      '-1.5px 0 8px rgba(249,115,22,0.55)',
                      '0 0 0 transparent',
                  ],
            transition: { duration: 0.28, repeat: 2, ease: 'easeInOut' },
        },
    };

    // Hero moment for the final X
    const xVariant: Variants = {
        initial: { scale: 1.9, rotate: isCalm ? -4 : -10, opacity: 0, filter: 'blur(6px)' },
        animate: {
            scale: 1,
            rotate: 0,
            opacity: 1,
            filter: 'blur(0px)',
            textShadow: isCalm ? '0 0 22px rgba(148,163,184,0.45)' : '0 0 26px rgba(239,68,68,0.75)',
            transition: { type: 'spring', stiffness: 210, damping: 18, mass: 0.9 },
        },
        exit: {
            scale: 0.6,
            opacity: 0,
            filter: 'blur(6px)',
            transition: { duration: 0.4, ease: EASE_CINEMATIC },
        },
    };

    return (
        <span className="relative inline-flex h-8 items-center align-middle sm:h-10">
            <LayoutGroup id="kix-logo">
                <motion.span
                    layout
                    transition={{ layout: { duration: 0.75, ease: EASE_SMOOTH } }}
                    animate={
                        stage === 'kix'
                            ? { x: [0, -1.5, 1.5, -1, 1, 0], transition: { duration: 0.32, delay: 0.05 } }
                            : { x: 0 }
                    }
                    className="relative z-10 inline-flex items-baseline whitespace-nowrap font-art font-black text-base leading-none tracking-tight sm:text-xl md:text-2xl"
                >
                    {/* Ki — always present, morphs in place */}
                    <motion.span layout className="relative z-10">
                        Ki
                    </motion.span>

                    {/* shor — dissolves after 'full' */}
                    <AnimatePresence mode="popLayout">
                        {stage === 'full' && (
                            <motion.span
                                key="shor"
                                variants={smokeVariant}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className={ghost}
                            >
                                shor
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* gap between names — collapses as we condense */}
                    <motion.span
                        layout
                        className={
                            stage === 'full'
                                ? 'inline-block w-[0.25em] sm:w-[0.35em]'
                                : stage === 'initials'
                                  ? 'inline-block w-[0.15em] sm:w-[0.22em]'
                                  : 'inline-block w-0'
                        }
                    />

                    {/* K — stays through full / initials / kiks */}
                    <AnimatePresence mode="popLayout">
                        {stage !== 'kix' && (
                            <motion.span
                                layout
                                key="k-letter"
                                animate={stage === 'initials' ? 'animate' : undefined}
                                variants={stage === 'initials' ? glitchVariant : undefined}
                                exit={{
                                    opacity: 0,
                                    y: -6,
                                    filter: 'blur(6px)',
                                    transition: { duration: 0.35, ease: EASE_CINEMATIC },
                                }}
                                className={stage === 'kiks' ? accent : undefined}
                            >
                                K
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* umar — dissolves after 'full' */}
                    <AnimatePresence mode="popLayout">
                        {stage === 'full' && (
                            <motion.span
                                key="umar"
                                variants={smokeVariant}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className={ghost}
                            >
                                umar
                            </motion.span>
                        )}
                    </AnimatePresence>

                    <motion.span
                        layout
                        className={
                            stage === 'full'
                                ? 'inline-block w-[0.25em] sm:w-[0.35em]'
                                : stage === 'initials'
                                  ? 'inline-block w-[0.15em] sm:w-[0.22em]'
                                  : 'inline-block w-0'
                        }
                    />

                    {/* S — stays through full / initials / kiks */}
                    <AnimatePresence mode="popLayout">
                        {stage !== 'kix' && (
                            <motion.span
                                layout
                                key="s-letter"
                                animate={stage === 'initials' ? 'animate' : undefined}
                                variants={stage === 'initials' ? glitchVariant : undefined}
                                exit={{
                                    opacity: 0,
                                    y: -6,
                                    filter: 'blur(6px)',
                                    transition: { duration: 0.35, ease: EASE_CINEMATIC },
                                }}
                                className={stage === 'kiks' ? accent : undefined}
                            >
                                S
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* uthar — dissolves after 'full' */}
                    <AnimatePresence mode="popLayout">
                        {stage === 'full' && (
                            <motion.span
                                key="uthar"
                                variants={smokeVariant}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className={`${accent} ${ghost}`}
                            >
                                uthar
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* X — the cinematic finale */}
                    <AnimatePresence>
                        {stage === 'kix' && (
                            <motion.span
                                key="x-letter"
                                variants={xVariant}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className={`relative z-20 ${accent}`}
                            >
                                X
                                <motion.span
                                    initial={{ scale: 0, opacity: 0.8 }}
                                    animate={{ scale: 2.6, opacity: 0 }}
                                    transition={{ duration: 1.1, ease: EASE_SMOOTH }}
                                    className={`pointer-events-none absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full ${
                                        isCalm ? 'border border-slate-500/60' : 'border border-red-400/80'
                                    }`}
                                />
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.span>
            </LayoutGroup>

            {/* Sweeping underline — fades in, holds, fades out */}
            <motion.span
                key={`${stage}-line`}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                    scaleX: [0, 1, 1, 0],
                    opacity: [0, 1, 1, 0],
                    transformOrigin: ['0% 50%', '0% 50%', '100% 50%', '100% 50%'],
                }}
                transition={{ duration: 1.4, times: [0, 0.35, 0.75, 1], ease: EASE_SMOOTH }}
                className={`pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left sm:-bottom-1 sm:h-[1.5px] ${
                    isCalm ? 'bg-slate-700/60' : 'bg-red-400/80'
                }`}
            />

            {/* Soft aura pulse on each stage */}
            <motion.span
                key={`${stage}-aura`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.35, 0], scale: [0.6, 1.2, 1.45] }}
                transition={{ duration: 1.1, ease: EASE_SMOOTH }}
                className={`pointer-events-none absolute left-1/2 top-1/2 h-8 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl sm:h-10 sm:w-28 sm:blur-2xl ${
                    isCalm ? 'bg-slate-400/30' : 'bg-red-500/25'
                }`}
            />

            {/* Shimmer sweep — only on the cinematic finale */}
            {stage === 'kix' && (
                <motion.span
                    initial={{ x: '-120%', opacity: 0 }}
                    animate={{ x: '140%', opacity: [0, 1, 0] }}
                    transition={{ duration: 1.6, ease: EASE_SMOOTH, delay: 0.2 }}
                    className={`pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 ${
                        isCalm
                            ? 'bg-gradient-to-r from-transparent via-white/70 to-transparent'
                            : 'bg-gradient-to-r from-transparent via-white/25 to-transparent'
                    }`}
                    style={{ mixBlendMode: isCalm ? 'normal' : 'overlay' }}
                />
            )}
        </span>
    );
};

const ModeSwitch: React.FC<{
    mode: ThemeMode;
    onChangeMode: (mode: ThemeMode) => void;
    compact?: boolean;
}> = ({ mode, onChangeMode, compact = false }) => {
    const isCalm = mode === 'calm';

    return (
        <div
            className={`relative flex items-center gap-1 rounded-full border p-1 ${
                isCalm
                    ? 'border-slate-300/80 bg-white/85 text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
                    : 'border-white/10 bg-black/50 text-gray-300'
            }`}
            aria-label="Theme mode"
        >
            <motion.span
                layout
                className={`absolute top-1 bottom-1 w-9 rounded-full ${
                    isCalm
                        ? 'left-[42px] bg-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.2)]'
                        : 'left-1 bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.35)]'
                }`}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            />
            {(['rage', 'calm'] as ThemeMode[]).map((value) => {
                const active = value === mode;
                const Icon = value === 'rage' ? Moon : Sun;

                return (
                    <button
                        key={value}
                        type="button"
                        onClick={() => onChangeMode(value)}
                        className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                            active
                                ? 'text-white'
                                : isCalm
                                  ? 'text-slate-500 hover:text-slate-900'
                                  : 'text-gray-400 hover:text-gray-200'
                        }`}
                        aria-label={value === 'calm' ? 'Switch to light mode' : 'Switch to dark mode'}
                        title={value === 'calm' ? 'Light' : 'Dark'}
                    >
                        <Icon className={compact ? 'h-4 w-4' : 'h-4.5 w-4.5'} />
                    </button>
                );
            })}
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ mode, onChangeMode, onShatterTrigger }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [logoStageIndex, setLogoStageIndex] = useState(0);
    const isCalm = mode === 'calm';
    const currentStage = logoStages[logoStageIndex];

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cinematic stage timing — each stage holds for its own duration
    useEffect(() => {
        const hold = stageDurations[currentStage];
        const timer = window.setTimeout(() => {
            setLogoStageIndex((current) => (current + 1) % logoStages.length);
        }, hold);
        return () => window.clearTimeout(timer);
    }, [currentStage]);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        const element = document.querySelector(href);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIsMobileMenuOpen(false);
        }
    };

    return (
        <>
            <motion.header
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.4, ease: EASE_SMOOTH }}
                className={`fixed top-0 left-0 right-0 z-50 transition-[background,border-color,box-shadow,backdrop-filter] duration-700 ease-out ${
                    isScrolled
                        ? isCalm
                            ? 'border-b border-slate-300/60 bg-white/70 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-xl'
                            : 'border-b border-white/10 bg-nolan-black/90 backdrop-blur-md'
                        : 'border-b border-transparent bg-transparent'
                }`}
            >
                <div
                    className={`mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 transition-[padding] duration-500 ease-out ${
                        isScrolled ? 'py-3' : 'py-5'
                    }`}
                >
                    <motion.a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`min-w-0 shrink-0 cursor-pointer font-art font-black transition-colors ${
                            isCalm ? 'text-slate-900 hover:text-slate-700' : 'text-white hover:text-nolan-aura'
                        }`}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    >
                        <LogoMark mode={mode} stage={currentStage} />
                    </motion.a>

                    <nav className="hidden items-center gap-1 md:flex">
                        {navItems.map((item, index) => {
                            const isExternal = item.href.startsWith('/') || item.href.startsWith('http');
                            return (
                                <motion.a
                                    key={item.name}
                                    href={item.href}
                                    onClick={isExternal ? (e) => {
                                        e.preventDefault();
                                        onShatterTrigger(e.clientX, e.clientY);
                                    } : (e) => scrollToSection(e, item.href)}
                                    initial={{ opacity: 0, y: -16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.7 + index * 0.1, ease: EASE_SMOOTH }}
                                    className={`group relative px-4 py-2 text-sm font-cinematic font-semibold transition-colors ${
                                        isCalm ? 'text-slate-700 hover:text-slate-900' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span className="relative z-10">{item.name}</span>
                                    <span
                                        className={`absolute inset-0 border border-transparent transition-all duration-300 ${
                                            isCalm
                                                ? 'group-hover:border-slate-300/70 group-hover:bg-white/60'
                                                : 'group-hover:border-nolan-aura/30 group-hover:bg-nolan-aura/10'
                                        }`}
                                    />
                                </motion.a>
                            );
                        })}

                        <div
                            className={`ml-4 flex items-center gap-3 pl-4 ${
                                isCalm ? 'border-l border-slate-300/60' : 'border-l border-white/10'
                            }`}
                        >
                            <ModeSwitch mode={mode} onChangeMode={onChangeMode} />
                        </div>
                    </nav>

                    <div className="ml-auto flex items-center gap-3 md:hidden">
                        <ModeSwitch mode={mode} onChangeMode={onChangeMode} compact />
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`p-2 transition-colors ${
                                isCalm ? 'text-slate-900 hover:text-slate-700' : 'text-white hover:text-nolan-aura'
                            }`}
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </motion.header>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ duration: 0.35, ease: EASE_SMOOTH }}
                        className={`fixed inset-y-0 right-0 z-40 w-72 border-l p-8 pt-24 backdrop-blur-xl md:hidden ${
                            isCalm
                                ? 'border-slate-300/60 bg-white/88 text-slate-900'
                                : 'border-white/10 bg-nolan-black/95 text-white'
                        }`}
                    >
                        <div className="mb-8">
                            <p
                                className={`mb-2 font-mono text-[10px] uppercase tracking-[0.35em] ${
                                    isCalm ? 'text-slate-700' : 'text-gray-500'
                                }`}
                            >
                                {isCalm ? 'Light Horizon' : 'Dark Horizon'}
                            </p>
                            <p className={`font-tech text-sm ${isCalm ? 'text-slate-800' : 'text-gray-400'}`}>
                                {isCalm
                                    ? 'The same sea, seen without enemies.'
                                    : 'The same sea, seen through revenge and freedom.'}
                            </p>
                        </div>

                        <nav className="flex flex-col gap-2">
                            {navItems.map((item, index) => {
                                const isExternal = item.href.startsWith('/') || item.href.startsWith('http');
                                return (
                                    <motion.a
                                        key={item.name}
                                        href={item.href}
                                        onClick={isExternal ? (e) => {
                                            e.preventDefault();
                                            onShatterTrigger(e.clientX, e.clientY);
                                        } : (e) => scrollToSection(e, item.href)}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`border px-4 py-3 text-base font-cinematic font-semibold transition-all ${
                                            isCalm
                                                ? 'border-slate-300/60 text-slate-700 hover:border-slate-400 hover:bg-white'
                                                : 'border-transparent text-gray-400 hover:border-nolan-aura/30 hover:bg-nolan-aura/10 hover:text-white'
                                        }`}
                                    >
                                        {item.name}
                                    </motion.a>
                                );
                            })}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`fixed inset-0 z-30 md:hidden ${
                            isCalm ? 'bg-slate-900/10 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'
                        }`}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default Header;
