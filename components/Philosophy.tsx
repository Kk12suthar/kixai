import React from 'react';
import { motion } from 'framer-motion';
import type { ThemeMode } from '../types';
import { EASE_SMOOTH, REVEAL_VIEWPORT, fadeRise, fadeScale, drawLine } from '../lib/motion';

interface PhilosophyProps {
    mode: ThemeMode;
    onOpenKrishna: () => void;
}

const Philosophy: React.FC<PhilosophyProps> = ({ mode, onOpenKrishna }) => {
    const isCalm = mode === 'calm';

    return (
        <section
            className={`relative overflow-hidden px-6 py-28 md:py-32 ${
                isCalm ? 'bg-transparent text-slate-900' : 'bg-transparent text-white'
            }`}
        >
            <div
                className={`pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:40px_40px] ${
                    isCalm ? 'opacity-[0.05]' : 'opacity-[0.04]'
                }`}
            />
            <div
                className={`pointer-events-none absolute left-1/2 top-1/4 h-[800px] w-[800px] -translate-x-1/2 rounded-full blur-[200px] ${
                    isCalm ? 'bg-white/70' : 'bg-nolan-aura/10'
                }`}
            />

            <div className="relative z-10 mx-auto max-w-5xl">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={REVEAL_VIEWPORT}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.14 } },
                    }}
                    className="mb-16 text-center md:mb-20"
                >
                    <motion.div variants={fadeRise} className="mb-6 inline-block">
                        <div
                            className={`mb-4 flex items-center justify-center gap-3 text-[11px] font-mono tracking-[0.3em] ${
                                isCalm ? 'text-slate-700' : 'text-nolan-gold'
                            }`}
                        >
                            <span className={`h-px w-10 ${isCalm ? 'bg-slate-300' : 'bg-nolan-gold/70'}`} />
                            PHILOSOPHY_LOADED
                            <span className={`h-px w-10 ${isCalm ? 'bg-slate-300' : 'bg-nolan-gold/70'}`} />
                        </div>
                    </motion.div>

                    <motion.h2
                        variants={fadeScale}
                        className={`mb-4 text-4xl font-cinematic font-black tracking-tight md:text-7xl ${
                            isCalm ? 'text-slate-900' : 'text-white'
                        }`}
                    >
                        {isCalm ? 'THE WHITE SEA' : 'THE WALL OF REVENGE'}
                    </motion.h2>

                    <motion.p
                        variants={fadeRise}
                        className={`text-xl font-tech md:text-2xl ${
                            isCalm
                                ? 'text-slate-800'
                                : 'bg-gradient-to-r from-nolan-aura to-pink-500 bg-clip-text text-transparent'
                        }`}
                    >
                        {isCalm
                            ? 'Peace, restraint, and the soul after violence'
                            : 'Vengeance, resolve, and the price of freedom'}
                    </motion.p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={REVEAL_VIEWPORT}
                    transition={{ duration: 0.9, ease: EASE_SMOOTH }}
                    className="relative"
                >
                    <div
                        className={`pointer-events-none absolute -top-4 -left-4 h-20 w-20 border-l-2 border-t-2 ${
                            isCalm ? 'border-slate-300/70' : 'border-nolan-aura/55'
                        }`}
                    />
                    <div
                        className={`pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 border-r-2 border-b-2 ${
                            isCalm ? 'border-slate-300/70' : 'border-nolan-aura/55'
                        }`}
                    />

                    <div
                        className={`relative border p-8 md:p-14 lg:p-16 ${
                            isCalm
                                ? 'border-slate-300/60 bg-white/72 backdrop-blur-xl'
                                : 'border-white/10 bg-black/40 backdrop-blur-sm'
                        }`}
                    >
                        <div
                            className={`pointer-events-none absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${
                                isCalm
                                    ? 'from-transparent via-slate-300 to-transparent'
                                    : 'from-transparent via-nolan-aura to-transparent'
                            }`}
                        />

                        <div
                            className={`space-y-8 font-tech leading-relaxed ${
                                isCalm ? 'text-slate-700' : 'text-gray-300'
                            }`}
                        >
                            <p className="text-lg md:text-xl">
                                <span
                                    className={
                                        isCalm ? 'font-semibold text-slate-900' : 'font-semibold text-white'
                                    }
                                >
                                    {isCalm
                                        ? 'You don\'t have any enemies. The truth is, nobody has them.'
                                        : 'You do not get given freedom. You take it.'}
                                </span>{' '}
                                {isCalm
                                    ? 'This side is the still water. Hope as a discipline. Love as the one thing that crosses dimensions. Strength shaped not by who you can defeat but by who you choose not to. No score to settle, no enemy to name — only the work, the people you love, and the long, patient walk toward becoming the kind of person the world feels safer around.'
                                    : 'Behind every wall there is a memory of being kept on the other side. This side is the storm — pressure, ambition, the obsession to push forward when standing still was easier. Anger sharpened into discipline. Forward motion as the only honest response to the world.'}
                            </p>

                            <motion.div
                                variants={drawLine}
                                initial="hidden"
                                whileInView="visible"
                                viewport={REVEAL_VIEWPORT}
                                className={`my-8 h-px origin-center bg-gradient-to-r from-transparent ${
                                    isCalm ? 'via-slate-300 to-transparent' : 'via-white/20 to-transparent'
                                }`}
                            />

                            <div
                                className={`my-8 border-l-4 p-6 transition-colors ${
                                    isCalm
                                        ? 'border-slate-400 bg-white/65'
                                        : 'border-nolan-aura bg-nolan-aura/5'
                                }`}
                            >
                                <p
                                    className={`text-lg font-cinematic italic leading-normal md:text-2xl ${
                                        isCalm ? 'text-slate-900' : 'text-white'
                                    }`}
                                >
                                    {isCalm
                                        ? '"Those devotees are very dear to Me who are free from malice toward all living beings, who are friendly and compassionate, free from possessiveness and ego, equipoised in joy and sorrow, ever-forgiving."'
                                        : '"From anger comes delusion; from delusion, bewilderment of memory; from bewilderment, the ruin of reason; and from ruin, one is destroyed."'}
                                </p>
                                <p
                                    className={`mt-4 text-xs font-mono uppercase tracking-[0.3em] ${
                                        isCalm ? 'text-slate-700' : 'text-gray-500'
                                    }`}
                                >
                                    {isCalm
                                        ? 'Shrimad Bhagavad Gita (12.13)'
                                        : 'Shrimad Bhagavad Gita (2.63)'}
                                </p>
                            </div>

                            <p className="text-lg md:text-xl">
                                {isCalm
                                    ? 'Hope is the discipline that survives every winter. Protect your dream — even from the people who say it cannot be done. Love is the bridge that crosses what physics cannot explain. And when you find yourself preoccupied with a single leaf, step back, far enough to see the whole forest.'
                                    : 'The storm is honest about what it costs. Walls become tests; freedom is paid for with sleep, with relationships, with the version of you that used to be softer. The fire is fuel — until the fuel becomes the engine, and the engine becomes the man. Cross the wall knowing it changes you.'}
                            </p>

                            <p
                                className={`text-base md:text-lg ${
                                    isCalm ? 'text-slate-800' : 'text-gray-400'
                                }`}
                            >
                                {isCalm
                                    ? 'This is strength expressed as mercy. Not weakness, not silence — a conscious refusal to live only through revenge. The shore stays the shore, even when you have walked through fire to find it.'
                                    : 'This is the storm sharpened into discipline — pressure used like a blade, never like a weapon turned inward. Even the storm respects the line. The shore is always one breath away.'}
                            </p>
                        </div>

                        <div
                            className={`mt-12 flex items-center gap-4 border-t pt-8 ${
                                isCalm ? 'border-slate-200/70' : 'border-white/5'
                            }`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full animate-pulse ${
                                    isCalm ? 'bg-slate-500' : 'bg-nolan-aura'
                                }`}
                            />
                            <span
                                className={`text-[11px] font-mono uppercase tracking-[0.3em] ${
                                    isCalm ? 'text-slate-700' : 'text-gray-500'
                                }`}
                            >
                                {isCalm
                                    ? 'No Enemies · Star Gazer · Ocean Listener'
                                    : 'Resolve · Poster Wall · Storm Walker'}
                            </span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={REVEAL_VIEWPORT}
                    transition={{ delay: 0.2, duration: 0.8, ease: EASE_SMOOTH }}
                    className="mt-14 text-center"
                >
                    <div className="inline-block">
                        <p
                            className={`mb-4 text-sm font-tech ${
                                isCalm ? 'text-slate-700' : 'text-gray-500'
                            }`}
                        >
                            {isCalm
                                ? 'Krishna AI is the still water at the center of every storm.'
                                : 'When the storm gets loud, the shore is still here. Step out of the noise.'}
                        </p>
                        <motion.button
                            onClick={onOpenKrishna}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                            className={`group relative overflow-hidden rounded-full border px-7 py-3 font-cinematic text-sm tracking-[0.2em] transition-[box-shadow,border-color,background] duration-500 ${
                                isCalm
                                    ? 'border-orange-400/50 bg-gradient-to-r from-orange-400 to-amber-400 text-white shadow-[0_14px_38px_rgba(234,88,12,0.25)] hover:border-orange-500 hover:shadow-[0_20px_48px_rgba(234,88,12,0.35)]'
                                    : 'border-orange-500/40 bg-gradient-to-r from-orange-700 to-amber-700 text-orange-50 shadow-[0_14px_38px_rgba(234,88,12,0.2)] hover:border-orange-400/70 hover:shadow-[0_20px_48px_rgba(234,88,12,0.4)]'
                            }`}
                        >
                            <span className="relative z-10">Seek Divine Guidance</span>
                            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                        </motion.button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    whileInView={{ opacity: 1, scaleX: 1 }}
                    viewport={REVEAL_VIEWPORT}
                    transition={{ delay: 0.3, duration: 1.1, ease: EASE_SMOOTH }}
                    className={`mt-16 h-px w-full origin-center bg-gradient-to-r from-transparent ${
                        isCalm ? 'via-slate-300 to-transparent' : 'via-nolan-aura/70 to-transparent'
                    }`}
                />
            </div>
        </section>
    );
};

export default Philosophy;
