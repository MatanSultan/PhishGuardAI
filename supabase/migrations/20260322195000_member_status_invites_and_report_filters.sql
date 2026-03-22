alter table public.organization_members
  add column if not exists status text not null default 'active';

alter table public.organization_members
  drop constraint if exists organization_members_status_check;

alter table public.organization_members
  add constraint organization_members_status_check
  check (status in ('active', 'suspended'));

create index if not exists idx_organization_members_org_status
  on public.organization_members(organization_id, status, role, joined_at desc);

alter table public.team_invites
  drop constraint if exists team_invites_status_check;

alter table public.team_invites
  add constraint team_invites_status_check
  check (status in ('pending', 'accepted', 'expired', 'canceled'));

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organization_members members
    where members.organization_id = target_organization_id
      and members.user_id = auth.uid()
      and members.status = 'active'
  );
$$;

create or replace function public.shares_organization_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on mine.organization_id = theirs.organization_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = target_user_id
      and theirs.status = 'active'
  );
$$;

create or replace function public.can_admin_access_org_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on mine.organization_id = theirs.organization_id
    where mine.user_id = auth.uid()
      and mine.role = 'admin'
      and mine.status = 'active'
      and theirs.user_id = target_user_id
  );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.organization_members members
    where members.organization_id = target_organization_id
      and members.user_id = auth.uid()
      and members.role = 'admin'
      and members.status = 'active'
  );
$$;

create or replace function public.get_organization_leaderboard_rows(target_organization_id uuid)
returns table (
  user_id uuid,
  member_id uuid,
  full_name text,
  email text,
  role text,
  joined_at timestamptz,
  total_score integer,
  total_attempts integer,
  streak_count integer,
  current_level text,
  phishing_detection_rate numeric,
  safe_detection_rate numeric,
  weakest_category text,
  strongest_category text,
  last_trained_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_org_admin(target_organization_id) then
    raise exception 'Organization admin access is required.';
  end if;

  return query
  select
    members.user_id,
    members.id as member_id,
    coalesce(nullif(trim(profiles.full_name), ''), profiles.email, 'Team member') as full_name,
    coalesce(profiles.email, '') as email,
    members.role,
    members.joined_at,
    coalesce(training.total_score, 0) as total_score,
    coalesce(training.total_attempts, 0) as total_attempts,
    coalesce(training.streak_count, 0) as streak_count,
    coalesce(training.current_level, 'easy') as current_level,
    coalesce(training.phishing_detection_rate, 0) as phishing_detection_rate,
    coalesce(training.legit_detection_rate, 0) as safe_detection_rate,
    training.weakest_category,
    training.strongest_category,
    training.last_trained_at
  from public.organization_members members
  left join public.profiles
    on profiles.id = members.user_id
  left join public.user_training_profile training
    on training.user_id = members.user_id
  where members.organization_id = target_organization_id
    and members.status = 'active'
  order by members.joined_at asc;
end;
$$;

create or replace function public.update_organization_member_role(
  target_member_id uuid,
  next_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_membership public.organization_members;
  target_membership public.organization_members;
  normalized_role text;
  active_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  normalized_role := lower(trim(coalesce(next_role, '')));

  if normalized_role not in ('member', 'admin') then
    raise exception 'Invalid organization role.';
  end if;

  select *
  into actor_membership
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if actor_membership.id is null
     or actor_membership.role <> 'admin'
     or actor_membership.status <> 'active' then
    raise exception 'Organization admin access is required.';
  end if;

  select *
  into target_membership
  from public.organization_members
  where id = target_member_id
  limit 1;

  if target_membership.id is null then
    raise exception 'Organization member not found.';
  end if;

  if target_membership.organization_id <> actor_membership.organization_id then
    raise exception 'You can only manage members in your own organization.';
  end if;

  if target_membership.user_id = auth.uid() then
    raise exception 'You cannot change your own organization role.';
  end if;

  if target_membership.role = normalized_role then
    return jsonb_build_object(
      'memberId', target_membership.id,
      'organizationId', target_membership.organization_id,
      'userId', target_membership.user_id,
      'role', target_membership.role,
      'status', target_membership.status
    );
  end if;

  if target_membership.role = 'admin'
     and target_membership.status = 'active'
     and normalized_role = 'member' then
    select count(*)
    into active_admin_count
    from public.organization_members
    where organization_id = target_membership.organization_id
      and role = 'admin'
      and status = 'active';

    if active_admin_count <= 1 then
      raise exception 'The last organization admin cannot be changed.';
    end if;
  end if;

  update public.organization_members
  set role = normalized_role
  where id = target_member_id
  returning *
  into target_membership;

  return jsonb_build_object(
    'memberId', target_membership.id,
    'organizationId', target_membership.organization_id,
    'userId', target_membership.user_id,
    'role', target_membership.role,
    'status', target_membership.status
  );
end;
$$;

create or replace function public.update_organization_member_status(
  target_member_id uuid,
  next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_membership public.organization_members;
  target_membership public.organization_members;
  normalized_status text;
  active_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  normalized_status := lower(trim(coalesce(next_status, '')));

  if normalized_status not in ('active', 'suspended') then
    raise exception 'Invalid organization member status.';
  end if;

  select *
  into actor_membership
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if actor_membership.id is null
     or actor_membership.role <> 'admin'
     or actor_membership.status <> 'active' then
    raise exception 'Organization admin access is required.';
  end if;

  select *
  into target_membership
  from public.organization_members
  where id = target_member_id
  limit 1;

  if target_membership.id is null then
    raise exception 'Organization member not found.';
  end if;

  if target_membership.organization_id <> actor_membership.organization_id then
    raise exception 'You can only manage members in your own organization.';
  end if;

  if target_membership.user_id = auth.uid() then
    raise exception 'You cannot change your own organization status.';
  end if;

  if target_membership.status = normalized_status then
    return jsonb_build_object(
      'memberId', target_membership.id,
      'organizationId', target_membership.organization_id,
      'userId', target_membership.user_id,
      'role', target_membership.role,
      'status', target_membership.status
    );
  end if;

  if target_membership.role = 'admin'
     and target_membership.status = 'active'
     and normalized_status = 'suspended' then
    select count(*)
    into active_admin_count
    from public.organization_members
    where organization_id = target_membership.organization_id
      and role = 'admin'
      and status = 'active';

    if active_admin_count <= 1 then
      raise exception 'The last organization admin cannot be suspended.';
    end if;
  end if;

  update public.organization_members
  set status = normalized_status
  where id = target_member_id
  returning *
  into target_membership;

  return jsonb_build_object(
    'memberId', target_membership.id,
    'organizationId', target_membership.organization_id,
    'userId', target_membership.user_id,
    'role', target_membership.role,
    'status', target_membership.status
  );
end;
$$;

create or replace function public.remove_organization_member(target_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_membership public.organization_members;
  target_membership public.organization_members;
  active_admin_count integer;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into actor_membership
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if actor_membership.id is null
     or actor_membership.role <> 'admin'
     or actor_membership.status <> 'active' then
    raise exception 'Organization admin access is required.';
  end if;

  select *
  into target_membership
  from public.organization_members
  where id = target_member_id
  limit 1;

  if target_membership.id is null then
    raise exception 'Organization member not found.';
  end if;

  if target_membership.organization_id <> actor_membership.organization_id then
    raise exception 'You can only manage members in your own organization.';
  end if;

  if target_membership.user_id = auth.uid() then
    raise exception 'You cannot remove your own organization access.';
  end if;

  if target_membership.role = 'admin'
     and target_membership.status = 'active' then
    select count(*)
    into active_admin_count
    from public.organization_members
    where organization_id = target_membership.organization_id
      and role = 'admin'
      and status = 'active';

    if active_admin_count <= 1 then
      raise exception 'The last organization admin cannot be removed.';
    end if;
  end if;

  delete from public.organization_members
  where id = target_member_id;

  return jsonb_build_object(
    'memberId', target_membership.id,
    'organizationId', target_membership.organization_id,
    'userId', target_membership.user_id,
    'removed', true
  );
end;
$$;

create or replace function public.cancel_team_invite(target_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_membership public.organization_members;
  target_invite public.team_invites;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into actor_membership
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if actor_membership.id is null
     or actor_membership.role <> 'admin'
     or actor_membership.status <> 'active' then
    raise exception 'Organization admin access is required.';
  end if;

  select *
  into target_invite
  from public.team_invites
  where id = target_invite_id
  limit 1;

  if target_invite.id is null then
    raise exception 'Invite not found.';
  end if;

  if target_invite.organization_id <> actor_membership.organization_id then
    raise exception 'You can only manage invites in your own organization.';
  end if;

  if target_invite.status <> 'pending' then
    raise exception 'Only pending invites can be canceled.';
  end if;

  update public.team_invites
  set status = 'canceled'
  where id = target_invite_id
  returning *
  into target_invite;

  return jsonb_build_object(
    'inviteId', target_invite.id,
    'organizationId', target_invite.organization_id,
    'status', target_invite.status
  );
end;
$$;

revoke all on function public.get_organization_leaderboard_rows(uuid) from public;
grant execute on function public.get_organization_leaderboard_rows(uuid) to authenticated;

revoke all on function public.update_organization_member_role(uuid, text) from public;
grant execute on function public.update_organization_member_role(uuid, text) to authenticated;

revoke all on function public.update_organization_member_status(uuid, text) from public;
grant execute on function public.update_organization_member_status(uuid, text) to authenticated;

revoke all on function public.remove_organization_member(uuid) from public;
grant execute on function public.remove_organization_member(uuid) to authenticated;

revoke all on function public.cancel_team_invite(uuid) from public;
grant execute on function public.cancel_team_invite(uuid) to authenticated;
