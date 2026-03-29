-- Real billing ledger and verified payment upgrade flow

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  initiated_by uuid references public.profiles(id) on delete set null,
  provider text not null check (provider in ('paypal')),
  provider_order_id text not null unique,
  idempotency_key text not null unique,
  target_plan_type text not null check (target_plan_type in ('free', 'growth', 'scale')),
  target_plan_status text not null check (target_plan_status in ('free', 'trial', 'active_paid', 'past_due', 'blocked')),
  target_max_members integer not null check (target_max_members > 0),
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null,
  status text not null default 'created' check (status in ('created', 'approved', 'captured', 'completed', 'failed', 'canceled')),
  approval_url text,
  payer_email text,
  provider_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  captured_at timestamptz,
  processed_at timestamptz,
  plan_applied_at timestamptz
);

create index if not exists billing_orders_organization_idx
  on public.billing_orders (organization_id, created_at desc);

create index if not exists billing_orders_status_idx
  on public.billing_orders (status, created_at desc);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  billing_order_id uuid not null references public.billing_orders(id) on delete cascade,
  provider text not null check (provider in ('paypal')),
  provider_capture_id text not null unique,
  status text not null check (status in ('completed', 'pending', 'failed', 'refunded', 'declined')),
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null,
  payer_email text,
  source text not null check (source in ('capture', 'webhook')),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_payments_order_idx
  on public.billing_payments (billing_order_id, created_at desc);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  billing_order_id uuid references public.billing_orders(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  provider text check (provider in ('paypal')),
  source text not null check (source in ('checkout', 'capture', 'webhook', 'system')),
  event_type text not null,
  status text,
  summary text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists billing_events_provider_event_uidx
  on public.billing_events (provider_event_id)
  where provider_event_id is not null;

create index if not exists billing_events_organization_idx
  on public.billing_events (organization_id, created_at desc);

create index if not exists billing_events_order_idx
  on public.billing_events (billing_order_id, created_at desc);

create table if not exists public.organization_plan_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  billing_order_id uuid unique references public.billing_orders(id) on delete set null,
  changed_by uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('owner_console', 'paypal_payment', 'system')),
  previous_plan_type text not null,
  previous_plan_status text not null,
  previous_max_members integer not null,
  next_plan_type text not null,
  next_plan_status text not null,
  next_max_members integer not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists organization_plan_changes_org_idx
  on public.organization_plan_changes (organization_id, created_at desc);

alter table public.billing_orders enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_events enable row level security;
alter table public.organization_plan_changes enable row level security;

revoke all on public.billing_orders from public;
revoke all on public.billing_payments from public;
revoke all on public.billing_events from public;
revoke all on public.organization_plan_changes from public;

create or replace function public.record_verified_billing_payment(
  p_provider text,
  p_provider_order_id text,
  p_provider_capture_id text,
  p_capture_status text,
  p_amount numeric,
  p_currency text,
  p_payer_email text default null,
  p_payment_source text default 'capture',
  p_event_source text default 'capture',
  p_event_type text default null,
  p_event_summary text default null,
  p_provider_event_id text default null,
  p_order_payload jsonb default '{}'::jsonb,
  p_capture_payload jsonb default '{}'::jsonb
)
returns table(
  billing_order_id uuid,
  organization_id uuid,
  provider_order_id text,
  provider_capture_id text,
  payment_status text,
  order_status text,
  plan_applied boolean,
  plan_type text,
  plan_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.billing_orders;
  v_org public.organizations;
  v_plan_change_id uuid;
  v_active_member_count integer := 0;
  v_normalized_capture_status text := lower(trim(coalesce(p_capture_status, '')));
  v_payment_status text;
  v_order_status text;
  v_plan_applied boolean := false;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;

  if coalesce(trim(p_provider_order_id), '') = '' then
    raise exception 'Provider order id is required';
  end if;

  if coalesce(trim(p_provider_capture_id), '') = '' then
    raise exception 'Provider capture id is required';
  end if;

  v_payment_status :=
    case
      when v_normalized_capture_status = 'completed' then 'completed'
      when v_normalized_capture_status in ('pending', 'created') then 'pending'
      when v_normalized_capture_status in ('refunded', 'partially_refunded') then 'refunded'
      when v_normalized_capture_status in ('declined', 'denied') then 'declined'
      else 'failed'
    end;

  v_order_status :=
    case
      when v_normalized_capture_status = 'completed' then 'completed'
      when v_normalized_capture_status in ('pending', 'created') then 'captured'
      when v_normalized_capture_status in ('canceled', 'voided') then 'canceled'
      else 'failed'
    end;

  select *
  into v_order
  from public.billing_orders as orders
  where orders.provider = p_provider
    and orders.provider_order_id = p_provider_order_id
  for update;

  if v_order.id is null then
    raise exception 'Billing order not found';
  end if;

  update public.billing_orders as orders
  set
    status = v_order_status,
    payer_email = coalesce(nullif(trim(p_payer_email), ''), orders.payer_email),
    provider_payload = coalesce(orders.provider_payload, '{}'::jsonb)
      || jsonb_build_object(
        'order', coalesce(p_order_payload, '{}'::jsonb),
        'capture', coalesce(p_capture_payload, '{}'::jsonb)
      ),
    updated_at = now(),
    processed_at = now(),
    captured_at = case
      when v_normalized_capture_status = 'completed' and orders.captured_at is null then now()
      else orders.captured_at
    end
  where orders.id = v_order.id
  returning *
  into v_order;

  insert into public.billing_payments (
    billing_order_id,
    provider,
    provider_capture_id,
    status,
    amount,
    currency,
    payer_email,
    source,
    provider_payload
  )
  values (
    v_order.id,
    p_provider,
    p_provider_capture_id,
    v_payment_status,
    p_amount,
    p_currency,
    nullif(trim(p_payer_email), ''),
    p_payment_source,
    coalesce(p_capture_payload, '{}'::jsonb)
  )
  on conflict (provider_capture_id) do update
  set
    status = excluded.status,
    amount = excluded.amount,
    currency = excluded.currency,
    payer_email = coalesce(excluded.payer_email, public.billing_payments.payer_email),
    source = excluded.source,
    provider_payload = excluded.provider_payload,
    updated_at = now();

  if p_provider_event_id is not null then
    insert into public.billing_events (
      billing_order_id,
      organization_id,
      actor_user_id,
      provider,
      source,
      event_type,
      status,
      summary,
      provider_event_id,
      payload
    )
    values (
      v_order.id,
      v_order.organization_id,
      v_order.initiated_by,
      p_provider,
      p_event_source,
      coalesce(p_event_type, 'paypal.capture'),
      v_payment_status,
      coalesce(p_event_summary, 'PayPal payment event received'),
      p_provider_event_id,
      jsonb_build_object(
        'providerOrderId', p_provider_order_id,
        'providerCaptureId', p_provider_capture_id,
        'paymentStatus', v_payment_status,
        'orderPayload', coalesce(p_order_payload, '{}'::jsonb),
        'capturePayload', coalesce(p_capture_payload, '{}'::jsonb)
      )
    )
    on conflict (provider_event_id) do nothing;
  end if;

  if v_normalized_capture_status = 'completed' and v_order.plan_applied_at is null then
    select count(*)::integer
    into v_active_member_count
    from public.organization_members as members
    where members.organization_id = v_order.organization_id
      and members.status = 'active';

    select *
    into v_org
    from public.organizations as org
    where org.id = v_order.organization_id
    for update;

    if v_org.id is null then
      raise exception 'Organization not found for billing order';
    end if;

    insert into public.organization_plan_changes (
      organization_id,
      billing_order_id,
      changed_by,
      source,
      previous_plan_type,
      previous_plan_status,
      previous_max_members,
      next_plan_type,
      next_plan_status,
      next_max_members,
      note
    )
    values (
      v_order.organization_id,
      v_order.id,
      v_order.initiated_by,
      'paypal_payment',
      v_org.plan_type,
      v_org.plan_status,
      coalesce(v_org.max_members_allowed, 1),
      v_order.target_plan_type,
      v_order.target_plan_status,
      greatest(v_order.target_max_members, greatest(v_active_member_count, 1)),
      format(
        'Verified %s payment %s %s via %s',
        p_provider,
        p_amount,
        p_currency,
        p_payment_source
      )
    )
    on conflict (billing_order_id) do nothing
    returning id
    into v_plan_change_id;

    if v_plan_change_id is not null then
      update public.organizations as org
      set
        plan_type = v_order.target_plan_type,
        plan_status = v_order.target_plan_status,
        max_members_allowed = greatest(v_order.target_max_members, greatest(v_active_member_count, 1)),
        access_blocked = false,
        trial_ends_at = null
      where org.id = v_order.organization_id
      returning *
      into v_org;

      update public.billing_orders as orders
      set
        status = 'completed',
        plan_applied_at = now(),
        updated_at = now(),
        processed_at = now()
      where orders.id = v_order.id
      returning *
      into v_order;

      v_plan_applied := true;

      insert into public.billing_events (
        billing_order_id,
        organization_id,
        actor_user_id,
        provider,
        source,
        event_type,
        status,
        summary,
        payload
      )
      values (
        v_order.id,
        v_order.organization_id,
        v_order.initiated_by,
        p_provider,
        'system',
        'billing.upgrade_applied',
        'completed',
        format('Organization upgraded to %s after verified payment', v_order.target_plan_type),
        jsonb_build_object(
          'providerOrderId', p_provider_order_id,
          'providerCaptureId', p_provider_capture_id,
          'paymentStatus', v_payment_status,
          'targetPlanType', v_order.target_plan_type,
          'targetPlanStatus', v_order.target_plan_status,
          'targetMaxMembers', v_order.target_max_members
        )
      );
    end if;
  end if;

  return query
  select
    v_order.id,
    v_order.organization_id,
    v_order.provider_order_id,
    p_provider_capture_id,
    v_payment_status,
    v_order.status,
    v_plan_applied,
    coalesce(v_org.plan_type, v_order.target_plan_type),
    coalesce(v_org.plan_status, v_order.target_plan_status);
end;
$$;

revoke all on function public.record_verified_billing_payment(
  text,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
) from public;

grant execute on function public.record_verified_billing_payment(
  text,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
) to service_role;
