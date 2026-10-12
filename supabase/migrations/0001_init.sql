-- RotorCalc initial schema: profiles, plans, mock payments, saved calculations,
-- and the strict session rules (one session per user, at most two devices).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  company text not null default '',
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('trial', 'pro', 'plant')),
  billing_cycle text not null check (billing_cycle in ('trial', 'monthly', 'yearly')),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  trial_used boolean not null default false,
  started_at timestamptz not null default now(),
  current_period_end timestamptz not null,
  provider text not null default 'mock',
  provider_ref text,
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null,
  billing_cycle text not null,
  amount_inr integer not null check (amount_inr >= 0),
  method text not null default 'card',
  status text not null default 'succeeded',
  provider text not null default 'mock',
  provider_ref text not null,
  created_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);

create table public.calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('power', 'efficiency', 'flow', 'boiler')),
  name text not null check (char_length(name) between 1 and 120),
  inputs jsonb not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calculations_user_idx on public.calculations (user_id, updated_at desc);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid not null,
  label text not null default 'Unknown device',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create table public.active_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id uuid not null,
  device_id uuid not null,
  started_at timestamptz not null default now()
);

-- ── Helpers ─────────────────────────────────────────────────────────────────
create function public.current_session_id() returns uuid
language sql stable
as $$ select nullif(auth.jwt() ->> 'session_id', '')::uuid $$;

-- True only for the one session that currently owns the account.
create function public.is_active_session() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.active_sessions a
    where a.user_id = auth.uid() and a.session_id = public.current_session_id()
  )
$$;

-- ── Row level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.calculations enable row level security;
alter table public.devices enable row level security;
alter table public.active_sessions enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() and public.is_active_session());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_active_session()) with check (id = auth.uid());

-- Plans, payments, devices and the active session are written only by the functions below.
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (user_id = auth.uid() and public.is_active_session());
create policy payments_read on public.payments for select to authenticated
  using (user_id = auth.uid() and public.is_active_session());
create policy devices_read on public.devices for select to authenticated using (user_id = auth.uid());
create policy active_sessions_read on public.active_sessions for select to authenticated using (user_id = auth.uid());

create policy calculations_all on public.calculations for all to authenticated
  using (user_id = auth.uid() and public.is_active_session())
  with check (user_id = auth.uid() and public.is_active_session());

-- ── New account: create the profile from the sign-up form ───────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, company)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    left(coalesce(new.raw_user_meta_data ->> 'company', ''), 120)
  )
  on conflict (id) do nothing;
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Strict session rules ────────────────────────────────────────────────────
-- Makes the calling session the only live one for its user, registering the device if there is room.
-- Returns {"ok": true} or {"ok": false, "reason": "device_limit"}.
create function public.claim_session(p_device_id uuid, p_label text) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid := public.current_session_id();
  v_max constant integer := 2;
  v_count integer;
begin
  if v_user is null or v_session is null then
    raise exception 'not signed in';
  end if;
  -- One row per user is locked so two sign-ins at once cannot both take the last device slot.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  if exists (select 1 from public.devices where user_id = v_user and device_id = p_device_id) then
    update public.devices set last_seen_at = now() where user_id = v_user and device_id = p_device_id;
  else
    select count(*) into v_count from public.devices where user_id = v_user;
    if v_count >= v_max then
      return jsonb_build_object('ok', false, 'reason', 'device_limit');
    end if;
    insert into public.devices (user_id, device_id, label)
    values (v_user, p_device_id, left(coalesce(nullif(p_label, ''), 'Unknown device'), 80));
  end if;

  insert into public.active_sessions (user_id, session_id, device_id)
  values (v_user, v_session, p_device_id)
  on conflict (user_id) do update
    set session_id = excluded.session_id, device_id = excluded.device_id, started_at = now();
  return jsonb_build_object('ok', true);
end
$$;

-- Removes one of the caller's devices. If that device holds the live session, it is signed out.
create function public.remove_device(p_id uuid) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_device uuid;
begin
  delete from public.devices where id = p_id and user_id = auth.uid() returning device_id into v_device;
  if v_device is not null then
    delete from public.active_sessions where user_id = auth.uid() and device_id = v_device;
  end if;
end
$$;

-- Ends the caller's live session (sign out).
create function public.release_session() returns void
language sql security definer set search_path = public
as $$
  delete from public.active_sessions
  where user_id = auth.uid() and session_id = public.current_session_id()
$$;

-- One round trip for the page guard: is this the live session, and what plan is active?
create function public.session_check() returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_active public.active_sessions;
  v_sub public.subscriptions;
  v_state text;
begin
  if v_user is null then
    return jsonb_build_object('session', 'none');
  end if;
  select * into v_active from public.active_sessions where user_id = v_user;
  if not found then
    v_state := 'unclaimed';
  elsif v_active.session_id = public.current_session_id() then
    v_state := 'active';
  else
    v_state := 'replaced';
  end if;
  select * into v_sub from public.subscriptions where user_id = v_user;
  return jsonb_build_object(
    'session', v_state,
    'plan', v_sub.plan,
    'billing_cycle', v_sub.billing_cycle,
    'period_end', v_sub.current_period_end,
    'trial_used', coalesce(v_sub.trial_used, false),
    'plan_active', coalesce(v_sub.status = 'active' and v_sub.current_period_end > now(), false)
  );
end
$$;

-- ── Mock payment ────────────────────────────────────────────────────────────
-- TEST MODE ONLY. Records a pretend payment and switches the plan on. When a real gateway is added,
-- drop this function and write subscriptions from the gateway's server-side confirmation instead.
create function public.activate_mock_subscription(p_plan text, p_cycle text, p_amount_inr integer, p_method text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing public.subscriptions;
  v_end timestamptz;
  v_ref text := 'mock_' || replace(gen_random_uuid()::text, '-', '');
begin
  if v_user is null or not public.is_active_session() then
    raise exception 'not signed in';
  end if;
  if p_plan not in ('trial', 'pro', 'plant') then
    raise exception 'unknown plan';
  end if;
  select * into v_existing from public.subscriptions where user_id = v_user;

  if p_plan = 'trial' then
    if coalesce(v_existing.trial_used, false) then
      return jsonb_build_object('ok', false, 'reason', 'trial_used');
    end if;
    p_cycle := 'trial';
    p_amount_inr := 0;
    v_end := now() + interval '14 days';
  elsif p_cycle = 'yearly' then
    v_end := now() + interval '1 year';
  elsif p_cycle = 'monthly' then
    v_end := now() + interval '1 month';
  else
    raise exception 'unknown billing cycle';
  end if;

  insert into public.payments (user_id, plan, billing_cycle, amount_inr, method, provider_ref)
  values (v_user, p_plan, p_cycle, greatest(coalesce(p_amount_inr, 0), 0), left(coalesce(p_method, 'card'), 20), v_ref);

  insert into public.subscriptions (user_id, plan, billing_cycle, status, trial_used, current_period_end, provider_ref)
  values (v_user, p_plan, p_cycle, 'active', p_plan = 'trial', v_end, v_ref)
  on conflict (user_id) do update
    set plan = excluded.plan, billing_cycle = excluded.billing_cycle, status = 'active',
        trial_used = public.subscriptions.trial_used or excluded.trial_used,
        started_at = now(), current_period_end = excluded.current_period_end,
        provider_ref = excluded.provider_ref, updated_at = now();
  return jsonb_build_object('ok', true, 'ref', v_ref, 'period_end', v_end);
end
$$;

-- Functions are callable by signed-in users only.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.current_session_id(), public.is_active_session(), public.claim_session(uuid, text),
  public.remove_device(uuid), public.release_session(), public.session_check(),
  public.activate_mock_subscription(text, text, integer, text)
to authenticated;
