-- Fix PL/pgSQL ambiguity in owner_update_org_plan
-- Keep the public RPC signature unchanged while qualifying all owner/org columns explicitly.

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
      follow_up_status = coalesce(
        nullif(trim(excluded.follow_up_status), ''),
        public.owner_org_notes.follow_up_status
      ),
      note = coalesce(excluded.note, public.owner_org_notes.note),
      updated_at = now(),
      updated_by = coalesce(actor_id, public.owner_org_notes.updated_by);
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
