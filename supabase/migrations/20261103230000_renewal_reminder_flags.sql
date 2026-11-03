-- Pre-expiry renewal reminder tracking (manual renew only — no autopay)
alter table public.profiles
  add column if not exists renewal_reminder_7d_sent_at timestamptz,
  add column if not exists renewal_reminder_3d_sent_at timestamptz,
  add column if not exists renewal_reminder_1d_sent_at timestamptz;

comment on column public.profiles.renewal_reminder_7d_sent_at is 'When 7-day plan expiry reminder was sent';
comment on column public.profiles.renewal_reminder_3d_sent_at is 'When 3-day plan expiry reminder was sent';
comment on column public.profiles.renewal_reminder_1d_sent_at is 'When 1-day plan expiry reminder was sent';
