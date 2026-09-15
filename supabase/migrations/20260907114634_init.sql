-- Pantheon Path — initial schema.
-- Player state, currency, IAP, and leaderboard for the Hermes chapter and beyond.
--
-- Core rule: the `authenticated` role never gets INSERT/UPDATE/DELETE on any
-- table below. Every mutation goes through a SECURITY DEFINER function so the
-- server enforces the game's rules (can't go negative, can't grant yourself
-- coins, can't skip levels) no matter what the client sends.

-- ============================================================
-- Shared trigger: keep updated_at honest on every UPDATE
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- players — 1:1 with auth.users
-- ============================================================
create table players (
  id                     uuid primary key references auth.users(id) on delete cascade,
  display_name           text not null default 'Player',
  avatar_url             text,
  hearts                 int not null default 3 check (hearts between 0 and hearts_max),
  hearts_max             int not null default 5,
  unlimited_hearts_until timestamptz,
  coins                  bigint not null default 0 check (coins >= 0),
  xp                     bigint not null default 0,
  current_level          int not null default 1,
  streak_current         int not null default 0,
  streak_longest         int not null default 0,
  last_active_date       date,
  has_seen_streak_intro  boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger players_set_updated_at
before update on players
for each row execute function set_updated_at();

-- Auto-create a player row the moment someone signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.players (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ============================================================
-- level_completions — one row per user per level
-- ============================================================
create table level_completions (
  user_id        uuid references players(id) on delete cascade,
  level_n        int not null,
  correct_count  int,
  chain_perfect  boolean not null default false,
  completed_at   timestamptz not null default now(),
  primary key (user_id, level_n)
);

-- ============================================================
-- currency_ledger — append-only audit trail for hearts + coins
-- ============================================================
create table currency_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references players(id) on delete cascade,
  kind          text not null check (kind in (
                  'heart_lose','heart_gain_ad','heart_gain_iap','heart_regen',
                  'coin_earn','coin_spend_skip','coin_spend_paywall'
                )),
  delta         int not null,
  balance_after int not null,
  level_n       int,
  created_at    timestamptz not null default now()
);
create index currency_ledger_user_id_idx on currency_ledger(user_id);

-- ============================================================
-- iap_purchases — server-verified receipts only (see grant_iap below)
-- ============================================================
create table iap_purchases (
  id             bigint generated always as identity primary key,
  user_id        uuid references players(id) on delete set null,
  platform       text not null check (platform in ('ios','android')),
  product_id     text not null,
  transaction_id text not null unique,
  status         text not null default 'pending' check (status in ('pending','verified','refunded')),
  granted        jsonb,
  purchased_at   timestamptz not null default now(),
  verified_at    timestamptz
);
create index iap_purchases_user_id_idx on iap_purchases(user_id);

-- ============================================================
-- ad_rewards — rewarded-ad "+1 heart", deduped by the ad network's txn id
-- ============================================================
create table ad_rewards (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references players(id) on delete cascade,
  ad_network_txn_id text not null unique,
  granted           text not null default 'heart',
  created_at        timestamptz not null default now()
);
create index ad_rewards_user_id_idx on ad_rewards(user_id);

-- ============================================================
-- xp_events — the recurring activity feed. Drives players.xp AND the
-- live leaderboard, so the leaderboard still has something to measure
-- once someone has finished the one-time 50-level campaign.
-- ============================================================
create table xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references players(id) on delete cascade,
  source     text not null check (source in ('level_complete','daily_quiz','chain_perfect_bonus')),
  amount     int not null check (amount > 0),
  level_n    int,
  created_at timestamptz not null default now()
);
create index xp_events_user_id_idx on xp_events(user_id);

-- ============================================================
-- leaderboard — one active season at a time, real-money payout trail
-- ============================================================
create table leaderboard_seasons (
  id         bigint generated always as identity primary key,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  prize_pool numeric(10,2) not null default 250.00,
  status     text not null default 'active' check (status in ('active','closed','paid'))
);
create unique index one_active_season_idx on leaderboard_seasons ((1)) where status = 'active';

create table leaderboard_scores (
  season_id  bigint references leaderboard_seasons(id) on delete cascade,
  user_id    uuid references players(id) on delete cascade,
  score      bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

create table leaderboard_payouts (
  season_id    bigint references leaderboard_seasons(id),
  user_id      uuid references players(id) on delete set null,
  rank         int not null,
  prize_amount numeric(10,2) not null,
  status       text not null default 'pending' check (status in ('pending','paid','failed')),
  paid_at      timestamptz,
  primary key (season_id, user_id)
);

-- ============================================================
-- Row Level Security — select-your-own everywhere, no direct writes.
-- ============================================================
alter table players enable row level security;
alter table level_completions enable row level security;
alter table currency_ledger enable row level security;
alter table iap_purchases enable row level security;
alter table ad_rewards enable row level security;
alter table xp_events enable row level security;
alter table leaderboard_scores enable row level security;
alter table leaderboard_seasons enable row level security;
alter table leaderboard_payouts enable row level security;

create policy players_select_own on players for select using (auth.uid() = id);
create policy level_completions_select_own on level_completions for select using (auth.uid() = user_id);
create policy currency_ledger_select_own on currency_ledger for select using (auth.uid() = user_id);
create policy iap_purchases_select_own on iap_purchases for select using (auth.uid() = user_id);
create policy ad_rewards_select_own on ad_rewards for select using (auth.uid() = user_id);
create policy xp_events_select_own on xp_events for select using (auth.uid() = user_id);
create policy leaderboard_scores_select_all on leaderboard_scores for select using (true);
create policy leaderboard_seasons_select_all on leaderboard_seasons for select using (true);
create policy leaderboard_payouts_select_own on leaderboard_payouts for select using (auth.uid() = user_id);

-- ============================================================
-- RPCs — the only write path for the game economy.
-- ============================================================

create or replace function current_season_id()
returns bigint language sql stable as $$
  select id from leaderboard_seasons where status = 'active' order by starts_at desc limit 1;
$$;

create or replace function award_xp(p_amount int, p_source text, p_level_n int default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_season_id bigint;
begin
  if p_amount <= 0 then raise exception 'award_xp: amount must be positive'; end if;

  insert into xp_events (user_id, source, amount, level_n) values (auth.uid(), p_source, p_amount, p_level_n);
  update players set xp = xp + p_amount where id = auth.uid();

  v_season_id := current_season_id();
  if v_season_id is not null then
    insert into leaderboard_scores (season_id, user_id, score, updated_at)
    values (v_season_id, auth.uid(), p_amount, now())
    on conflict (season_id, user_id)
    do update set score = leaderboard_scores.score + excluded.score, updated_at = now();
  end if;
end;
$$;

create or replace function lose_heart()
returns int language plpgsql security definer set search_path = public as $$
declare v_hearts int; v_unlimited_until timestamptz;
begin
  select hearts, unlimited_hearts_until into v_hearts, v_unlimited_until
  from players where id = auth.uid() for update;

  if v_unlimited_until is not null and v_unlimited_until > now() then
    return v_hearts;
  end if;

  v_hearts := greatest(0, v_hearts - 1);
  update players set hearts = v_hearts where id = auth.uid();
  insert into currency_ledger (user_id, kind, delta, balance_after) values (auth.uid(), 'heart_lose', -1, v_hearts);
  return v_hearts;
end;
$$;

create or replace function grant_heart_from_ad(p_ad_txn_id text)
returns int language plpgsql security definer set search_path = public as $$
declare v_hearts int; v_today_count int;
begin
  select count(*) into v_today_count from ad_rewards
  where user_id = auth.uid() and created_at >= date_trunc('day', now());
  if v_today_count >= 5 then raise exception 'grant_heart_from_ad: daily limit reached'; end if;

  begin
    insert into ad_rewards (user_id, ad_network_txn_id, granted) values (auth.uid(), p_ad_txn_id, 'heart');
  exception when unique_violation then
    select hearts into v_hearts from players where id = auth.uid();
    return v_hearts;
  end;

  update players set hearts = least(hearts_max, hearts + 1) where id = auth.uid() returning hearts into v_hearts;
  insert into currency_ledger (user_id, kind, delta, balance_after) values (auth.uid(), 'heart_gain_ad', 1, v_hearts);
  return v_hearts;
end;
$$;

create or replace function spend_coins(p_amount int, p_reason text, p_level_n int default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_coins bigint;
begin
  update players set coins = coins - p_amount where id = auth.uid() returning coins into v_coins;
  insert into currency_ledger (user_id, kind, delta, balance_after, level_n)
  values (auth.uid(), p_reason, -p_amount, v_coins, p_level_n);
  return v_coins;
end;
$$;

create or replace function earn_coins(p_amount int, p_reason text default 'coin_earn', p_level_n int default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_coins bigint;
begin
  if p_amount <= 0 then raise exception 'earn_coins: amount must be positive'; end if;
  update players set coins = coins + p_amount where id = auth.uid() returning coins into v_coins;
  insert into currency_ledger (user_id, kind, delta, balance_after, level_n)
  values (auth.uid(), p_reason, p_amount, v_coins, p_level_n);
  return v_coins;
end;
$$;

create or replace function complete_level(p_level_n int, p_correct_count int, p_chain_perfect boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into level_completions (user_id, level_n, correct_count, chain_perfect)
  values (auth.uid(), p_level_n, p_correct_count, p_chain_perfect)
  on conflict (user_id, level_n) do update
    set correct_count = greatest(level_completions.correct_count, excluded.correct_count),
        chain_perfect = level_completions.chain_perfect or excluded.chain_perfect;

  update players set current_level = greatest(current_level, p_level_n + 1) where id = auth.uid();
  perform award_xp(100, 'level_complete', p_level_n);
end;
$$;

create or replace function touch_daily_streak()
returns table(streak_current int, streak_longest int) language plpgsql security definer set search_path = public as $$
declare v_last date; v_cur int; v_longest int; v_today date := current_date;
begin
  select last_active_date, players.streak_current, players.streak_longest
    into v_last, v_cur, v_longest
    from players where id = auth.uid() for update;

  if v_last is null or v_last < v_today - 1 then
    v_cur := 1;
  elsif v_last = v_today - 1 then
    v_cur := v_cur + 1;
  end if; -- v_last = v_today: already counted today, no change

  v_longest := greatest(v_longest, v_cur);

  update players set last_active_date = v_today, streak_current = v_cur, streak_longest = v_longest
  where id = auth.uid();

  return query select v_cur, v_longest;
end;
$$;

create or replace function mark_streak_intro_seen()
returns void language plpgsql security definer set search_path = public as $$
begin
  update players set has_seen_streak_intro = true where id = auth.uid();
end;
$$;

-- PRIVILEGED — must only ever be called by a server-side Edge Function that
-- has already verified the receipt with Apple/Google. Never expose this to
-- the app directly: anyone able to call it could grant themselves any IAP
-- for free.
create or replace function grant_iap(p_user_id uuid, p_platform text, p_product_id text, p_transaction_id text, p_granted jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into iap_purchases (user_id, platform, product_id, transaction_id, status, granted, verified_at)
  values (p_user_id, p_platform, p_product_id, p_transaction_id, 'verified', p_granted, now());

  if p_granted ? 'hearts' then
    update players set hearts = least(hearts_max, hearts + (p_granted->>'hearts')::int) where id = p_user_id;
  end if;
  if p_granted ? 'unlimited_days' then
    update players set unlimited_hearts_until =
      greatest(coalesce(unlimited_hearts_until, now()), now()) + ((p_granted->>'unlimited_days')::int || ' days')::interval
    where id = p_user_id;
  end if;
end;
$$;

revoke all on function grant_iap from public, anon, authenticated;
