-- Enforce a single active session per account. Supabase's own "single
-- session per user" toggle does the same thing but is Pro-plan only, so this
-- is a DIY equivalent: the moment a new session row is inserted for a user,
-- delete that user's other sessions (and, via FK cascade, their refresh
-- tokens) so the old device can never refresh again.
--
-- Note: this doesn't revoke instantly. A session's *access token* (JWT) is
-- verified statelessly (signature + expiry only), so an already-issued
-- access token keeps working until it naturally expires — only the next
-- refresh attempt fails. In practice that means the old device gets signed
-- out within its access-token lifetime (Supabase's default is ~1 hour), not
-- the instant the new session is created.
create or replace function public.revoke_other_sessions()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.sessions
  where user_id = new.user_id
    and id <> new.id;
  return new;
end;
$$;

drop trigger if exists revoke_other_sessions_on_signin on auth.sessions;
create trigger revoke_other_sessions_on_signin
after insert on auth.sessions
for each row
execute function public.revoke_other_sessions();
