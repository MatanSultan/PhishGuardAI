-- Ensure provider_event_id can be used safely with ON CONFLICT (provider_event_id)

drop index if exists public.billing_events_provider_event_uidx;

create unique index if not exists billing_events_provider_event_uidx
  on public.billing_events (provider_event_id);
