import { create } from 'zustand';

// Hearts are a single pool shared across every level (not reset per level).
// No time-based regen: the only way back up is the existing buy-hearts/watch-ad
// affordances (SoloMapScreen's refill modal, and the frozen-overlay paywall in
// the two "wall" levels). START is the same value every level used to reset to
// locally; MAX is a safety ceiling so the Elan/Vol streak-reward (+1 heart)
// can't grow the pool forever.
export const START_HEARTS = 3;
export const HEARTS_MAX = 5;

export type LevelState = 'locked' | 'current' | 'done';

interface GameStore {
  hearts: number;
  currentLevel: number;
  completedLevels: number[];
  hasSeenStreakIntro: boolean;
  loseHeart: () => number;
  gainHearts: (n: number) => void;
  setHearts: (n: number) => void;
  completeLevel: (n: number) => void;
  levelState: (n: number) => LevelState;
  markStreakIntroSeen: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  hearts: START_HEARTS,
  currentLevel: 1,
  completedLevels: [],
  hasSeenStreakIntro: false,

  loseHeart: () => {
    const next = Math.max(0, get().hearts - 1);
    set({ hearts: next });
    return next;
  },

  gainHearts: (n) => set((s) => ({ hearts: Math.min(HEARTS_MAX, s.hearts + n) })),

  setHearts: (n) => set({ hearts: Math.max(0, Math.min(HEARTS_MAX, n)) }),

  completeLevel: (n) =>
    set((s) => ({
      completedLevels: s.completedLevels.includes(n) ? s.completedLevels : [...s.completedLevels, n],
      currentLevel: Math.max(s.currentLevel, n + 1),
    })),

  levelState: (n) => {
    const { currentLevel, completedLevels } = get();
    if (completedLevels.includes(n)) return 'done';
    if (n === currentLevel) return 'current';
    return 'locked';
  },

  markStreakIntroSeen: () => set({ hasSeenStreakIntro: true }),

  resetGame: () => set({ hearts: START_HEARTS, currentLevel: 1, completedLevels: [], hasSeenStreakIntro: false }),
}));
