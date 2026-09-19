import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
  // Pre-bought consumables from the Store — spent via useSkipToken /
  // useFiftyFiftyToken inside a level before falling back to paying coins.
  skipTokens: number;
  fiftyFiftyTokens: number;
  // True as soon as a background RPC fails — e.g. the session died mid-game
  // (revoked/expired token) or the connection dropped. The UI already
  // updated optimistically when this happens, so this is the only signal
  // the player gets that their last action may not actually be saved.
  syncIssue: boolean;

  hydrate: (userId: string) => Promise<void>;
  clearLocal: () => void;
  clearSyncIssue: () => void;

  loseHeart: () => number;
  gainHeartBonus: () => void;
  grantHeartFromAd: () => void;
  setHearts: (n: number) => void;
  spendCoins: (amount: number, reason: string, levelN?: number) => void;
  completeLevel: (n: number) => void;
  touchDailyStreak: () => void;
  markStreakIntroSeen: () => void;
  resetGame: () => void;

  buyStoreItem: (itemKey: string, qty?: number) => Promise<{ ok: boolean; error?: string }>;
  useSkipToken: () => Promise<boolean>;
  useFiftyFiftyToken: () => Promise<boolean>;
}

const DEFAULTS = {
  hearts: START_HEARTS,
  coins: START_COINS,
  currentLevel: 1,
  completedLevels: [] as number[],
  streakCurrent: 0,
  hasSeenStreakIntro: false,
  skipTokens: 0,
  fiftyFiftyTokens: 0,
};

// Every mutating action below updates local state immediately (so gameplay
// never waits on a network round-trip) and fires the matching RPC in the
// background. These are single-player economy numbers, not something that
// needs a blocking retry UI — but a failed write still has to surface
// *somewhere*, or the player has no way to know their last action didn't
// actually save (e.g. their session died mid-game). `syncIssue` is that
// surface; see `reportRpcResult` below.
export const useGameStore = create<GameStore>((set, get) => {
  function reportRpcResult(rpc: string, error: { message: string } | null) {
    if (error) {
      console.warn(`[game] ${rpc} failed:`, error.message);
      set({ syncIssue: true });
    } else {
      set({ syncIssue: false });
    }
  }

  // Lets a second device signed into the same account (or a server-side
  // process) update this client's view live instead of only on the next
  // full re-login — see the realtime_player_sync migration for the other
  // half of this (enabling Realtime + full row images on these tables).
  let realtimeChannel: RealtimeChannel | null = null;
  function subscribeToRemoteChanges(userId: string) {
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    realtimeChannel = supabase
      .channel(`player-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as {
            hearts: number; coins: number; current_level: number;
            streak_current: number; has_seen_streak_intro: boolean;
            skip_tokens: number; fifty_fifty_tokens: number;
          };
          set({
            hearts: row.hearts,
            coins: row.coins,
            currentLevel: row.current_level,
            streakCurrent: row.streak_current,
            hasSeenStreakIntro: row.has_seen_streak_intro,
            skipTokens: row.skip_tokens,
            fiftyFiftyTokens: row.fifty_fifty_tokens,
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'level_completions', filter: `user_id=eq.${userId}` },
        () => {
          supabase.from('level_completions').select('level_n').eq('user_id', userId).then(({ data }) => {
            if (data) set({ completedLevels: data.map((r: { level_n: number }) => r.level_n) });
          });
        },
      )
      .subscribe();
  }

  return {
  loading: true,
  userId: null,
  syncIssue: false,
  ...DEFAULTS,

  hydrate: async (userId) => {
    set({ loading: true, userId });
    const [{ data: player, error: playerErr }, { data: completions, error: compErr }] = await Promise.all([
      supabase.from('players').select('*').eq('id', userId).single(),
      supabase.from('level_completions').select('level_n').eq('user_id', userId),
    ]);
    if (playerErr) console.warn('[game] hydrate/players failed:', playerErr.message);
    if (compErr) console.warn('[game] hydrate/level_completions failed:', compErr.message);
    set({
      loading: false,
      syncIssue: !!(playerErr || compErr),
      hearts: player?.hearts ?? START_HEARTS,
      coins: player?.coins ?? START_COINS,
      currentLevel: player?.current_level ?? 1,
      completedLevels: (completions ?? []).map((r: { level_n: number }) => r.level_n),
      streakCurrent: player?.streak_current ?? 0,
      hasSeenStreakIntro: player?.has_seen_streak_intro ?? false,
      skipTokens: player?.skip_tokens ?? 0,
      fiftyFiftyTokens: player?.fifty_fifty_tokens ?? 0,
    });
    subscribeToRemoteChanges(userId);
  },

  clearLocal: () => {
    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
    set({ loading: true, userId: null, syncIssue: false, ...DEFAULTS });
  },
  clearSyncIssue: () => set({ syncIssue: false }),

  loseHeart: () => {
    const next = Math.max(0, get().hearts - 1);
    set({ hearts: next });
    supabase.rpc('lose_heart').then(({ error }) => reportRpcResult('lose_heart', error));
    return next;
  },

  // Gameplay reward (L5/L8 perfect chain) — distinct from the ad-reward path
  // below so the two stay separately auditable server-side.
  gainHeartBonus: () => {
    set((s) => ({ hearts: Math.min(HEARTS_MAX, s.hearts + 1) }));
    supabase.rpc('grant_heart_bonus', { p_reason: 'chain_perfect' }).then(({ error }) => reportRpcResult('grant_heart_bonus', error));
  },

  // No real ad SDK wired up yet, so this generates a placeholder txn id —
  // the RPC's idempotency/rate-limit still apply, they just aren't backed by
  // a real ad-network completion callback until that integration happens.
  grantHeartFromAd: () => {
    set((s) => ({ hearts: Math.min(HEARTS_MAX, s.hearts + 1) }));
    const txnId = `ad_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    supabase.rpc('grant_heart_from_ad', { p_ad_txn_id: txnId }).then(({ error }) => reportRpcResult('grant_heart_from_ad', error));
  },

  // Local-only, deliberately never touches the database — backs the fake/demo
  // "recharge hearts" IAP buttons. Real IAP needs a server-verified receipt
  // (see the locked-down grant_iap RPC) before it can safely persist.
  setHearts: (n) => set({ hearts: Math.max(0, Math.min(HEARTS_MAX, n)) }),

  spendCoins: (amount, reason, levelN) => {
    set((s) => ({ coins: Math.max(0, s.coins - amount) }));
    supabase.rpc('spend_coins', { p_amount: amount, p_reason: reason, p_level_n: levelN ?? null })
      .then(({ error }) => reportRpcResult('spend_coins', error));
  },

  completeLevel: (n) => {
    set((s) => ({
      completedLevels: s.completedLevels.includes(n) ? s.completedLevels : [...s.completedLevels, n],
      currentLevel: Math.max(s.currentLevel, n + 1),
    }));
    supabase.rpc('complete_level', { p_level_n: n, p_correct_count: null, p_chain_perfect: false })
      .then(({ error }) => reportRpcResult('complete_level', error));
  },

  touchDailyStreak: () => {
    supabase.rpc('touch_daily_streak').then(({ data, error }) => {
      reportRpcResult('touch_daily_streak', error);
      const row = data?.[0];
      if (row) set({ streakCurrent: row.streak_current });
    });
  },

  markStreakIntroSeen: () => {
    set({ hasSeenStreakIntro: true });
    supabase.rpc('mark_streak_intro_seen').then(({ error }) => reportRpcResult('mark_streak_intro_seen', error));
  },

  resetGame: () => {
    set({ ...DEFAULTS });
    supabase.rpc('reset_progress').then(({ error }) => reportRpcResult('reset_progress', error));
  },

  // Purchases are awaited (not fire-and-forget like the rest of this file)
  // because the Store screen needs to show a real success/failure result —
  // "not enough coins" has to reach the player, not just log a warning.
  // Pricing/clamping (e.g. hearts already full) lives server-side in
  // buy_store_item, so on success this just re-fetches the true player row
  // rather than guessing the exact effect locally.
  buyStoreItem: async (itemKey, qty = 1) => {
    const { error } = await supabase.rpc('buy_store_item', { p_item_key: itemKey, p_qty: qty });
    if (error) return { ok: false, error: error.message };
    const userId = get().userId;
    if (userId) {
      const { data: player } = await supabase.from('players').select('*').eq('id', userId).single();
      if (player) {
        set({
          hearts: player.hearts, coins: player.coins,
          skipTokens: player.skip_tokens, fiftyFiftyTokens: player.fifty_fifty_tokens,
        });
      }
    }
    return { ok: true };
  },

  // These are awaited (unlike loseHeart/spendCoins) because the calling
  // level screen branches on the real result: consume a pre-bought token
  // for free, or fall back to the existing pay-coins-on-the-spot flow.
  useSkipToken: async () => {
    const { data, error } = await supabase.rpc('use_skip_token');
    if (error) { reportRpcResult('use_skip_token', error); return false; }
    if (data) set((s) => ({ skipTokens: Math.max(0, s.skipTokens - 1) }));
    return !!data;
  },

  useFiftyFiftyToken: async () => {
    const { data, error } = await supabase.rpc('use_fifty_fifty_token');
    if (error) { reportRpcResult('use_fifty_fifty_token', error); return false; }
    if (data) set((s) => ({ fiftyFiftyTokens: Math.max(0, s.fiftyFiftyTokens - 1) }));
    return !!data;
  },
  };
});
