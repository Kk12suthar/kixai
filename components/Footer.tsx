import React from 'react';
import { motion } from 'framer-motion';
import type { ThemeMode } from '../types';
import { EASE_SMOOTH, REVEAL_VIEWPORT } from '../lib/motion';

interface FooterProps {
    mode: ThemeMode;
}

const Footer: React.FC<FooterProps> = ({ mode }) => {
    const isCalm = mode === 'calm';

    const socialLinks = [
        {
            href: 'https://instagram.com/kixnematic',
            label: 'Instagram',
            hoverColor: isCalm ? 'group-hover:text-slate-900' : 'group-hover:text-pink-400',
            hoverBg: isCalm
                ? 'hover:border-slate-400 hover:bg-white'
                : 'hover:border-pink-500/50 hover:bg-pink-500/10',
            icon: (
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            ),
        },
        {
            href: 'https://snapchat.com/add/ai.kishor',
            label: 'Snapchat',
            hoverColor: isCalm ? 'group-hover:text-slate-900' : 'group-hover:text-yellow-300',
            hoverBg: isCalm
                ? 'hover:border-slate-400 hover:bg-white'
                : 'hover:border-yellow-400/50 hover:bg-yellow-400/10',
            icon: (
                <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3 0 .605-.15.857-.354.354-.284.729-.598 1.249-.773.195-.066.38-.099.552-.099.535 0 .947.249 1.221.716.281.479.354 1.119.213 1.853-.11.578-.655 1.528-1.639 2.154-.192.122-.39.22-.595.293.06.045.12.09.181.136.572.421 1.25.923 1.673 1.676.435.773.569 1.669.396 2.656-.212 1.192-1.121 2.108-2.513 2.522-1.423.423-3.264.45-5.218-.041-1.034-.26-2.01-.61-2.906-.975-1.017-.415-1.965-.79-2.934-.79-.297 0-.6.039-.901.119l-.057.015c-.465.119-.932.24-1.431.24-.12 0-.239-.009-.357-.027-.594-.09-1.066-.396-1.413-.912-.34-.506-.545-1.137-.613-1.877-.069-.746-.045-1.554.071-2.401.18-1.302.539-2.694 1.065-4.134.526-1.44 1.217-2.929 2.054-4.422C6.623 1.804 7.49.793 12.206.793z" />
            ),
        },
        {
            href: 'https://x.com/kixsuthar82',
            label: 'X',
            hoverColor: isCalm ? 'group-hover:text-slate-900' : 'group-hover:text-nolan-aura',
            hoverBg: isCalm
                ? 'hover:border-slate-400 hover:bg-white'
                : 'hover:border-nolan-aura/50 hover:bg-nolan-aura/10',
            icon: (
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            ),
        },
    ];

    return (
        <footer
            className={`relative overflow-hidden border-t py-16 md:py-20 ${
                isCalm ? 'border-slate-300/60 text-slate-900' : 'border-white/10 text-white'
            }`}
        >
            <div
                className={`pointer-events-none absolute left-1/2 top-0 h-[200px] w-[600px] -translate-x-1/2 rounded-full blur-[150px] ${
                    isCalm ? 'bg-white/75' : 'bg-nolan-aura/10'
                }`}
            />
            <div
                className={`pointer-events-none absolute bottom-0 left-[-8%] h-28 w-[116%] rounded-[100%] ${
                    isCalm ? 'bg-gradient-to-t from-white/55 to-transparent' : 'bg-gradient-to-t from-nolan-aura/[0.08] to-transparent'
                }`}
            />

            <div className="relative z-10 mx-auto max-w-7xl px-6">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={REVEAL_VIEWPORT}
                    transition={{ duration: 0.8, ease: EASE_SMOOTH }}
                    className="mb-12 text-center"
                >
                    <h3
                        className={`mb-4 text-2xl font-cinematic font-bold md:text-3xl ${
                            isCalm ? 'text-slate-900' : 'text-white'
                        }`}
                    >
                        {isCalm ? 'Meet KiX at the Quiet Shore' : 'Connect with KiX'}
                    </h3>
                    <p
                        className={`mx-auto max-w-2xl text-sm font-tech leading-7 md:text-base ${
                            isCalm ? 'text-slate-800' : 'text-gray-400'
                        }`}
                    >
                        {isCalm
                            ? 'The rage can exist, but it does not have to rule. Beyond the sea there can still be rain, astronomy, flowers, and room to begin again.'
                            : 'The storm still moves forward here. The horizon remains cinematic, restless, and bright with aura.'}
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={REVEAL_VIEWPORT}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
                    }}
                    className="mb-10 flex justify-center gap-5"
                >
                    {socialLinks.map((link) => (
                        <motion.a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={link.label}
                            variants={{
                                hidden: { opacity: 0, y: 16 },
                                visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: { duration: 0.6, ease: EASE_SMOOTH },
                                },
                            }}
                            whileHover={{ y: -3, scale: 1.08 }}
                            whileTap={{ scale: 0.94 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                            className={`group rounded-full border p-4 backdrop-blur-sm transition-[background,border-color,box-shadow] duration-300 ${
                                isCalm
                                    ? `border-slate-300/60 bg-white/70 shadow-[0_6px_18px_rgba(148,163,184,0.12)] ${link.hoverBg}`
                                    : `border-white/10 bg-black/40 ${link.hoverBg}`
                            }`}
                        >
                            <svg
                                className={`h-6 w-6 transition-colors duration-300 ${
                                    isCalm ? 'text-slate-700' : 'text-gray-400'
                                } ${link.hoverColor}`}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {link.icon}
                            </svg>
                        </motion.a>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    whileInView={{ scaleX: 1, opacity: 1 }}
                    viewport={REVEAL_VIEWPORT}
                    transition={{ duration: 1.1, ease: EASE_SMOOTH }}
                    className={`mb-8 h-px w-full origin-center bg-gradient-to-r from-transparent ${
                        isCalm ? 'via-slate-300 to-transparent' : 'via-white/15 to-transparent'
                    }`}
                />

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={REVEAL_VIEWPORT}
                    transition={{ duration: 0.8, ease: EASE_SMOOTH }}
                    className={`text-center text-[11px] font-tech uppercase tracking-[0.3em] ${
                        isCalm ? 'text-slate-700' : 'text-gray-600'
                    }`}
                >
                    © {new Date().getFullYear()} Ki
                    <span className={isCalm ? 'text-slate-900' : 'text-nolan-aura'}>X</span>.{' '}
                    {isCalm ? 'The sea is quieter here.' : 'The definition of aura.'}
                </motion.p>
            </div>
        </footer>
    );
};

export default Footer;
