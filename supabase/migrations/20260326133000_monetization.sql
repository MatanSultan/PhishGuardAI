-- Monetization and plan limits (MVP)

-- Plan fields on organizations
alter table public.organizations
  add column if not exists plan_type text not null default 'free';

alter table public.organizations
  add column if not exists plan_status text not null default 'free';

alter table public.organizations
  add column if not exists max_members_allowed integer not null default 1;

alter table public.organizations
  add column if not exists trial_ends_at timestamptz;

alter table public.organizations
  add column if not exists access_blocked boolean not null default false;

alter table public.organizations
  add column if not exists billing_notes text;

alter table public.organizations
  drop constraint if exists organizations_plan_type_check;

alter table public.organizations
  add constraint organizations_plan_type_check
  check (plan_type in ('free', 'growth', 'scale'));

alter table public.organizations
  drop constraint if exists organizations_plan_status_check;

alter table public.organizations
  add constraint organizations_plan_status_check
  check (plan_status in ('free', 'trial', 'active_paid', 'past_due', 'blocked'));

alter table public.organizations
  alter column max_members_allowed set not null,
  alter column max_members_allowed set default 1;

update public.organizations
set plan_type = 'free'
where plan_type is null;

update public.organizations
set plan_status = 'free'
where plan_status is null;

update public.organizations
set max_members_allowed = 1
where max_members_allowed is null;

update public.organizations
set access_blocked = false
where access_blocked is null;

-- Enforce member limit & block checks when accepting invites
create or replace function public.accept_team_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.team_invites;
  existing_org_id uuid;
  organization_row public.organizations;
  active_member_count integer;
  organization_slug text;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select organization_id
  into existing_org_id
  from public.organization_members
  where user_id = auth.uid()
  limit 1;

  if existing_org_id is not null then
    raise exception 'User already belongs to an organization';
  end if;

  select *
  into invite_row
  from public.team_invites
  where token = invite_token
    and status = 'pending'
    and (expires_at is null or expires_at > now())
  limit 1;

  if invite_row.id is null then
    raise exception 'Invite not found or expired';
  end if;

  if lower(invite_row.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Invite email does not match the authenticated user';
  end if;

  select *
  into organization_row
  from public.organizations
  where id = invite_row.organization_id
  limit 1;

  if organization_row.access_blocked or organization_row.plan_status = 'blocked' then
    raise exception 'Organization access is blocked';
  end if;

  if organization_row.plan_status = 'past_due' then
    raise exception 'Organization is past due';
  end if;

  select count(*)::integer
  into active_member_count
  from public.organization_members
  where organization_id = invite_row.organization_id
    and status = 'active';

  if organization_row.max_members_allowed is not null
     and active_member_count >= organization_row.max_members_allowed then
    raise exception 'Organization member limit reached';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invite_row.organization_id, auth.uid(), invite_row.role);

  update public.team_invites
  set status = 'accepted'
  where id = invite_row.id;

  select slug
  into organization_slug
  from public.organizations
  where id = invite_row.organization_id;

  return jsonb_build_object(
    'organizationId', invite_row.organization_id,
    'organizationSlug', organization_slug,
    'role', invite_row.role
  );
end;
$$;

-- Enforce limits when reactivating members
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
  organization_row public.organizations;
  active_member_count integer;
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

  if normalized_status = 'active' and target_membership.status <> 'active' then
    select *
    into organization_row
    from public.organizations
    where id = target_membership.organization_id
    limit 1;

    if organization_row.access_blocked or organization_row.plan_status = 'blocked' then
      raise exception 'Organization access is blocked';
    end if;

    if organization_row.plan_status = 'past_due' then
      raise exception 'Organization is past due';
    end if;

    select count(*)::integer
    into active_member_count
    from public.organization_members
    where organization_id = target_membership.organization_id
      and status = 'active';

    if organization_row.max_members_allowed is not null
       and active_member_count >= organization_row.max_members_allowed then
      raise exception 'Organization member limit reached';
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

revoke all on function public.update_organization_member_status(uuid, text) from public;
grant execute on function public.update_organization_member_status(uuid, text) to authenticated;

-- Make max_members_allowed positive
alter table public.organizations
  add constraint organizations_max_members_positive
  check (max_members_allowed > 0);
