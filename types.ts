export type ThemeMode = 'rage' | 'calm';

export interface Project {
  id: string;
  title: string;
  description: string;
  tech: string[];
  image: string;
}

export interface CricketStat {
  label: string;
  value: string;
  desc: string;
}

export interface AnimeFavorite {
  title: string;
  quote: string;
  image: string;
}

export interface MovieInspiration {
  title: string;
  director: string;
  impact: string;
  image: string;
}
