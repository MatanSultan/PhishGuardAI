alter table public.organizations
  add column if not exists organization_type text;

update public.organizations
set organization_type = case
  when lower(coalesce(industry, '')) like '%nursing%'
    or lower(coalesce(industry, '')) like '%elder%'
    or lower(coalesce(industry, '')) like '%care%'
    or lower(coalesce(industry, '')) like '%health%'
    then 'nursing_home'
  when lower(coalesce(industry, '')) like '%school%'
    or lower(coalesce(industry, '')) like '%education%'
    or lower(coalesce(industry, '')) like '%academy%'
    then 'education'
  when lower(coalesce(industry, '')) like '%nonprofit%'
    or lower(coalesce(industry, '')) like '%ngo%'
    or lower(coalesce(industry, '')) like '%association%'
    or lower(coalesce(industry, '')) like '%charity%'
    then 'nonprofit'
  when lower(coalesce(industry, '')) like '%municip%'
    or lower(coalesce(industry, '')) like '%public%'
    or lower(coalesce(industry, '')) like '%local authority%'
    then 'municipality'
  when lower(coalesce(industry, '')) like '%smb%'
    or lower(coalesce(industry, '')) like '%small business%'
    or lower(coalesce(industry, '')) like '%small%'
    then 'smb'
  else 'other'
end
where organization_type is null;

alter table public.organizations
  alter column organization_type set default 'other';

update public.organizations
set organization_type = 'other'
where organization_type is null;

alter table public.organizations
  alter column organization_type set not null;

alter table public.organizations
  drop constraint if exists organizations_organization_type_check;

alter table public.organizations
  add constraint organizations_organization_type_check
  check (
    organization_type in (
      'nursing_home',
      'education',
      'nonprofit',
      'municipality',
      'smb',
      'other'
    )
  );

drop function if exists public.create_organization_with_admin(text, text, text);

create or replace function public.create_organization_with_admin(
  org_name text,
  org_slug text,
  org_industry text default null,
  org_type text default 'other'
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
  normalized_type text;
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

  normalized_type := lower(coalesce(nullif(trim(org_type), ''), 'other'));

  if normalized_type not in (
    'nursing_home',
    'education',
    'nonprofit',
    'municipality',
    'smb',
    'other'
  ) then
    raise exception 'Invalid organization type';
  end if;

  insert into public.organizations (name, slug, industry, organization_type, created_by)
  values (
    trim(org_name),
    lower(trim(org_slug)),
    nullif(trim(coalesce(org_industry, '')), ''),
    normalized_type,
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

revoke all on function public.create_organization_with_admin(text, text, text, text) from public;
grant execute on function public.create_organization_with_admin(text, text, text, text) to authenticated;

