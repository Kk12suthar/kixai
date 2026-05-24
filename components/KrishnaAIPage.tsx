import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { generateKrishnaAdvice } from '../services/geminiService';
import { EASE_SMOOTH } from '../lib/motion';

interface KrishnaAIPageProps {
    onClose: () => void;
}

const devanagariPattern = /[\u0900-\u097F]/;

const KrishnaAIPage: React.FC<KrishnaAIPageProps> = ({ onClose }) => {
    const [question, setQuestion] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const askKrishna = async () => {
        if (!question.trim() || isLoading) return;

        setIsLoading(true);
        setResponse('');

        try {
            const reply = await generateKrishnaAdvice(question);
            setResponse(reply || 'कृपया पुनः प्रयास करें। (Please try again.)');
        } catch (error: any) {
            setResponse(error?.message || 'संपर्क में त्रुटि हुई। कृपया पुनः प्रयास करें।');
        } finally {
            setIsLoading(false);
        }
    };

    const formatResponse = (text: string) => {
        return text.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return null;

            if (trimmed.includes('॥') || trimmed.startsWith('श्लोक') || trimmed.startsWith('।।')) {
                return (
                    <p key={i} className="my-2 text-base font-semibold leading-relaxed text-orange-700 md:text-lg">
                        {trimmed}
                    </p>
                );
            }

            if (
                /^transliteration/i.test(trimmed) ||
                /^english/i.test(trimmed) ||
                /^hindi/i.test(trimmed) ||
                /^sanskrit/i.test(trimmed) ||
                trimmed.includes('कृष्ण उवाच') ||
                trimmed.includes('हिंदी अर्थ')
            ) {
                return (
                    <p
                        key={i}
                        className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-[0.28em] text-orange-500"
                    >
                        {trimmed}
                    </p>
                );
            }

            if (devanagariPattern.test(trimmed)) {
                return (
                    <p key={i} className="my-2 leading-relaxed text-amber-950/85">
                        {trimmed}
                    </p>
                );
            }

            return (
                <p key={i} className="my-2 leading-relaxed text-slate-700">
                    {trimmed}
                </p>
            );
        });
    };

    const suggestedQuestions = [
        'How do I find my purpose?',
        'How to overcome fear?',
        'What is true detachment?',
        'How to stay calm in chaos?',
    ];

    const canSubmit = question.trim().length > 0 && !isLoading;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_SMOOTH }}
            className="fixed inset-0 z-[100] overflow-y-auto bg-[#fff8ef]"
        >
            <div className="pointer-events-none fixed inset-0">
                <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 1px 1px, rgba(249,115,22,0.45) 1px, transparent 0)',
                        backgroundSize: '28px 28px',
                    }}
                />
                <motion.div
                    animate={{ opacity: [0.6, 0.85, 0.6], scale: [1, 1.04, 1] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-amber-200/60 blur-[180px]"
                />
                <motion.div
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="absolute bottom-0 right-[10%] h-[420px] w-[420px] rounded-full bg-orange-100/80 blur-[160px]"
                />
                <div className="wave-line absolute bottom-[-6%] left-[-10%] h-[26%] w-[120%] rounded-[100%] bg-gradient-to-t from-white/85 via-white/10 to-transparent" />
            </div>

            <motion.button
                onClick={onClose}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.5, ease: EASE_SMOOTH }}
                whileHover={{ x: -3 }}
                className="fixed left-6 top-6 z-50 flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-2 text-orange-700/80 backdrop-blur-sm transition-colors duration-300 hover:border-orange-300 hover:text-orange-600"
                aria-label="Return"
            >
                <ArrowLeft className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.28em]">Return</span>
            </motion.button>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20">
                <div className="w-full max-w-3xl">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: {},
                            visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
                        }}
                        className="mb-10 text-center"
                    >
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, scale: 0.9 },
                                visible: {
                                    opacity: 1,
                                    scale: 1,
                                    transition: { duration: 0.8, ease: EASE_SMOOTH },
                                },
                            }}
                            className="mb-4 font-serif text-5xl text-orange-500/60"
                        >
                            ॐ
                        </motion.div>

                        <motion.h1
                            variants={{
                                hidden: { opacity: 0, y: 14 },
                                visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: { duration: 0.8, ease: EASE_SMOOTH },
                                },
                            }}
                            className="mb-2 text-2xl font-cinematic font-bold tracking-wide text-slate-900 md:text-3xl"
                        >
                            Seek Wisdom from{' '}
                            <span className="text-orange-500">Shree Krishna</span>
                        </motion.h1>

                        <motion.p
                            variants={{
                                hidden: { opacity: 0, y: 10 },
                                visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: { duration: 0.7, ease: EASE_SMOOTH },
                                },
                            }}
                            className="font-tech text-xs tracking-[0.2em] text-slate-500"
                        >
                            श्रीमद्भगवद्गीता · Divine Counsel in a quiet sanctuary
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.7, ease: EASE_SMOOTH }}
                        className="mb-8"
                    >
                        <div className="relative overflow-hidden rounded-[28px] border border-orange-200/80 bg-white/85 p-2 shadow-[0_20px_50px_rgba(251,191,36,0.12)] backdrop-blur-xl transition-shadow duration-300 focus-within:shadow-[0_22px_56px_rgba(234,88,12,0.22)]">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && askKrishna()}
                                placeholder="What troubles your mind, dear seeker?"
                                className="w-full bg-transparent px-5 py-4 pr-28 font-tech text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                            />
                            <motion.button
                                onClick={askKrishna}
                                disabled={!canSubmit}
                                whileHover={canSubmit ? { scale: 1.03 } : undefined}
                                whileTap={canSubmit ? { scale: 0.97 } : undefined}
                                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                                className={`absolute right-2 top-2 h-[calc(100%-1rem)] rounded-full px-6 text-[11px] font-mono uppercase tracking-[0.24em] transition-colors duration-300 ${
                                    canSubmit
                                        ? 'bg-orange-600 text-orange-50 hover:bg-orange-700'
                                        : 'cursor-not-allowed bg-orange-100 text-orange-300'
                                }`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-1">
                                        <span className="animate-pulse">·</span>
                                        <span className="animate-pulse" style={{ animationDelay: '150ms' }}>
                                            ·
                                        </span>
                                        <span className="animate-pulse" style={{ animationDelay: '300ms' }}>
                                            ·
                                        </span>
                                    </span>
                                ) : (
                                    'Ask'
                                )}
                            </motion.button>
                        </div>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {isLoading && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.45, ease: EASE_SMOOTH }}
                                className="py-16 text-center"
                            >
                                <motion.div
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                    className="mb-4 text-3xl text-orange-500/70"
                                >
                                    ।।
                                </motion.div>
                                <p className="font-tech text-sm text-orange-500/80">
                                    Lord Krishna contemplates…
                                </p>
                            </motion.div>
                        )}

                        {response && !isLoading && (
                            <motion.div
                                key="response"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.6, ease: EASE_SMOOTH }}
                                className="rounded-[32px] border border-orange-200/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl md:p-8"
                            >
                                <div className="mb-6 flex items-center gap-3 border-b border-orange-100 pb-4">
                                    <div className="text-xl text-orange-500/80">।।</div>
                                    <div>
                                        <p className="font-cinematic text-sm text-orange-600">
                                            श्री कृष्ण उवाच
                                        </p>
                                        <p className="text-[11px] font-mono tracking-[0.22em] text-slate-400">
                                            Lord Krishna speaks
                                        </p>
                                    </div>
                                </div>

                                <div className="font-tech text-sm leading-7">
                                    {formatResponse(response)}
                                </div>

                                <div className="mt-8 border-t border-orange-100 pt-4 text-center">
                                    <p className="text-[11px] font-mono tracking-[0.28em] text-orange-400/70">
                                        ।। श्रीमद्भगवद्गीता ।।
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {!response && !isLoading && (
                            <motion.div
                                key="suggestions"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.2, duration: 0.6, ease: EASE_SMOOTH }}
                            >
                                <p className="mb-4 text-center text-[11px] font-mono tracking-[0.28em] text-slate-400">
                                    OR SEEK GUIDANCE ON
                                </p>
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        hidden: {},
                                        visible: {
                                            transition: { staggerChildren: 0.07, delayChildren: 0.25 },
                                        },
                                    }}
                                    className="flex flex-wrap justify-center gap-2"
                                >
                                    {suggestedQuestions.map((q, i) => (
                                        <motion.button
                                            key={i}
                                            variants={{
                                                hidden: { opacity: 0, y: 8 },
                                                visible: {
                                                    opacity: 1,
                                                    y: 0,
                                                    transition: { duration: 0.5, ease: EASE_SMOOTH },
                                                },
                                            }}
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => setQuestion(q)}
                                            className="rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-xs font-tech text-slate-500 transition-colors duration-300 hover:border-orange-300 hover:bg-white hover:text-orange-600"
                                        >
                                            {q}
                                        </motion.button>
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8, ease: EASE_SMOOTH }}
                        className="mt-16 text-center text-xs italic font-tech text-orange-500/50"
                    >
                        "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत…"
                    </motion.p>
                </div>
            </div>
        </motion.div>
    );
};

export default KrishnaAIPage;
