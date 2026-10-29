import { useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scroll reveals inside a section.
 *   data-reveal="mask"  → each `.mask > span` slides up out of its own clip
 *   data-reveal         → the element rises and fades in
 *   data-reveal="stagger" → its direct children rise one after another */
export const useReveal = (scope: RefObject<HTMLElement>) => {
  useLayoutEffect(() => {
    if (!scope.current || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        const kind = el.dataset.reveal;
        const st = { trigger: el, start: 'top 86%', once: true };
        if (kind === 'mask') {
          gsap.from(el.querySelectorAll('.mask > span'), {
            yPercent: 112,
            duration: 1.4,
            ease: 'expo.out',
            stagger: 0.1,
            scrollTrigger: st,
          });
        } else if (kind === 'stagger') {
          gsap.from(el.children, {
            y: 40,
            opacity: 0,
            duration: 1.2,
            ease: 'expo.out',
            stagger: 0.09,
            scrollTrigger: st,
          });
        } else {
          gsap.from(el, { y: 36, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: st });
        }
      });
    }, scope);
    return () => ctx.revert();
  }, [scope]);
};
