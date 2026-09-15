-- Additive follow-up to 20260907114634_init.sql.
-- Adds the gameplay-bonus heart grant (distinct from the ad-reward path)
-- and a progress-reset RPC for the Settings screen.

alter table currency_ledger drop constraint currency_ledger_kind_check;
alter table currency_ledger add constraint currency_ledger_kind_check check (kind in (
  'heart_lose','heart_gain_ad','heart_gain_bonus','heart_gain_iap','heart_regen',
  'coin_earn','coin_spend_skip','coin_spend_paywall'
));

create or replace function grant_heart_bonus(p_reason text)
returns int language plpgsql security definer set search_path = public as $$
declare v_hearts int;
begin
  update players set hearts = least(hearts_max, hearts + 1) where id = auth.uid() returning hearts into v_hearts;
  insert into currency_ledger (user_id, kind, delta, balance_after) values (auth.uid(), 'heart_gain_bonus', 1, v_hearts);
  return v_hearts;
end;
$$;

create or replace function reset_progress()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from level_completions where user_id = auth.uid();
  update players set
    hearts = 3,
    coins = 0,
    xp = 0,
    current_level = 1,
    streak_current = 0,
    has_seen_streak_intro = false
  where id = auth.uid();
end;
$$;
