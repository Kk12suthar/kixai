import type { ThemeMode } from './types';

/* Everything the site says lives here, split by side. */

export type SigilId =
  | 'paul'
  | 'anakin'
  | 'eren'
  | 'sukuna'
  | 'jinwoo'
  | 'killua'
  | 'gon'
  | 'batman'
  | 'cap'
  | 'superman'
  | 'spiderman'
  | 'musashi'
  | 'thorfinn'
  | 'gojo';

export interface Chapter {
  id: SigilId;
  first: string;
  last: string;
  quote: string;
  quoteBy: string;
  fig: string;
  margin?: { verse: string; ref: string };
}

export interface Poster {
  src: string;
  title: string;
  w: number;
  h: number;
}

interface SideCopy {
  titleTop: string;
  titleBottom: string;
  cross: string;
  castTitle: [string, string];
  wallTitle: string;
}

export const copy: Record<ThemeMode, SideCopy> = {
  rage: {
    titleTop: 'Kishor',
    titleBottom: 'after dark',
    cross: 'Wait for dawn',
    castTitle: ['The ones who', 'saw it coming.'],
    wallTitle: 'Also on the dark wall',
  },
  calm: {
    titleTop: 'Kishor',
    titleBottom: 'at first light',
    cross: 'Let night fall',
    castTitle: ['The ones who', 'hold back.'],
    wallTitle: 'Also on the light wall',
  },
};

export const cast: Record<ThemeMode, Chapter[]> = {
  rage: [
    {
      id: 'paul',
      first: 'Paul',
      last: 'Atreides',
      quote: 'Fear is the mind-killer.',
      quoteBy: 'The Litany Against Fear',
      fig: 'Shai-Hulud',
    },
    {
      id: 'anakin',
      first: 'Anakin',
      last: 'Skywalker',
      quote: 'Fear leads to anger. Anger leads to hate. Hate leads to suffering.',
      quoteBy: 'Yoda, about him',
      fig: 'The blade',
      margin: {
        verse: 'क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः',
        ref: 'Gita 2.63',
      },
    },
    {
      id: 'eren',
      first: 'Eren',
      last: 'Yeager',
      quote: "If you don't fight, you can't win.",
      quoteBy: 'Eren, age ten',
      fig: 'Wings of freedom',
    },
    {
      id: 'sukuna',
      first: 'Ryomen',
      last: 'Sukuna',
      quote: 'Stand proud. You are strong.',
      quoteBy: 'Sukuna, to Jogo',
      fig: 'Malevolent Shrine',
    },
    {
      id: 'jinwoo',
      first: 'Sung',
      last: 'Jinwoo',
      quote: 'Arise.',
      quoteBy: 'Jinwoo, to the dead',
      fig: 'The shadows stand up',
    },
    {
      id: 'killua',
      first: 'Killua',
      last: 'Zoldyck',
      quote: 'You are light. Sometimes you shine so brightly I must look away.',
      quoteBy: 'Killua, about Gon',
      fig: 'Godspeed',
    },
    {
      id: 'gon',
      first: 'Gon',
      last: 'Freecss',
      quote: 'If you want to get to know someone, find out what makes them angry.',
      quoteBy: 'Gon',
      fig: 'Everything, all at once',
    },
  ],
  calm: [
    {
      id: 'batman',
      first: 'Bruce',
      last: 'Wayne',
      quote: "It's not who I am underneath, but what I do that defines me.",
      quoteBy: 'Bruce, to Rachel',
      fig: 'The signal',
    },
    {
      id: 'cap',
      first: 'Steve',
      last: 'Rogers',
      quote: 'I can do this all day.',
      quoteBy: 'Steve, still bleeding',
      fig: 'Vibranium, round',
    },
    {
      id: 'superman',
      first: 'Clark',
      last: 'Kent',
      quote: 'You will give the people of Earth an ideal to strive towards.',
      quoteBy: 'Jor-El',
      fig: 'The S, which means hope',
    },
    {
      id: 'spiderman',
      first: 'Peter',
      last: 'Parker',
      quote: 'With great power comes great responsibility.',
      quoteBy: 'Uncle Ben',
      fig: 'Silk, eight spokes',
    },
    {
      id: 'musashi',
      first: 'Miyamoto',
      last: 'Musashi',
      quote: "Preoccupied with a single leaf, you won't see the tree.",
      quoteBy: 'Takuan, to Musashi',
      fig: 'Ensō, two swords',
    },
    {
      id: 'thorfinn',
      first: 'Thorfinn',
      last: 'Karlsefni',
      quote: 'You have no enemies. Nobody has any enemies.',
      quoteBy: 'Thors, to his son',
      fig: 'Vinland',
    },
    {
      id: 'gojo',
      first: 'Gojo',
      last: 'Satoru',
      quote: 'Throughout heaven and earth, I alone am the honored one.',
      quoteBy: 'Gojo, against Toji',
      fig: 'Unlimited Void',
    },
    {
      id: 'gon',
      first: 'Gon',
      last: 'Freecss',
      quote: 'First comes rock!',
      quoteBy: 'Gon, winding up',
      fig: 'Jajanken',
    },
  ],
};

export const posters: Record<ThemeMode, Poster[]> = {
  rage: [
    { src: '/wall/dune.webp', title: 'Dune', w: 636, h: 960 },
    { src: '/wall/eren_mirror.webp', title: 'Attack on Titan', w: 736, h: 1308 },
    { src: '/wall/gojo.webp', title: 'Jujutsu Kaisen', w: 736, h: 1445 },
    { src: '/wall/toji.webp', title: 'Toji Fushiguro', w: 977, h: 1920 },
    { src: '/wall/oppenheimer.webp', title: 'Oppenheimer', w: 667, h: 1200 },
    { src: '/wall/anime3.webp', title: 'Solo Leveling', w: 736, h: 1308 },
    { src: '/wall/gon.webp', title: 'Hunter × Hunter', w: 735, h: 1303 },
    { src: '/wall/anime2.webp', title: 'Killua', w: 1100, h: 1956 },
  ],
  calm: [
    { src: '/wall/superman.webp', title: 'Superman', w: 599, h: 960 },
    { src: '/wall/vagabond.webp', title: 'Vagabond', w: 675, h: 1200 },
    { src: '/wall/thorfinn.webp', title: 'Vinland Saga', w: 676, h: 1200 },
    { src: '/wall/batman.webp', title: 'The Batman', w: 736, h: 1308 },
    { src: '/wall/shawshank.webp', title: 'The Shawshank Redemption', w: 736, h: 1055 },
    { src: '/wall/interstellar.webp', title: 'Interstellar', w: 736, h: 920 },
    { src: '/wall/happiness.webp', title: 'The Pursuit of Happyness', w: 736, h: 920 },
    { src: '/wall/cricket.webp', title: 'Eighteen years', w: 736, h: 920 },
  ],
};

export const gita = {
  center: {
    ref: 'Bhagavad Gita · 2.47',
    lines: ['कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।', 'मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥'],
    iast: 'karmaṇy evādhikāras te mā phaleṣu kadācana · mā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi',
    english: 'Your right is to the work alone, never to its fruit. Don’t let the fruit be your reason, and don’t fall in love with doing nothing.',
  },
  side: {
    rage: {
      ref: 'Gita 11.32',
      line: 'कालोऽस्मि लोकक्षयकृत्प्रवृद्धो',
      iast: 'kālo ’smi loka-kṣaya-kṛt pravṛddho',
      english: 'I am Time, grown ripe, the destroyer of worlds.',
    },
    calm: {
      ref: 'Gita 6.5',
      line: 'आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः',
      iast: 'ātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ',
      english: 'You alone are your own friend. You alone are your own enemy.',
    },
  },
};

export const socials = [
  { label: 'Instagram', handle: '@kixnematic', href: 'https://instagram.com/kixnematic' },
  { label: 'X', handle: '@kixsuthar82', href: 'https://x.com/kixsuthar82' },
  { label: 'Snapchat', handle: 'ai.kishor', href: 'https://snapchat.com/add/ai.kishor' },
  { label: 'GitHub', handle: 'Kk12suthar', href: 'https://github.com/Kk12suthar' },
  { label: 'LinkedIn', handle: 'Kishor Kumar', href: 'https://www.linkedin.com/in/kishor-kumar-a69946226/' },
  { label: 'Email', handle: 'sutharkishor82@gmail.com', href: 'mailto:sutharkishor82@gmail.com' },
];

export const ENGINEER_REALM_URL: string = import.meta.env.VITE_ENGINEER_REALM_URL || '/about';
