-- ============================================================================
-- MOTIO2EDIT — Full schema migration for a self-owned Supabase project
-- Run this in the SQL editor of YOUR new Supabase project (in order).
-- Safe to run once on an empty project. Includes: enums, tables, grants,
-- RLS, policies, functions, and triggers.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------
create type public.gen_type       as enum ('image', 'video');
create type public.gen_status     as enum ('pending', 'processing', 'success', 'failed');
create type public.plan_type      as enum ('free', 'plus', 'pro', 'studio', 'business');
create type public.ticket_category as enum ('payment','credits','generation','account','technical','feature_request','bug_report','other');
create type public.ticket_status   as enum ('open','in_progress','resolved','waiting_user','closed');

-- ---------------------------------------------------------------------------
-- 2. SHARED updated_at TRIGGER FUNCTION
-- ---------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. TABLES  (each followed by GRANT + RLS + POLICY, per Supabase rules)
-- ---------------------------------------------------------------------------

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan public.plan_type not null default 'free',
  credits integer not null default 0,
  currency text not null default 'USD',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();

-- user_credits --------------------------------------------------------------
create table public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_credits to authenticated;
grant all on public.user_credits to service_role;
alter table public.user_credits enable row level security;
create policy "Users can view own credits" on public.user_credits for select to authenticated using (auth.uid() = user_id);
create trigger trg_user_credits_updated before update on public.user_credits for each row execute function public.update_updated_at_column();

-- credit_ledger -------------------------------------------------------------
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  transaction_id text not null unique,
  credits_added integer not null,
  reason text not null default 'payment',
  created_at timestamptz not null default now()
);
grant select on public.credit_ledger to authenticated;
grant all on public.credit_ledger to service_role;
alter table public.credit_ledger enable row level security;
create policy "Users can view their own credit ledger" on public.credit_ledger for select to authenticated using (auth.uid() = user_id);

-- credit_transactions -------------------------------------------------------
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount integer not null,
  kind text not null,
  generation_type text,
  balance_after integer not null,
  refunded boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.credit_transactions to authenticated;
grant all on public.credit_transactions to service_role;
alter table public.credit_transactions enable row level security;
create policy "Users can view their own credit transactions" on public.credit_transactions for select to authenticated using (auth.uid() = user_id);

-- credit_audit_log ----------------------------------------------------------
create table public.credit_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  transaction_id text not null,
  payment_method text,
  amount_paid numeric,
  currency text,
  credits_added integer not null,
  reason text not null default 'payment',
  created_at timestamptz not null default now()
);
grant select on public.credit_audit_log to authenticated;
grant all on public.credit_audit_log to service_role;
alter table public.credit_audit_log enable row level security;
create policy "Users can view own credit audit log" on public.credit_audit_log for select to authenticated using (auth.uid() = user_id);

-- payment_transactions ------------------------------------------------------
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  payment_method text not null,
  amount numeric not null,
  currency text not null,
  credits_purchased integer not null default 0,
  transaction_id text unique,
  gateway_order_id text,
  payment_status text not null default 'pending',
  gateway_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.payment_transactions to authenticated;
grant all on public.payment_transactions to service_role;
alter table public.payment_transactions enable row level security;
create policy "Users can view their own payment transactions" on public.payment_transactions for select to authenticated using (auth.uid() = user_id);
create trigger trg_payment_transactions_updated before update on public.payment_transactions for each row execute function public.update_updated_at_column();

-- payments ------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  provider text,
  provider_payment_id text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Users can view own payments" on public.payments for select to authenticated using (auth.uid() = user_id);
create trigger trg_payments_updated before update on public.payments for each row execute function public.update_updated_at_column();

-- payment_attempts ----------------------------------------------------------
create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  payment_method text not null,
  created_at timestamptz not null default now()
);
grant select on public.payment_attempts to authenticated;
grant all on public.payment_attempts to service_role;
alter table public.payment_attempts enable row level security;
create policy "Users can view own payment attempts" on public.payment_attempts for select to authenticated using (auth.uid() = user_id);

-- subscriptions -------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan text not null default 'free',
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Users can view own subscriptions" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
create trigger trg_subscriptions_updated before update on public.subscriptions for each row execute function public.update_updated_at_column();

-- generations ---------------------------------------------------------------
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.gen_type not null,
  prompt text,
  input_url text,
  output_url text,
  status public.gen_status not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.generations to authenticated;
grant all on public.generations to service_role;
alter table public.generations enable row level security;
create policy "Users can manage own generations" on public.generations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- generation_history --------------------------------------------------------
create table public.generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  prompt text,
  input_path text,
  output_path text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.generation_history to authenticated;
grant all on public.generation_history to service_role;
alter table public.generation_history enable row level security;
create policy "Users can manage own generation history" on public.generation_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- usage_tracking ------------------------------------------------------------
create table public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  credits_used integer not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant select on public.usage_tracking to authenticated;
grant all on public.usage_tracking to service_role;
alter table public.usage_tracking enable row level security;
create policy "Users can view own usage" on public.usage_tracking for select to authenticated using (auth.uid() = user_id);

-- user_settings -------------------------------------------------------------
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preferred_currency text not null default 'USD',
  theme text not null default 'system',
  email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;
alter table public.user_settings enable row level security;
create policy "Users can manage own settings" on public.user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trg_user_settings_updated before update on public.user_settings for each row execute function public.update_updated_at_column();

-- support_tickets -----------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category public.ticket_category not null,
  subject text not null,
  message text not null,
  status public.ticket_status not null default 'open',
  priority text not null default 'normal',
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
alter table public.support_tickets enable row level security;
create policy "Users can manage own tickets" on public.support_tickets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger trg_support_tickets_updated before update on public.support_tickets for each row execute function public.update_updated_at_column();

-- feedback ------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_name text,
  user_email text,
  category text,
  rating integer,
  message text not null,
  screenshot_url text,
  page_url text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
grant select, insert on public.feedback to authenticated;
grant all on public.feedback to service_role;
alter table public.feedback enable row level security;
create policy "Users can view own feedback" on public.feedback for select to authenticated using (auth.uid() = user_id);
-- NOTE: add an INSERT policy if the app writes feedback from the client, e.g.
-- create policy "Users can insert feedback" on public.feedback for insert to authenticated with check (auth.uid() = user_id);

-- webhook_events ------------------------------------------------------------
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  gateway text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.webhook_events to service_role;
alter table public.webhook_events enable row level security;
create policy "No client access to webhook events" on public.webhook_events for all to anon, authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 4. EMAIL SUBSYSTEM TABLES (service-role only)
-- ---------------------------------------------------------------------------
create table public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  message_id text,
  template_name text not null,
  recipient_email text not null,
  status text not null,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant all on public.email_send_log to service_role;
alter table public.email_send_log enable row level security;
create policy "Service role can read send log"   on public.email_send_log for select using (auth.role() = 'service_role');
create policy "Service role can insert send log" on public.email_send_log for insert with check (auth.role() = 'service_role');
create policy "Service role can update send log" on public.email_send_log for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create table public.email_send_state (
  id integer primary key default 1,
  retry_after_until timestamptz,
  batch_size integer not null default 10,
  send_delay_ms integer not null default 200,
  auth_email_ttl_minutes integer not null default 15,
  transactional_email_ttl_minutes integer not null default 60,
  updated_at timestamptz not null default now()
);
grant all on public.email_send_state to service_role;
alter table public.email_send_state enable row level security;
create policy "Service role can manage send state" on public.email_send_state for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
insert into public.email_send_state (id) values (1) on conflict do nothing;

create table public.email_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
grant all on public.email_unsubscribe_tokens to service_role;
alter table public.email_unsubscribe_tokens enable row level security;
create policy "Service role can read tokens"        on public.email_unsubscribe_tokens for select using (auth.role() = 'service_role');
create policy "Service role can insert tokens"      on public.email_unsubscribe_tokens for insert with check (auth.role() = 'service_role');
create policy "Service role can mark tokens as used" on public.email_unsubscribe_tokens for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create table public.suppressed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reason text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant all on public.suppressed_emails to service_role;
alter table public.suppressed_emails enable row level security;
create policy "Service role can read suppressed emails"   on public.suppressed_emails for select using (auth.role() = 'service_role');
create policy "Service role can insert suppressed emails" on public.suppressed_emails for insert with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5. BUSINESS FUNCTIONS  (credits + payments)
-- ---------------------------------------------------------------------------
create or replace function public.deduct_credits(_amount integer, _gen_type text, _user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _uid uuid := _user_id; _new integer; _tx uuid;
begin
  if _uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if _amount is null or _amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  update public.profiles set credits = credits - _amount, updated_at = now()
    where id = _uid and credits >= _amount returning credits into _new;
  if _new is null then raise exception 'INSUFFICIENT_CREDITS'; end if;
  insert into public.credit_transactions (user_id, amount, kind, generation_type, balance_after)
    values (_uid, -_amount, 'debit', _gen_type, _new) returning id into _tx;
  return jsonb_build_object('transaction_id', _tx, 'credits', _new);
end;
$$;

create or replace function public.refund_credits(_transaction_id uuid, _user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _uid uuid := _user_id; _amount integer; _gen_type text; _new integer;
begin
  if _uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.credit_transactions set refunded = true
    where id = _transaction_id and user_id = _uid and kind = 'debit' and refunded = false
    returning -amount, generation_type into _amount, _gen_type;
  if _amount is null then return jsonb_build_object('refunded', false); end if;
  update public.profiles set credits = credits + _amount, updated_at = now()
    where id = _uid returning credits into _new;
  insert into public.credit_transactions (user_id, amount, kind, generation_type, balance_after)
    values (_uid, _amount, 'refund', _gen_type, _new);
  return jsonb_build_object('refunded', true, 'credits', _new);
end;
$$;

create or replace function public.apply_payment_credits(_user_id uuid, _transaction_id text, _credits integer, _reason text default 'payment')
returns jsonb language plpgsql security definer set search_path = public as $$
declare _inserted uuid; _new integer; _tx public.payment_transactions%rowtype;
begin
  select * into _tx from public.payment_transactions where transaction_id = _transaction_id and user_id = _user_id;
  if _tx.transaction_id is null then raise exception 'NO_PAYMENT_TRANSACTION'; end if;
  if _credits is null or _credits <> _tx.credits_purchased then raise exception 'CREDIT_AMOUNT_MISMATCH'; end if;
  insert into public.credit_ledger (user_id, transaction_id, credits_added, reason)
    values (_user_id, _transaction_id, _tx.credits_purchased, _reason)
    on conflict (transaction_id) do nothing returning id into _inserted;
  if _inserted is null then return jsonb_build_object('credited', false, 'alreadyDone', true); end if;
  update public.payment_transactions set payment_status = 'completed', updated_at = now() where transaction_id = _transaction_id;
  update public.profiles set credits = credits + _tx.credits_purchased, updated_at = now() where id = _user_id returning credits into _new;
  insert into public.credit_audit_log (user_id, transaction_id, payment_method, amount_paid, currency, credits_added, reason)
    values (_user_id, _transaction_id, _tx.payment_method, _tx.amount, _tx.currency, _tx.credits_purchased, _reason);
  return jsonb_build_object('credited', true, 'alreadyDone', false, 'credits', _new);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. NEW-USER TRIGGER: profile + signup bonus (60 credits)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, credits)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 60)
  on conflict (id) do nothing;
  insert into public.credit_ledger (user_id, transaction_id, credits_added, reason)
  values (new.id, 'FREE-SIGNUP-' || new.id, 60, 'free_signup_bonus')
  on conflict (transaction_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Done. The email QUEUE (pgmq) + pg_cron infrastructure is Lovable-managed and
-- optional; on your own project use Resend's HTTP API directly (already wired in
-- the app code) instead of the queue.
