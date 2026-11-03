-- Pre-expiry renewal reminder tracking (manual renew only — no autopay)
--
-- Expiration source of truth for one-time plans: public.profiles.plan_expires_at
--   (also written as subscriptions.current_period_end on activate; billing_model = one_time)
-- Reminder flags belong on profiles because email lives on profiles.
--
-- Requires earlier migration 20261103120000_one_time_plan_expiration.sql for plan_expires_at.

alter table public.profiles
  add column if not exists renewal_reminder_7d_sent_at timestamptz,
  add column if not exists renewal_reminder_3d_sent_at timestamptz,
  add column if not exists renewal_reminder_1d_sent_at timestamptz;

comment on column public.profiles.renewal_reminder_7d_sent_at is 'When 7-day plan expiry reminder was sent';
comment on column public.profiles.renewal_reminder_3d_sent_at is 'When 3-day plan expiry reminder was sent';
comment on column public.profiles.renewal_reminder_1d_sent_at is 'When 1-day plan expiry reminder was sent';
