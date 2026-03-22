alter table public.user_training_profile
  add column if not exists preferred_domains text[] not null default '{}'::text[];

alter table public.user_training_profile
  drop constraint if exists user_training_profile_preferred_domains_check;

alter table public.user_training_profile
  add constraint user_training_profile_preferred_domains_check
  check (
    preferred_domains <@ array[
      'bank',
      'delivery',
      'account_security',
      'workplace',
      'social',
      'shopping',
      'government'
    ]::text[]
  );

alter table public.simulations
  drop constraint if exists simulations_category_check;

alter table public.simulations
  add constraint simulations_category_check
  check (
    category in (
      'bank',
      'delivery',
      'account_security',
      'workplace',
      'social',
      'shopping',
      'government'
    )
  );

alter table public.user_training_profile
  drop constraint if exists user_training_profile_weakest_category_check;

alter table public.user_training_profile
  add constraint user_training_profile_weakest_category_check
  check (
    weakest_category is null
    or weakest_category in (
      'bank',
      'delivery',
      'account_security',
      'workplace',
      'social',
      'shopping',
      'government'
    )
  );

alter table public.user_training_profile
  drop constraint if exists user_training_profile_strongest_category_check;

alter table public.user_training_profile
  add constraint user_training_profile_strongest_category_check
  check (
    strongest_category is null
    or strongest_category in (
      'bank',
      'delivery',
      'account_security',
      'workplace',
      'social',
      'shopping',
      'government'
    )
  );

alter table public.user_weaknesses
  drop constraint if exists user_weaknesses_category_check;

alter table public.user_weaknesses
  add constraint user_weaknesses_category_check
  check (
    category is null
    or category in (
      'bank',
      'delivery',
      'account_security',
      'workplace',
      'social',
      'shopping',
      'government'
    )
  );

alter table public.memory_entries
  drop constraint if exists memory_entries_related_category_check;

alter table public.memory_entries
  add constraint memory_entries_related_category_check
  check (
    related_category is null
    or related_category in (
      'bank',
      'delivery',
      'account_security',
      'workplace',
      'social',
      'shopping',
      'government'
    )
  );

create index if not exists idx_user_training_profile_preferred_domains
  on public.user_training_profile using gin (preferred_domains);
