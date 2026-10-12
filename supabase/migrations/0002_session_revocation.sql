-- Makes the session rules airtight inside the database:
--   * taking over an account deletes every other login session of that user (their refresh tokens die at once);
--   * removing a device deletes the login session that was using it;
--   * a browser that was refused for the device limit is told apart from one that was replaced.

alter table public.devices add column last_session_id uuid;

create or replace function public.claim_session(p_device_id uuid, p_label text) returns jsonb
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

  if not exists (select 1 from public.devices where user_id = v_user and device_id = p_device_id) then
    select count(*) into v_count from public.devices where user_id = v_user;
    if v_count >= v_max then
      return jsonb_build_object('ok', false, 'reason', 'device_limit');
    end if;
    insert into public.devices (user_id, device_id, label)
    values (v_user, p_device_id, left(coalesce(nullif(p_label, ''), 'Unknown device'), 80));
  end if;
  update public.devices set last_seen_at = now(), last_session_id = v_session
  where user_id = v_user and device_id = p_device_id;

  insert into public.active_sessions (user_id, session_id, device_id)
  values (v_user, v_session, p_device_id)
  on conflict (user_id) do update
    set session_id = excluded.session_id, device_id = excluded.device_id, started_at = now();

  -- One session per user: every other login of this account ends now.
  delete from auth.sessions where user_id = v_user and id <> v_session;
  return jsonb_build_object('ok', true);
end
$$;

create or replace function public.remove_device(p_id uuid) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_device uuid;
  v_session uuid;
begin
  delete from public.devices where id = p_id and user_id = auth.uid()
  returning device_id, last_session_id into v_device, v_session;
  if v_device is not null then
    delete from public.active_sessions where user_id = auth.uid() and device_id = v_device;
    -- The removed device must sign in again; its login is ended (unless it is the one asking).
    if v_session is not null and v_session <> public.current_session_id() then
      delete from auth.sessions where id = v_session and user_id = auth.uid();
    end if;
  end if;
end
$$;

create or replace function public.session_check() returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_current uuid := public.current_session_id();
  v_active public.active_sessions;
  v_sub public.subscriptions;
  v_state text;
begin
  if v_user is null then
    return jsonb_build_object('session', 'none');
  end if;
  select * into v_active from public.active_sessions where user_id = v_user;
  if not exists (select 1 from auth.sessions where id = v_current and user_id = v_user) then
    -- The login was ended by a newer sign-in or by removing the device.
    v_state := 'revoked';
  elsif v_active.session_id = v_current then
    v_state := 'active';
  else
    -- Signed in, but not registered as the live session (for example refused for the device limit).
    v_state := 'unclaimed';
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

-- is_active_session() guards every table. A deleted login must fail it even while its token has not expired.
create or replace function public.is_active_session() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.active_sessions a
    join auth.sessions s on s.id = a.session_id
    where a.user_id = auth.uid() and a.session_id = public.current_session_id()
  )
$$;
