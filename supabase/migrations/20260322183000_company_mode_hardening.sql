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

  if not public.is_org_member(target_organization_id) then
    raise exception 'Organization membership is required.';
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
  order by members.joined_at asc;
end;
$$;

drop policy if exists "profiles_select_same_org" on public.profiles;
drop policy if exists "profiles_select_admin_same_org" on public.profiles;
create policy "profiles_select_admin_same_org"
on public.profiles
for select
to authenticated
using (public.can_admin_access_org_user(id));

drop policy if exists "training_profile_select_same_org" on public.user_training_profile;
drop policy if exists "training_profile_select_admin_same_org" on public.user_training_profile;
create policy "training_profile_select_admin_same_org"
on public.user_training_profile
for select
to authenticated
using (public.can_admin_access_org_user(user_id));

revoke all on function public.get_organization_leaderboard_rows(uuid) from public;
grant execute on function public.get_organization_leaderboard_rows(uuid) to authenticated;
