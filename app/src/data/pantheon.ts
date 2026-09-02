import { colors } from '../theme';

export type ChapterIconKind = 'emoji' | 'material';

export interface Chapter {
  name: string; // internal English id — used as a lookup key elsewhere, never shown to the player
  nameFr: string; // display name, French
  icon: string; // emoji glyph OR MaterialCommunityIcons name, per `iconKind`
  iconKind: ChapterIconKind;
  color: string;
  from: number;
  to: number;
}

export const CHAPTERS: Chapter[] = [
  { name: "Hermes' Trailhead", nameFr: "Sentier d'Hermès", icon: '🪽', iconKind: 'emoji', color: colors.cHermes, from: 1, to: 10 },
  { name: "Athena's Archive", nameFr: "Archives d'Athéna", icon: 'owl', iconKind: 'material', color: colors.cAthena, from: 11, to: 20 },
  { name: "Poseidon's Depths", nameFr: 'Abysses de Poséidon', icon: '🔱', iconKind: 'emoji', color: colors.cPoseidon, from: 21, to: 30 },
  { name: "Ares' Arena", nameFr: "Arène d'Arès", icon: 'sword-cross', iconKind: 'material', color: colors.cAres, from: 31, to: 40 },
  { name: "Zeus' Summit", nameFr: 'Sommet de Zeus', icon: 'flash', iconKind: 'material', color: colors.cZeus, from: 41, to: 50 },
];

export function chapterFor(n: number): Chapter {
  return CHAPTERS.find((c) => n >= c.from && n <= c.to) ?? CHAPTERS[CHAPTERS.length - 1];
}

export const TOTAL_LEVELS = 50;

export type LevelState = 'done' | 'current' | 'locked';

export interface LevelInfo {
  n: number;
  isReward: boolean;
  state: LevelState;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  prize: number;
}

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Maya', score: 15420, prize: 50 },
  { rank: 2, name: 'Jonas', score: 14110, prize: 40 },
  { rank: 3, name: 'Priya', score: 13290, prize: 30 },
  { rank: 4, name: 'Diego', score: 12040, prize: 20 },
  { rank: 5, name: 'Lena', score: 11870, prize: 20 },
  { rank: 6, name: 'Omar', score: 11320, prize: 15 },
  { rank: 7, name: 'Fatou', score: 10980, prize: 15 },
  { rank: 8, name: 'Théo', score: 10510, prize: 10 },
  { rank: 9, name: 'Nina', score: 9870, prize: 10 },
  { rank: 10, name: 'Kwame', score: 9420, prize: 10 },
];

export const LB_AVATAR_COLORS = ['#C79A2E', '#8A5A22', '#B7AE9A', '#6E4A1C', '#D9B25A'];
