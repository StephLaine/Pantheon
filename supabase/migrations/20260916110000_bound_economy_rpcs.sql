-- Security fix: several economy RPCs trusted client-supplied numbers with no
-- bound, and one (award_xp) was never revoked from direct client access —
-- unlike grant_iap, which explicitly is. Both are directly exploitable via
-- a single supabase.rpc(...) call from any authenticated client, and both
-- inflate the real-money weekly leaderboard (XP) or the coin economy.

-- 1. award_xp is only ever meant to be called internally (currently only by
--    complete_level below) — the client never calls it directly. Revoking it
--    from anon/authenticated closes `supabase.rpc('award_xp', {p_amount: 999999999, ...})`
--    entirely. This doesn't break complete_level's internal `perform
--    award_xp(...)` call — a SECURITY DEFINER function runs as its owner,
--    which retains EXECUTE on its own objects regardless of these grants.
revoke all on function award_xp(int, text, int) from public, anon, authenticated;

-- 2. complete_level IS called directly by the client, so it can't be
--    revoked — instead, bound p_level_n to a real, authored level. Without
--    this, looping complete_level(11), complete_level(12), ... mints +100 XP
--    per call forever, since each is a "new" level_n the anti-replay check
--    hasn't seen. Bounding against the actual quiz content (rather than a
--    hardcoded 10) means this stays correct if more levels are ever added.
create or replace function complete_level(p_level_n int, p_correct_count int, p_chain_perfect boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_already_done boolean; v_max_level int;
begin
  select max(level_n) into v_max_level from quiz_questions;
  if p_level_n < 1 or v_max_level is null or p_level_n > v_max_level then
    raise exception 'complete_level: invalid level %', p_level_n;
  end if;

  select exists(
    select 1 from level_completions where user_id = auth.uid() and level_n = p_level_n
  ) into v_already_done;

  insert into level_completions (user_id, level_n, correct_count, chain_perfect)
  values (auth.uid(), p_level_n, p_correct_count, p_chain_perfect)
  on conflict (user_id, level_n) do update
    set correct_count = greatest(level_completions.correct_count, excluded.correct_count),
        chain_perfect = level_completions.chain_perfect or excluded.chain_perfect;

  update players set current_level = greatest(current_level, p_level_n + 1) where id = auth.uid();

  if not v_already_done then
    perform award_xp(100, 'level_complete', p_level_n);
  end if;
end;
$$;

-- 3. spend_coins never checked p_amount > 0, unlike its sibling earn_coins.
--    supabase.rpc('spend_coins', {p_amount: -1000000, p_reason: 'coin_spend_skip'})
--    computed coins = coins - (-1000000), minting coins with no upper bound
--    (the existing `coins >= 0` CHECK only stops it going negative, not up).
create or replace function spend_coins(p_amount int, p_reason text, p_level_n int default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_coins bigint;
begin
  if p_amount <= 0 then raise exception 'spend_coins: amount must be positive'; end if;
  update players set coins = coins - p_amount where id = auth.uid() returning coins into v_coins;
  insert into currency_ledger (user_id, kind, delta, balance_after, level_n)
  values (auth.uid(), p_reason, -p_amount, v_coins, p_level_n);
  return v_coins;
end;
$$;
