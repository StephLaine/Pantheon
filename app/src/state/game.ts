import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Hearts are a single pool shared across every level (not reset per level).
// No time-based regen: the only way back up is the existing buy-hearts/watch-ad
// affordances (SoloMapScreen's refill modal, and the frozen-overlay paywall in
// the two "wall" levels). START is the same value every level used to reset to
// locally; MAX is a safety ceiling so the Elan/Vol streak-reward (+1 heart)
// can't grow the pool forever.
export const START_HEARTS = 3;
export const HEARTS_MAX = 5;
export const START_COINS = 0;

interface GameStore {
  loading: boolean;
  userId: string | null;
  hearts: number;
  coins: number;
  currentLevel: number;
  completedLevels: number[];
  streakCurrent: number;
  hasSeenStreakIntro: boolean;

  hydrate: (userId: string) => Promise<void>;
  clearLocal: () => void;

  loseHeart: () => number;
  gainHeartBonus: () => void;
  grantHeartFromAd: () => void;
  setHearts: (n: number) => void;
  spendCoins: (amount: number, reason: string, levelN?: number) => void;
  completeLevel: (n: number) => void;
  touchDailyStreak: () => void;
  markStreakIntroSeen: () => void;
  resetGame: () => void;
}

const DEFAULTS = {
  hearts: START_HEARTS,
  coins: START_COINS,
  currentLevel: 1,
  completedLevels: [] as number[],
  streakCurrent: 0,
  hasSeenStreakIntro: false,
};

// Every mutating action below updates local state immediately (so gameplay
// never waits on a network round-trip) and fires the matching RPC in the
// background. These are single-player economy numbers, not something that
// needs a blocking retry UI — a failed background write just gets logged.
function warnOnError(rpc: string, error: { message: string } | null) {
  if (error) console.warn(`[game] ${rpc} failed:`, error.message);
}

export const useGameStore = create<GameStore>((set, get) => ({
  loading: true,
  userId: null,
  ...DEFAULTS,

  hydrate: async (userId) => {
    set({ loading: true, userId });
    const [{ data: player, error: playerErr }, { data: completions, error: compErr }] = await Promise.all([
      supabase.from('players').select('*').eq('id', userId).single(),
      supabase.from('level_completions').select('level_n').eq('user_id', userId),
    ]);
    warnOnError('hydrate/players', playerErr);
    warnOnError('hydrate/level_completions', compErr);
    set({
      loading: false,
      hearts: player?.hearts ?? START_HEARTS,
      coins: player?.coins ?? START_COINS,
      currentLevel: player?.current_level ?? 1,
      completedLevels: (completions ?? []).map((r: { level_n: number }) => r.level_n),
      streakCurrent: player?.streak_current ?? 0,
      hasSeenStreakIntro: player?.has_seen_streak_intro ?? false,
    });
  },

  clearLocal: () => set({ loading: true, userId: null, ...DEFAULTS }),

  loseHeart: () => {
    const next = Math.max(0, get().hearts - 1);
    set({ hearts: next });
    supabase.rpc('lose_heart').then(({ error }) => warnOnError('lose_heart', error));
    return next;
  },

  // Gameplay reward (L5/L8 perfect chain) — distinct from the ad-reward path
  // below so the two stay separately auditable server-side.
  gainHeartBonus: () => {
    set((s) => ({ hearts: Math.min(HEARTS_MAX, s.hearts + 1) }));
    supabase.rpc('grant_heart_bonus', { p_reason: 'chain_perfect' }).then(({ error }) => warnOnError('grant_heart_bonus', error));
  },

  // No real ad SDK wired up yet, so this generates a placeholder txn id —
  // the RPC's idempotency/rate-limit still apply, they just aren't backed by
  // a real ad-network completion callback until that integration happens.
  grantHeartFromAd: () => {
    set((s) => ({ hearts: Math.min(HEARTS_MAX, s.hearts + 1) }));
    const txnId = `ad_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    supabase.rpc('grant_heart_from_ad', { p_ad_txn_id: txnId }).then(({ error }) => warnOnError('grant_heart_from_ad', error));
  },

  // Local-only, deliberately never touches the database — backs the fake/demo
  // "recharge hearts" IAP buttons. Real IAP needs a server-verified receipt
  // (see the locked-down grant_iap RPC) before it can safely persist.
  setHearts: (n) => set({ hearts: Math.max(0, Math.min(HEARTS_MAX, n)) }),

  spendCoins: (amount, reason, levelN) => {
    set((s) => ({ coins: Math.max(0, s.coins - amount) }));
    supabase.rpc('spend_coins', { p_amount: amount, p_reason: reason, p_level_n: levelN ?? null })
      .then(({ error }) => warnOnError('spend_coins', error));
  },

  completeLevel: (n) => {
    set((s) => ({
      completedLevels: s.completedLevels.includes(n) ? s.completedLevels : [...s.completedLevels, n],
      currentLevel: Math.max(s.currentLevel, n + 1),
    }));
    supabase.rpc('complete_level', { p_level_n: n, p_correct_count: null, p_chain_perfect: false })
      .then(({ error }) => warnOnError('complete_level', error));
  },

  touchDailyStreak: () => {
    supabase.rpc('touch_daily_streak').then(({ data, error }) => {
      warnOnError('touch_daily_streak', error);
      const row = data?.[0];
      if (row) set({ streakCurrent: row.streak_current });
    });
  },

  markStreakIntroSeen: () => {
    set({ hasSeenStreakIntro: true });
    supabase.rpc('mark_streak_intro_seen').then(({ error }) => warnOnError('mark_streak_intro_seen', error));
  },

  resetGame: () => {
    set({ ...DEFAULTS });
    supabase.rpc('reset_progress').then(({ error }) => warnOnError('reset_progress', error));
  },
}));
