create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  preferred_language text not null default 'he' check (preferred_language in ('en', 'he')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_training_profile (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_level text not null default 'easy' check (current_level in ('easy', 'medium', 'hard')),
  total_score integer not null default 0,
  confidence_score numeric not null default 0,
  phishing_detection_rate numeric not null default 0,
  legit_detection_rate numeric not null default 0,
  weakest_category text check (weakest_category in ('bank', 'delivery', 'account_security', 'workplace', 'social', 'shopping')),
  strongest_category text check (strongest_category in ('bank', 'delivery', 'account_security', 'workplace', 'social', 'shopping')),
  streak_count integer not null default 0,
  total_attempts integer not null default 0,
  last_trained_at timestamptz
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  category text not null check (category in ('bank', 'delivery', 'account_security', 'workplace', 'social', 'shopping')),
  language text not null default 'en' check (language in ('en', 'he')),
  title text,
  sender text,
  content text not null,
  is_phishing boolean not null,
  explanation text not null,
  red_flags jsonb not null default '[]'::jsonb check (jsonb_typeof(red_flags) = 'array'),
  source_model text,
  created_by text not null default 'ai',
  created_at timestamptz not null default now()
);

create table if not exists public.user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  user_answer boolean not null,
  is_correct boolean not null,
  confidence integer check (confidence between 0 and 2),
  user_reason text,
  ai_feedback text,
  response_time_ms integer check (response_time_ms >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.user_weaknesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weakness_key text not null,
  weakness_label text not null,
  category text check (category in ('bank', 'delivery', 'account_security', 'workplace', 'social', 'shopping')),
  score integer not null default 0,
  last_seen_at timestamptz not null default now(),
  unique(user_id, weakness_key)
);

create table if not exists public.memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memory_type text not null check (memory_type in ('summary', 'weakness', 'pattern', 'improvement')),
  content text not null,
  importance_score integer not null default 1 check (importance_score between 1 and 5),
  related_category text check (related_category in ('bank', 'delivery', 'account_security', 'workplace', 'social', 'shopping')),
  created_at timestamptz not null default now()
);

create table if not exists public.training_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recommendation_text text not null,
  reason text,
  priority integer not null default 1 check (priority between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_user_training_profile_last_trained_at on public.user_training_profile(last_trained_at desc);
create index if not exists idx_simulations_lookup on public.simulations(language, channel, category, difficulty, created_at desc);
create index if not exists idx_simulations_created_at on public.simulations(created_at desc);
create index if not exists idx_user_attempts_user_created_at on public.user_attempts(user_id, created_at desc);
create index if not exists idx_user_attempts_simulation on public.user_attempts(simulation_id);
create index if not exists idx_user_weaknesses_user_score on public.user_weaknesses(user_id, score desc, last_seen_at desc);
create index if not exists idx_memory_entries_user_created_at on public.memory_entries(user_id, created_at desc);
create index if not exists idx_memory_entries_user_category on public.memory_entries(user_id, related_category, created_at desc);
create index if not exists idx_training_recommendations_user_priority on public.training_recommendations(user_id, priority desc, created_at desc);
create index if not exists idx_analytics_events_user_event on public.analytics_events(user_id, event_name, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_locale text;
begin
  next_locale := case
    when new.raw_user_meta_data ->> 'preferred_language' in ('en', 'he') then new.raw_user_meta_data ->> 'preferred_language'
    else 'he'
  end;

  insert into public.profiles (id, full_name, email, preferred_language)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    coalesce(new.email, ''),
    next_locale
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    preferred_language = excluded.preferred_language;

  insert into public.user_training_profile (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_locale text;
begin
  next_locale := case
    when new.raw_user_meta_data ->> 'preferred_language' in ('en', 'he') then new.raw_user_meta_data ->> 'preferred_language'
    else 'he'
  end;

  update public.profiles
  set
    email = coalesce(new.email, profiles.email),
    full_name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), profiles.full_name),
    preferred_language = next_locale
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row execute procedure public.sync_profile_from_auth_user();

alter table public.profiles enable row level security;
alter table public.user_training_profile enable row level security;
alter table public.simulations enable row level security;
alter table public.user_attempts enable row level security;
alter table public.user_weaknesses enable row level security;
alter table public.memory_entries enable row level security;
alter table public.training_recommendations enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "training_profile_select_own" on public.user_training_profile;
create policy "training_profile_select_own"
on public.user_training_profile
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "training_profile_insert_own" on public.user_training_profile;
create policy "training_profile_insert_own"
on public.user_training_profile
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "training_profile_update_own" on public.user_training_profile;
create policy "training_profile_update_own"
on public.user_training_profile
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "simulations_select_authenticated" on public.simulations;
create policy "simulations_select_authenticated"
on public.simulations
for select
to authenticated
using (true);

drop policy if exists "simulations_insert_authenticated" on public.simulations;
create policy "simulations_insert_authenticated"
on public.simulations
for insert
to authenticated
with check (true);

drop policy if exists "user_attempts_select_own" on public.user_attempts;
create policy "user_attempts_select_own"
on public.user_attempts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_attempts_insert_own" on public.user_attempts;
create policy "user_attempts_insert_own"
on public.user_attempts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_attempts_update_own" on public.user_attempts;
create policy "user_attempts_update_own"
on public.user_attempts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_weaknesses_select_own" on public.user_weaknesses;
create policy "user_weaknesses_select_own"
on public.user_weaknesses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_weaknesses_insert_own" on public.user_weaknesses;
create policy "user_weaknesses_insert_own"
on public.user_weaknesses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_weaknesses_update_own" on public.user_weaknesses;
create policy "user_weaknesses_update_own"
on public.user_weaknesses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "memory_entries_select_own" on public.memory_entries;
create policy "memory_entries_select_own"
on public.memory_entries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "memory_entries_insert_own" on public.memory_entries;
create policy "memory_entries_insert_own"
on public.memory_entries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "training_recommendations_select_own" on public.training_recommendations;
create policy "training_recommendations_select_own"
on public.training_recommendations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "training_recommendations_insert_own" on public.training_recommendations;
create policy "training_recommendations_insert_own"
on public.training_recommendations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "analytics_events_select_own" on public.analytics_events;
create policy "analytics_events_select_own"
on public.analytics_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "analytics_events_insert_own" on public.analytics_events;
create policy "analytics_events_insert_own"
on public.analytics_events
for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);
