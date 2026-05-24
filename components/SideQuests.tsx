import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus } from 'lucide-react';
import type { ThemeMode } from '../types';
import { EASE_SMOOTH, REVEAL_VIEWPORT } from '../lib/motion';

interface SideQuestsProps {
  mode: ThemeMode;
}

type InterestCategory = 'Character' | 'Cinema' | 'Music' | 'Scripture' | 'Personal';

type InterestStory = {
  id: string;
  category: InterestCategory;
  eyebrow: string;
  title: string;
  summary: string;
  note: string;
  quote: string;
  image?: string;
  imageAlt?: string;
  posterSlot?: string;
  gradient: string;
  aspect: 'wide' | 'poster' | 'square';
  rain?: boolean;
  petals?: boolean;
  stars?: boolean;
};

const storiesByMode: Record<ThemeMode, InterestStory[]> = {
  rage: [
    {
      id: 'rage-toji',
      category: 'Character',
      eyebrow: 'TOJI FUSHIGURO',
      title: 'Toji',
      summary: '',
      note: '',
      quote: 'I know I will be the greatest in my bloodline.',
      image: '/toji.jpg',
      imageAlt: 'Toji Fushiguro',
      gradient: 'from-red-700 via-zinc-950 to-black',
      aspect: 'poster',
    },
    {
      id: 'rage-batman',
      category: 'Cinema',
      eyebrow: 'THE BATMAN',
      title: 'Batman',
      summary: '',
      note: '',
      quote: 'If you make yourself more than just a man, if you devote yourself to an ideal, you become something else entirely.',
      image: '/batman.jpg',
      imageAlt: 'Batman',
      gradient: 'from-stone-950 via-zinc-900 to-black',
      aspect: 'poster',
    },
    {
      id: 'rage-oppenheimer',
      category: 'Cinema',
      eyebrow: 'OPPENHEIMER',
      title: 'Oppenheimer',
      summary: '',
      note: '',
      quote: 'Amateurs seek the sun and get eaten. Power stays in the shadow.',
      image: '/oppenheimer.jpg',
      imageAlt: 'Oppenheimer',
      gradient: 'from-orange-900 via-red-950 to-black',
      aspect: 'poster',
    },
    {
      id: 'rage-gon',
      category: 'Character',
      eyebrow: 'GON FREECSS',
      title: 'Gon',
      summary: '',
      note: '',
      quote: 'All truly strong people are kind.',
      image: '/gon.jpg',
      imageAlt: 'Gon Freecss',
      gradient: 'from-emerald-900 via-zinc-950 to-black',
      aspect: 'poster',
    },
    {
      id: 'rage-gojo',
      category: 'Character',
      eyebrow: 'SATORU GOJO',
      title: 'Gojo',
      summary: '',
      note: '',
      quote: 'Throughout heaven and earth, I alone am the honoured one.',
      image: '/gojo.jpg',
      imageAlt: 'Satoru Gojo',
      gradient: 'from-sky-900 via-indigo-950 to-black',
      aspect: 'poster',
    },
    {
      id: 'rage-eren',
      category: 'Character',
      eyebrow: 'EREN YEAGER',
      title: 'Eren',
      summary: '',
      note: '',
      quote: 'Keep moving forward — till death, even after death. Fight. Fight.',
      image: '/eren_mirror.jpg',
      imageAlt: 'Eren Yeager',
      gradient: 'from-zinc-950 via-red-950 to-black',
      aspect: 'poster',
    },
    {
      id: 'rage-dune',
      category: 'Cinema',
      eyebrow: 'DUNE',
      title: 'Dune',
      summary: '',
      note: '',
      quote: "A great man doesn't seek to lead. He's called to it. And he answers.",
      image: '/Dune.jpg',
      imageAlt: 'Dune',
      gradient: 'from-amber-900 via-stone-950 to-black',
      aspect: 'poster',
    },
  ],
  calm: [
    {
      id: 'calm-shawshank',
      category: 'Cinema',
      eyebrow: 'THE SHAWSHANK REDEMPTION',
      title: 'Shawshank',
      summary: '',
      note: '',
      quote: 'Remember, Red. Hope is a good thing, maybe the best of things, and no good thing ever dies.',
      image: '/shawshank%20redemption%202.jpg',
      imageAlt: 'The Shawshank Redemption',
      gradient: 'from-amber-50 via-white to-stone-100',
      aspect: 'poster',
    },
    {
      id: 'calm-thorfinn',
      category: 'Character',
      eyebrow: 'THORFINN',
      title: 'Thorfinn',
      summary: '',
      note: '',
      quote: "Listen to me, son. You don't have any enemies. The truth is, nobody has them.",
      image: '/thorfinn.jpg',
      imageAlt: 'Thorfinn',
      gradient: 'from-sky-100 via-white to-blue-100',
      aspect: 'poster',
    },
    {
      id: 'calm-superman',
      category: 'Character',
      eyebrow: 'SUPERMAN',
      title: 'Superman',
      summary: '',
      note: '',
      quote: 'You will give the people of Earth an ideal to strive towards. They will race behind you, they will stumble, they will fall. But in time, they will join you in the sun, Kal. In time, you will help them accomplish wonders.',
      image: '/superman.jpg',
      imageAlt: 'Superman',
      gradient: 'from-blue-50 via-white to-indigo-100',
      aspect: 'poster',
    },
    {
      id: 'calm-interstellar',
      category: 'Cinema',
      eyebrow: 'INTERSTELLAR',
      title: 'Interstellar',
      summary: '',
      note: '',
      quote: "Love is the one thing we're capable of perceiving that transcends dimensions.",
      image: '/interstellar.jpg',
      imageAlt: 'Interstellar',
      gradient: 'from-stone-50 via-white to-sky-100',
      aspect: 'poster',
    },
    {
      id: 'calm-happiness',
      category: 'Cinema',
      eyebrow: 'THE PURSUIT OF HAPPYNESS',
      title: 'Happiness',
      summary: '',
      note: '',
      quote: "Don't ever let someone tell you you can't do something. Not even me. You got a dream, you got to protect it. People can't do something themselves, they want to tell you you can't do it. You want something? Go get it. Period.",
      image: '/happiness.jpg',
      imageAlt: 'The Pursuit of Happyness',
      gradient: 'from-amber-50 via-white to-orange-100',
      aspect: 'poster',
    },
    {
      id: 'calm-vagabond',
      category: 'Character',
      eyebrow: 'VAGABOND',
      title: 'Vagabond',
      summary: '',
      note: '',
      quote: "Preoccupied with a single leaf, you won't see the tree. Preoccupied with a single tree, you'll miss the entire forest.",
      image: '/vagabond.jpg',
      imageAlt: 'Vagabond',
      gradient: 'from-stone-50 via-white to-amber-50',
      aspect: 'poster',
    },
  ],
};

// Aspect ratio CSS class for each card type
// poster = 3:4 (750×1000), wide = 16:9 (1600×900), square = 1:1 (1000×1000)
const aspectClasses: Record<InterestStory['aspect'], string> = {
  poster: 'aspect-[3/4]',
  wide: 'aspect-video',    // 16:9
  square: 'aspect-square', // 1:1
};

// ─── Flip Card ────────────────────────────────────────────────────────────────

const FlipCard: React.FC<{
  story: InterestStory;
  mode: ThemeMode;
  index: number;
}> = ({ story, mode, index }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const isCalm = mode === 'calm';

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: 0.8, ease: EASE_SMOOTH, delay: Math.min(index, 3) * 0.08 }}
      className="group"
    >
      {/* 3D flip container */}
      <div
        className={`relative cursor-pointer ${aspectClasses[story.aspect]} w-full`}
        style={{ perspective: '1200px' }}
        onClick={() => setIsFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? `Show image for ${story.title}` : `Show quote for ${story.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped((f) => !f);
          }
        }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* ─── FRONT FACE (Image) ─── */}
          <div
            className={`absolute inset-0 overflow-hidden rounded-[12px] border ${
              isCalm
                ? 'border-slate-300/60 shadow-[0_20px_60px_rgba(148,163,184,0.16)]'
                : 'border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {story.image ? (
              <>
                <img
                  src={story.image}
                  alt={story.imageAlt ?? story.title}
                  loading="lazy"
                  decoding="async"
                  className={`media-rise h-full w-full object-cover ${
                    isCalm
                      ? 'brightness-105 saturate-[0.92]'
                      : 'brightness-[0.85] contrast-110 saturate-[1.05]'
                  }`}
                />
                <div
                  className={`absolute inset-0 ${
                    isCalm
                      ? 'bg-gradient-to-t from-white/40 via-transparent to-transparent'
                      : 'bg-gradient-to-t from-black/55 via-transparent to-transparent'
                  }`}
                />
              </>
            ) : (
              /* Placeholder when no image is set */
              <div className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br ${story.gradient}`}>
                <ImagePlus className={`h-10 w-10 ${isCalm ? 'text-slate-600' : 'text-white/30'}`} />
                <p className={`text-[11px] font-mono uppercase tracking-[0.28em] ${isCalm ? 'text-slate-700' : 'text-white/50'}`}>
                  {story.aspect === 'poster' ? '750 × 1000 px (3:4)' : story.aspect === 'square' ? '1000 × 1000 px (1:1)' : '1600 × 900 px (16:9)'}
                </p>
              </div>
            )}
          </div>

          {/* ─── BACK FACE (Quote) ─── */}
          <div
            className={`absolute inset-0 overflow-hidden rounded-[12px] border ${
              isCalm
                ? 'border-slate-300/60 bg-gradient-to-br from-white via-slate-50 to-white shadow-[0_20px_60px_rgba(148,163,184,0.16)]'
                : 'border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
            }`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center p-8 md:p-12">
              <blockquote
                className={`max-w-lg text-center font-cinematic text-xl italic leading-relaxed md:text-2xl lg:text-3xl ${
                  isCalm ? 'text-slate-800' : 'text-white/90'
                }`}
              >
                {story.quote}
              </blockquote>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
};

// ─── Main Section ─────────────────────────────────────────────────────────────

const SideQuests: React.FC<SideQuestsProps> = ({ mode }) => {
  const isCalm = mode === 'calm';
  const stories = storiesByMode[mode];

  return (
    <section
      className={`relative overflow-hidden px-6 py-28 md:py-32 ${
        isCalm ? 'bg-transparent text-slate-900' : 'bg-transparent text-white'
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isCalm
            ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.58),transparent_42%)]'
            : 'bg-film-grain opacity-10'
        }`}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={REVEAL_VIEWPORT}
          transition={{ duration: 0.8, ease: EASE_SMOOTH }}
          className="mb-14 text-center md:mb-16"
        >
          <h2
            className={`text-xs font-mono tracking-[0.35em] md:tracking-[0.5em] ${
              isCalm ? 'text-slate-800' : 'text-nolan-gold'
            }`}
          >
            {isCalm ? 'SEA OF INTERESTS' : 'SIDE QUESTS'}
          </h2>
        </motion.div>

        {/* Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story, index) => (
            <FlipCard key={story.id} story={story} mode={mode} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SideQuests;
