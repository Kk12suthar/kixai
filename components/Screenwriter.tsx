import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Sparkles, Terminal } from 'lucide-react';
import { generateCinematicPlot } from '../services/geminiService';
import type { ThemeMode } from '../types';
import { EASE_SMOOTH, REVEAL_VIEWPORT, fadeRise } from '../lib/motion';

interface ScreenwriterProps {
    mode: ThemeMode;
}

const Screenwriter: React.FC<ScreenwriterProps> = ({ mode }) => {
    const [input, setInput] = useState('');
    const [script, setScript] = useState('');
    const [loading, setLoading] = useState(false);
    const isCalm = mode === 'calm';

    // The answer is voiced through whichever philosophy is active. When the
    // user flips modes, the previous answer no longer represents the current
    // voice — wipe it so the panel returns to its empty state.
    useEffect(() => {
        setScript('');
    }, [mode]);

    const handleAction = async () => {
        if (!input.trim() || loading) return;
        setLoading(true);
        setScript('');

        try {
            const response = await generateCinematicPlot(input, mode);
            setScript(response);
        } catch (error) {
            setScript(
                isCalm
                    ? 'The shore is quiet right now. Ask once more in a moment.'
                    : 'The signal snapped in the storm. Ask again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl/Cmd+Enter to submit for easier UX on desktop
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleAction();
        }
    };

    return (
        <section
            className={`relative overflow-hidden border-t px-6 py-28 md:py-32 ${
                isCalm ? 'border-slate-300/50 text-slate-900' : 'border-white/5 text-white'
            }`}
        >
            <div
                className={`pointer-events-none absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full blur-[120px] ${
                    isCalm ? 'bg-white/70' : 'bg-nolan-aura/10'
                }`}
            />

            <div className="relative z-10 mx-auto max-w-6xl">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={REVEAL_VIEWPORT}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.15 } },
                    }}
                    className="flex flex-col items-start gap-10 md:flex-row md:gap-12"
                >
                    {/* Left column */}
                    <motion.div variants={fadeRise} className="w-full space-y-6 md:w-[38%]">
                        <div>
                            <h2
                                className={`mb-3 text-4xl font-art font-bold tracking-tight ${
                                    isCalm ? 'text-slate-900' : 'text-white'
                                }`}
                            >
                                THE{' '}
                                <span className={isCalm ? 'text-slate-900' : 'text-nolan-aura'}>
                                    KIX
                                </span>
                            </h2>
                            <p
                                className={`text-sm font-tech leading-6 ${
                                    isCalm ? 'text-slate-800' : 'text-gray-500'
                                }`}
                            >
                                {isCalm
                                    ? 'Ask KiX from the quiet shore. The answer comes back gentle, wise, and steady.'
                                    : 'Ask anything about KiX and let the storm answer back with ruthless force.'}
                            </p>
                        </div>

                        <div
                            className={`rounded-xl border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] ${
                                isCalm
                                    ? 'border-slate-300/60 bg-white/72 backdrop-blur-xl'
                                    : 'border-white/10 bg-[#0a0a0a]'
                            }`}
                        >
                            <div
                                className={`mb-4 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.28em] ${
                                    isCalm ? 'text-slate-700' : 'text-nolan-aura'
                                }`}
                            >
                                <Terminal className="h-4 w-4" />
                                {isCalm ? 'Reflection_Journal' : 'Input_Terminal'}
                            </div>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    isCalm
                                        ? 'Ex: what kind of peace does Kishor carry under pressure?'
                                        : 'Ex: what kind of fire drives Kishor when the pressure rises?'
                                }
                                className={`mb-4 h-32 w-full resize-none rounded-lg border p-4 text-sm font-mono leading-6 transition-colors duration-300 focus:outline-none ${
                                    isCalm
                                ? 'border-slate-300/60 bg-white/80 text-slate-900 placeholder:text-slate-500 focus:border-slate-500 focus:bg-white'
                                        : 'border-white/10 bg-black/50 text-white placeholder:text-gray-600 focus:border-nolan-aura focus:bg-black/70'
                                }`}
                            />
                            <motion.button
                                onClick={handleAction}
                                disabled={loading || !input.trim()}
                                whileHover={loading || !input.trim() ? undefined : { scale: 1.015 }}
                                whileTap={loading || !input.trim() ? undefined : { scale: 0.985 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                                className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-md py-3 font-bold font-tech uppercase tracking-[0.24em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isCalm
                                        ? 'bg-slate-900 text-white hover:bg-slate-700'
                                        : 'bg-white text-black hover:bg-nolan-aura hover:text-white'
                                }`}
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {loading ? (
                                        <motion.span
                                            key="loading"
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Processing
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="idle"
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {isCalm ? 'Seek Clarity' : 'Ignite Query'}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                            <p
                                className={`mt-3 text-[10px] font-mono uppercase tracking-[0.24em] ${
                                    isCalm ? 'text-slate-600' : 'text-gray-600'
                                }`}
                            >
                                Tip: press Ctrl + Enter to send
                            </p>
                        </div>
                    </motion.div>

                    {/* Right column — output */}
                    <motion.div variants={fadeRise} className="w-full md:w-[62%]">
                        <div
                            className={`relative min-h-[400px] overflow-hidden rounded-xl border p-7 md:p-11 ${
                                isCalm
                                    ? 'border-slate-300/60 bg-white/76 shadow-[0_24px_60px_rgba(148,163,184,0.12)] backdrop-blur-xl'
                                    : 'border-white/10 bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.2)]'
                            }`}
                        >
                            <div
                                className={`pointer-events-none absolute inset-0 ${
                                    isCalm
                                        ? 'bg-gradient-to-br from-white/90 via-white/20 to-transparent'
                                        : 'bg-gradient-to-br from-white/5 to-transparent'
                                }`}
                            />
                            {/* Animated top scanline on both themes */}
                            <div
                                className={`pointer-events-none absolute left-0 top-0 h-[2px] w-full ${
                                    isCalm
                                        ? 'bg-gradient-to-r from-transparent via-slate-500/70 to-transparent'
                                        : 'bg-gradient-to-r from-transparent via-nolan-aura/70 to-transparent'
                                }`}
                            />
                            {!isCalm && (
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] animate-scanline-smooth bg-gradient-to-r from-transparent via-nolan-aura/50 to-transparent" />
                            )}

                            <AnimatePresence mode="wait">
                                {!script && !loading && (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, ease: EASE_SMOOTH }}
                                        className={`flex min-h-[340px] flex-col items-center justify-center ${
                                            isCalm ? 'text-slate-600' : 'text-gray-700'
                                        }`}
                                    >
                                        <motion.div
                                            animate={{ y: [0, -6, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                        >
                                            <Sparkles className="mb-4 h-12 w-12 opacity-70" />
                                        </motion.div>
                                        <p className="font-mono text-xs uppercase tracking-[0.3em]">
                                            Waiting for Input…
                                        </p>
                                    </motion.div>
                                )}

                                {loading && (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.4, ease: EASE_SMOOTH }}
                                        className="relative z-10"
                                    >
                                        <div
                                            className={`mb-8 flex items-center justify-between border-b pb-4 ${
                                                isCalm ? 'border-slate-200/70' : 'border-white/5'
                                            }`}
                                        >
                                            <span
                                                className={`text-[11px] font-mono uppercase tracking-[0.28em] ${
                                                    isCalm ? 'text-slate-700' : 'text-nolan-aura'
                                                }`}
                                            >
                                                {isCalm ? 'SEA LOG // QUIET CHANNEL' : 'WAR LOG // RED CHANNEL'}
                                            </span>
                                            <span className="flex gap-2">
                                                <span
                                                    className={`h-2 w-2 rounded-full animate-pulse ${
                                                        isCalm ? 'bg-sky-400/70' : 'bg-red-500'
                                                    }`}
                                                />
                                                <span
                                                    className={`h-2 w-2 rounded-full animate-pulse ${
                                                        isCalm ? 'bg-slate-400' : 'bg-yellow-500'
                                                    }`}
                                                    style={{ animationDelay: '200ms' }}
                                                />
                                                <span
                                                    className={`h-2 w-2 rounded-full animate-pulse ${
                                                        isCalm ? 'bg-slate-300' : 'bg-green-500'
                                                    }`}
                                                    style={{ animationDelay: '400ms' }}
                                                />
                                            </span>
                                        </div>
                                        <div
                                            className={`font-mono text-sm leading-7 ${
                                                isCalm ? 'text-slate-700' : 'text-nolan-aura'
                                            }`}
                                        >
                                            <motion.p
                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                transition={{
                                                    duration: 1.6,
                                                    repeat: Infinity,
                                                    ease: 'easeInOut',
                                                }}
                                            >
                                                {isCalm
                                                    ? '> Listening to the rain…'
                                                    : '> Summoning the storm…'}
                                            </motion.p>
                                            <motion.p
                                                animate={{ opacity: [0.5, 1, 0.5] }}
                                                transition={{
                                                    duration: 1.6,
                                                    repeat: Infinity,
                                                    ease: 'easeInOut',
                                                    delay: 0.4,
                                                }}
                                            >
                                                {isCalm
                                                    ? '> Letting the answer settle…'
                                                    : '> Locking onto the answer…'}
                                            </motion.p>
                                        </div>
                                    </motion.div>
                                )}

                                {script && !loading && (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.6, ease: EASE_SMOOTH }}
                                        className="relative z-10"
                                    >
                                        <div
                                            className={`mb-8 flex items-center justify-between border-b pb-4 ${
                                                isCalm ? 'border-slate-300/70' : 'border-white/5'
                                            }`}
                                        >
                                            <span
                                                className={`text-[11px] font-mono uppercase tracking-[0.28em] ${
                                                    isCalm ? 'text-slate-700' : 'text-nolan-aura'
                                                }`}
                                            >
                                                {isCalm ? 'SEA LOG // QUIET CHANNEL' : 'WAR LOG // RED CHANNEL'}
                                            </span>
                                            <span className="flex gap-2">
                                                <span
                                                    className={`h-2 w-2 rounded-full ${
                                                        isCalm ? 'bg-sky-400/70' : 'bg-red-500'
                                                    }`}
                                                />
                                                <span
                                                    className={`h-2 w-2 rounded-full ${
                                                        isCalm ? 'bg-slate-400' : 'bg-yellow-500'
                                                    }`}
                                                />
                                                <span
                                                    className={`h-2 w-2 rounded-full ${
                                                        isCalm ? 'bg-slate-300' : 'bg-green-500'
                                                    }`}
                                                />
                                            </span>
                                        </div>
                                        <p
                                            className={`whitespace-pre-line text-base font-mono leading-8 md:text-lg ${
                                                isCalm ? 'text-slate-700' : 'text-gray-200'
                                            }`}
                                        >
                                            <span
                                                className={`mr-2 ${
                                                    isCalm ? 'text-slate-700' : 'text-nolan-aura'
                                                }`}
                                            >
                                                &gt;
                                            </span>
                                            {script}
                                            <span
                                                className={`caret-blink ml-1 inline-block h-5 w-[8px] align-middle ${
                                                    isCalm ? 'bg-slate-700' : 'bg-nolan-aura'
                                                }`}
                                            />
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};

export default Screenwriter;
