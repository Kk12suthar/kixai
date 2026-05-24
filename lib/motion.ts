// Shared cinematic motion primitives — one set of curves for the whole site.
import type { Variants } from 'framer-motion';

export const EASE_SMOOTH: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_CINEMATIC: [number, number, number, number] = [0.65, 0, 0.35, 1];
export const EASE_SOFT: [number, number, number, number] = [0.4, 0, 0.2, 1];

// Default viewport for scroll-reveal: trigger once the element is ~25% in view
// so things don't animate before the user can see them.
export const REVEAL_VIEWPORT = { once: true, amount: 0.25 } as const;

// Rise-in: gentle opacity + y lift. Feels like a slow shutter settling.
export const fadeRise: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: EASE_SMOOTH },
    },
};

// Softer scale-in for headline elements
export const fadeScale: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 12 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.9, ease: EASE_SMOOTH },
    },
};

// Staggered container helper
export const stagger = (childDelay = 0.08, initialDelay = 0): Variants => ({
    hidden: {},
    visible: {
        transition: {
            staggerChildren: childDelay,
            delayChildren: initialDelay,
        },
    },
});

// Line / divider grow
export const drawLine: Variants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: {
        scaleX: 1,
        opacity: 1,
        transition: { duration: 1.1, ease: EASE_SMOOTH },
    },
};
