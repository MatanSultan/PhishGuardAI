create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  industry text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (user_id)
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  default_language text check (default_language in ('en', 'he')),
  allow_leaderboard boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_organizations_slug on public.organizations(slug);
create index if not exists idx_organization_members_org_role
  on public.organization_members(organization_id, role, joined_at desc);
create index if not exists idx_organization_members_user on public.organization_members(user_id);
create index if not exists idx_team_invites_org_status
  on public.team_invites(organization_id, status, created_at desc);
create index if not exists idx_team_invites_email_status
  on public.team_invites((lower(email)), status, created_at desc);
create index if not exists idx_team_invites_token on public.team_invites(token);

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
      and theirs.user_id = target_user_id
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
  );
$$;

create or replace function public.create_organization_with_admin(
  org_name text,
  org_slug text,
  org_industry text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  created_org public.organizations;
  existing_org_id uuid;
  next_default_language text;
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

  if coalesce(trim(org_name), '') = '' then
    raise exception 'Organization name is required';
  end if;

  if coalesce(trim(org_slug), '') = '' then
    raise exception 'Organization slug is required';
  end if;

  insert into public.organizations (name, slug, industry, created_by)
  values (
    trim(org_name),
    lower(trim(org_slug)),
    nullif(trim(coalesce(org_industry, '')), ''),
    auth.uid()
  )
  returning *
  into created_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (created_org.id, auth.uid(), 'admin');

  select preferred_language
  into next_default_language
  from public.profiles
  where id = auth.uid();

  insert into public.organization_settings (organization_id, default_language)
  values (created_org.id, coalesce(next_default_language, 'he'))
  on conflict (organization_id) do nothing;

  return created_org;
end;
$$;

create or replace function public.accept_team_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.team_invites;
  existing_org_id uuid;
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

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.organization_settings enable row level security;

drop policy if exists "organizations_select_members" on public.organizations;
create policy "organizations_select_members"
on public.organizations
for select
to authenticated
using (public.is_org_member(id));

drop policy if exists "organizations_insert_creator" on public.organizations;
create policy "organizations_insert_creator"
on public.organizations
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
on public.organizations
for update
to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

drop policy if exists "organization_members_select_same_org" on public.organization_members;
create policy "organization_members_select_same_org"
on public.organization_members
for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "team_invites_select_admin_or_invited" on public.team_invites;
create policy "team_invites_select_admin_or_invited"
on public.team_invites
for select
to authenticated
using (
  public.is_org_admin(organization_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "team_invites_insert_admin" on public.team_invites;
create policy "team_invites_insert_admin"
on public.team_invites
for insert
to authenticated
with check (
  public.is_org_admin(organization_id)
  and invited_by = auth.uid()
);

drop policy if exists "team_invites_update_admin" on public.team_invites;
create policy "team_invites_update_admin"
on public.team_invites
for update
to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "organization_settings_select_members" on public.organization_settings;
create policy "organization_settings_select_members"
on public.organization_settings
for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "organization_settings_insert_admin" on public.organization_settings;
create policy "organization_settings_insert_admin"
on public.organization_settings
for insert
to authenticated
with check (public.is_org_admin(organization_id));

drop policy if exists "organization_settings_update_admin" on public.organization_settings;
create policy "organization_settings_update_admin"
on public.organization_settings
for update
to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "profiles_select_same_org" on public.profiles;
create policy "profiles_select_same_org"
on public.profiles
for select
to authenticated
using (public.shares_organization_with(id));

drop policy if exists "training_profile_select_same_org" on public.user_training_profile;
create policy "training_profile_select_same_org"
on public.user_training_profile
for select
to authenticated
using (public.shares_organization_with(user_id));

drop policy if exists "user_attempts_select_admin_same_org" on public.user_attempts;
create policy "user_attempts_select_admin_same_org"
on public.user_attempts
for select
to authenticated
using (public.can_admin_access_org_user(user_id));

drop policy if exists "user_weaknesses_select_admin_same_org" on public.user_weaknesses;
create policy "user_weaknesses_select_admin_same_org"
on public.user_weaknesses
for select
to authenticated
using (public.can_admin_access_org_user(user_id));

drop policy if exists "memory_entries_select_admin_same_org" on public.memory_entries;
create policy "memory_entries_select_admin_same_org"
on public.memory_entries
for select
to authenticated
using (public.can_admin_access_org_user(user_id));

drop policy if exists "training_recommendations_select_admin_same_org" on public.training_recommendations;
create policy "training_recommendations_select_admin_same_org"
on public.training_recommendations
for select
to authenticated
using (public.can_admin_access_org_user(user_id));

drop policy if exists "analytics_events_select_admin_same_org" on public.analytics_events;
create policy "analytics_events_select_admin_same_org"
on public.analytics_events
for select
to authenticated
using (public.can_admin_access_org_user(user_id));

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

revoke all on function public.shares_organization_with(uuid) from public;
grant execute on function public.shares_organization_with(uuid) to authenticated;

revoke all on function public.can_admin_access_org_user(uuid) from public;
grant execute on function public.can_admin_access_org_user(uuid) to authenticated;

revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;

revoke all on function public.create_organization_with_admin(text, text, text) from public;
grant execute on function public.create_organization_with_admin(text, text, text) to authenticated;

revoke all on function public.accept_team_invite(text) from public;
grant execute on function public.accept_team_invite(text) to authenticated;
