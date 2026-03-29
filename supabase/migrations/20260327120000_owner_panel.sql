-- Owner panel fix: include all organizations, analytics, follow-up

create table if not exists public.platform_owners (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.platform_owners enable row level security;
revoke all on public.platform_owners from public;
-- owners can read/write their own rows via service role only; no RLS policies added intentionally

insert into public.platform_owners (email)
values ('matansultan1@gmail.com')
on conflict (email) do nothing;

create table if not exists public.owner_org_notes (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  follow_up_status text not null default 'new' check (follow_up_status in ('new','contacted','offered_discount','upgraded')),
  note text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create or replace function public.owner_list_organizations()
returns table(
  id uuid,
  name text,
  slug text,
  organization_type text,
  plan_type text,
  plan_status text,
  max_members_allowed integer,
  trial_ends_at timestamptz,
  access_blocked boolean,
  billing_notes text,
  created_at timestamptz,
  total_members integer,
  active_members integer,
  attempts_7d integer,
  attempts_30d integer,
  last_activity timestamptz,
  pending_invites integer,
  limit_reached boolean,
  likely_to_convert boolean,
  follow_up_status text,
  owner_note text
)
language sql
security definer
set search_path = public
as $$
with caller as (
  select
    coalesce(nullif(lower(auth.jwt() ->> 'email'), ''), '') as email,
    coalesce(current_setting('request.jwt.claim.role', true), '') as jwt_role
),
allowed as (
  select
    exists (
      select 1
      from public.platform_owners owners
      join caller on owners.email = caller.email
    )
    or caller.jwt_role = 'service_role' as ok
  from caller
),
member_counts as (
  select organization_id,
    count(*) filter (where status = 'active') as active_members,
    count(*) as total_members
  from public.organization_members
  group by organization_id
),
activity as (
  select om.organization_id,
    count(*) filter (where ua.created_at > now() - interval '7 days') as attempts_7d,
    count(*) filter (where ua.created_at > now() - interval '30 days') as attempts_30d,
    max(ua.created_at) as last_activity
  from public.organization_members om
  left join public.user_attempts ua on ua.user_id = om.user_id
  group by om.organization_id
),
invite_stats as (
  select organization_id,
    count(*) filter (where status = 'pending') as pending_invites
  from public.team_invites
  group by organization_id
),
notes as (
  select organization_id, follow_up_status, note as owner_note
  from public.owner_org_notes
)
select o.id,
  o.name,
  o.slug,
  o.organization_type,
  o.plan_type,
  o.plan_status,
  o.max_members_allowed,
  o.trial_ends_at,
  o.access_blocked,
  o.billing_notes,
  o.created_at,
  coalesce(mc.total_members, 0) as total_members,
  coalesce(mc.active_members, 0) as active_members,
  coalesce(act.attempts_7d, 0) as attempts_7d,
  coalesce(act.attempts_30d, 0) as attempts_30d,
  act.last_activity,
  coalesce(inv.pending_invites, 0) as pending_invites,
  (coalesce(mc.active_members, 0) >= greatest(1, coalesce(o.max_members_allowed, 1))) as limit_reached,
  (
    (o.plan_status = 'free' and coalesce(mc.active_members, 0) >= greatest(1, coalesce(o.max_members_allowed, 1)))
    or (o.plan_status = 'free' and coalesce(act.attempts_7d, 0) >= 5)
    or (o.plan_status = 'trial' and o.trial_ends_at is not null and o.trial_ends_at < now() + interval '5 days')
    or (o.plan_status = 'past_due')
    or (o.plan_status = 'blocked' and coalesce(act.attempts_30d, 0) > 0)
  ) as likely_to_convert,
  coalesce(n.follow_up_status, 'new') as follow_up_status,
  n.owner_note
from public.organizations o
cross join allowed
left join member_counts mc on mc.organization_id = o.id
left join activity act on act.organization_id = o.id
left join invite_stats inv on inv.organization_id = o.id
left join notes n on n.organization_id = o.id
where allowed.ok
order by o.created_at desc;
$$;

revoke all on function public.owner_list_organizations() from public;
grant execute on function public.owner_list_organizations() to authenticated;
grant execute on function public.owner_list_organizations() to service_role;

create or replace function public.owner_update_org_plan(
  org_id uuid,
  next_plan_status text default null,
  next_plan_type text default null,
  next_max_members integer default null,
  next_trial_ends_at timestamptz default null,
  next_access_blocked boolean default null,
  next_billing_notes text default null,
  next_follow_up_status text default null,
  next_owner_note text default null,
  actor_id uuid default null
)
returns table(
  id uuid,
  name text,
  slug text,
  organization_type text,
  plan_type text,
  plan_status text,
  max_members_allowed integer,
  trial_ends_at timestamptz,
  access_blocked boolean,
  billing_notes text,
  created_at timestamptz,
  total_members integer,
  active_members integer,
  attempts_7d integer,
  attempts_30d integer,
  last_activity timestamptz,
  pending_invites integer,
  limit_reached boolean,
  likely_to_convert boolean,
  follow_up_status text,
  owner_note text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or exists (
      select 1
      from public.platform_owners owners
      where owners.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  ) then
    raise exception 'Owner access required';
  end if;

  update public.organizations as org
  set
    plan_status = coalesce(next_plan_status, org.plan_status),
    plan_type = coalesce(next_plan_type, org.plan_type),
    max_members_allowed = coalesce(next_max_members, org.max_members_allowed),
    trial_ends_at = coalesce(next_trial_ends_at, org.trial_ends_at),
    access_blocked = coalesce(next_access_blocked, org.access_blocked),
    billing_notes = coalesce(next_billing_notes, org.billing_notes)
  where org.id = org_id;

  if next_follow_up_status is not null or next_owner_note is not null then
    insert into public.owner_org_notes (organization_id, follow_up_status, note, updated_by)
    values (
      org_id,
      coalesce(nullif(trim(next_follow_up_status), ''), 'new'),
      nullif(trim(next_owner_note), ''),
      actor_id
    )
    on conflict (organization_id) do update
    set
      follow_up_status = coalesce(nullif(trim(excluded.follow_up_status), ''), owner_org_notes.follow_up_status),
      note = coalesce(excluded.note, owner_org_notes.note),
      updated_at = now(),
      updated_by = coalesce(actor_id, owner_org_notes.updated_by);
  end if;

  return query
  select listed.*
  from public.owner_list_organizations() as listed
  where listed.id = org_id;
end;
$$;

revoke all on function public.owner_update_org_plan(uuid, text, text, integer, timestamptz, boolean, text, text, text, uuid) from public;
grant execute on function public.owner_update_org_plan(uuid, text, text, integer, timestamptz, boolean, text, text, text, uuid) to authenticated;
grant execute on function public.owner_update_org_plan(uuid, text, text, integer, timestamptz, boolean, text, text, text, uuid) to service_role;
