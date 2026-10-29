import React, { useEffect, useRef, useState } from 'react';
import type { ThemeMode } from '../types';
import { copy, posters } from '../content';
import { useReveal } from '../lib/reveal';

const Wall: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const list = posters[mode];
  useReveal(root);

  useEffect(() => {
    const d = box.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (by: number) => setOpen((i) => (i === null ? i : (i + by + list.length) % list.length));
  const shown = open === null ? null : list[open];

  return (
    <section className="wall" ref={root} aria-labelledby="wall-title">
      <div className="wall-head">
        <div data-reveal>
          <h2 className="wall-title" id="wall-title">
            {copy[mode].wallTitle}
          </h2>
        </div>
      </div>
      <div className="wall-grid" data-reveal="stagger">
        {list.map((p, i) => (
          <figure className="poster" key={p.src}>
            <button type="button" className="poster-img" onClick={() => setOpen(i)} aria-label={`Open ${p.title}`}>
              <img src={p.src} alt={p.title} width={p.w} height={p.h} loading="lazy" decoding="async" />
            </button>
            <figcaption>{p.title}</figcaption>
          </figure>
        ))}
      </div>

      <dialog
        className="lightbox"
        ref={box}
        data-lenis-prevent
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === box.current && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        {shown && (
          <figure key={shown.src}>
            <img src={shown.src} alt={shown.title} width={shown.w} height={shown.h} />
            <figcaption>
              {shown.title}
              <span>
                {open! + 1} / {list.length}
              </span>
            </figcaption>
          </figure>
        )}
        <button type="button" className="lb-btn lb-close" onClick={() => setOpen(null)}>
          Close
        </button>
        <button type="button" className="lb-btn lb-prev" onClick={() => step(-1)} aria-label="Previous">
          ←
        </button>
        <button type="button" className="lb-btn lb-next" onClick={() => step(1)} aria-label="Next">
          →
        </button>
      </dialog>
    </section>
  );
};

export default Wall;
