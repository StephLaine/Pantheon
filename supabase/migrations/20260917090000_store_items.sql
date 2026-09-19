-- Store: lets players pre-buy the bonus mechanics that already exist inside
-- the level designs (skip-question on levels 3/6/9, the 50/50 lifeline on
-- level 9) instead of only paying coins on the spot inside a level, plus
-- buying hearts directly. Prices/labels live in a table (same pattern as
-- quiz_questions/quiz_categories) rather than hardcoded in the app, so they
-- can change without a client release.

create table store_items (
  key         text primary key,
  label       text not null,
  icon        text not null,
  description text not null,
  price_coins int not null check (price_coins > 0),
  order_index int not null
);

alter table store_items enable row level security;
create policy store_items_select_all on store_items for select using (true);

insert into store_items (key, label, icon, description, price_coins, order_index) values
  ('skip_token', 'Jeton Passe', '⏭️', 'Passe une question sans payer — utilisé automatiquement au niveau 3, 6 ou 9.', 15, 0),
  ('fifty_fifty_token', 'Jeton 50/50', '➗', 'Élimine 2 mauvaises réponses — utilisé automatiquement au niveau 9.', 10, 1),
  ('heart', 'Cœur', '❤️', 'Un cœur de plus, tout de suite (jusqu''au maximum).', 12, 2);

-- New per-player token stock. Hearts already exist as a column; tokens are
-- new consumable counters, spent by the level screens as they're used.
alter table players add column skip_tokens int not null default 0 check (skip_tokens >= 0);
alter table players add column fifty_fifty_tokens int not null default 0 check (fifty_fifty_tokens >= 0);

alter table currency_ledger drop constraint currency_ledger_kind_check;
alter table currency_ledger add constraint currency_ledger_kind_check check (kind in (
  'heart_lose','heart_gain_ad','heart_gain_bonus','heart_gain_iap','heart_regen',
  'coin_earn','coin_spend_skip','coin_spend_paywall','coin_spend_store'
));

-- Single purchase entrypoint for every store item — keeps pricing
-- server-authoritative (client never sends an amount, only what/how many)
-- and keeps the per-item effect logic in one place.
create or replace function buy_store_item(p_item_key text, p_qty int default 1)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_price int; v_qty int := p_qty; v_total int; v_coins bigint;
  v_hearts int; v_hearts_max int;
begin
  if p_qty <= 0 then raise exception 'buy_store_item: qty must be positive'; end if;

  select price_coins into v_price from store_items where key = p_item_key;
  if v_price is null then raise exception 'buy_store_item: unknown item %', p_item_key; end if;

  -- Hearts are capped at hearts_max — clamp the purchase to only what's
  -- actually missing so a player is never charged for hearts they can't
  -- receive, and refuse outright if already full.
  if p_item_key = 'heart' then
    select hearts, hearts_max into v_hearts, v_hearts_max from players where id = auth.uid();
    v_qty := least(p_qty, v_hearts_max - v_hearts);
    if v_qty <= 0 then raise exception 'buy_store_item: hearts already full'; end if;
  end if;

  v_total := v_price * v_qty;

  update players set coins = coins - v_total where id = auth.uid() returning coins into v_coins;
  insert into currency_ledger (user_id, kind, delta, balance_after)
  values (auth.uid(), 'coin_spend_store', -v_total, v_coins);

  if p_item_key = 'skip_token' then
    update players set skip_tokens = skip_tokens + v_qty where id = auth.uid();
  elsif p_item_key = 'fifty_fifty_token' then
    update players set fifty_fifty_tokens = fifty_fifty_tokens + v_qty where id = auth.uid();
  elsif p_item_key = 'heart' then
    update players set hearts = hearts + v_qty where id = auth.uid() returning hearts into v_hearts;
    insert into currency_ledger (user_id, kind, delta, balance_after) values (auth.uid(), 'heart_gain_iap', v_qty, v_hearts);
  end if;
end;
$$;

-- Consumed by a level screen when the player actually uses a pre-bought
-- token — returns true if one was available and spent, false otherwise (the
-- client falls back to the existing pay-coins-on-the-spot flow on false).
create or replace function use_skip_token()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_left int;
begin
  update players set skip_tokens = skip_tokens - 1
  where id = auth.uid() and skip_tokens > 0
  returning skip_tokens into v_left;
  return v_left is not null;
end;
$$;

create or replace function use_fifty_fifty_token()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_left int;
begin
  update players set fifty_fifty_tokens = fifty_fifty_tokens - 1
  where id = auth.uid() and fifty_fifty_tokens > 0
  returning fifty_fifty_tokens into v_left;
  return v_left is not null;
end;
$$;
