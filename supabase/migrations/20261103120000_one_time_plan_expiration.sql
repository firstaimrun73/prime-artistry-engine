-- One-time plan purchases + manual renewal support (additive)
-- Does not cancel or alter existing PayPal recurring subscriptions.

-- Allow starter / ultra on profiles.plan (if enum-based)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'plan_type' AND n.nspname = 'public'
  ) THEN
    BEGIN
      ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'starter';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'ultra';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS billing_interval text,
  ADD COLUMN IF NOT EXISTS billing_provider text,
  ADD COLUMN IF NOT EXISTS plan_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_credit_grant_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiration_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_transaction_id text;

COMMENT ON COLUMN public.profiles.plan_expires_at IS
  'When the current paid plan access ends (one-time purchases). NULL = free or legacy recurring without local expiry.';
COMMENT ON COLUMN public.profiles.billing_interval IS
  'month | year for last verified one-time plan purchase';
COMMENT ON COLUMN public.profiles.billing_provider IS
  'paypal | razorpay | paypal_subscription (legacy recurring)';
COMMENT ON COLUMN public.profiles.next_credit_grant_at IS
  'Next monthly credit grant for annual one-time plans';
COMMENT ON COLUMN public.profiles.expiration_email_sent_at IS
  'Idempotency: when plan-expired Resend email was sent for current expiry cycle';

CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at
  ON public.profiles (plan_expires_at)
  WHERE plan_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_next_credit_grant
  ON public.profiles (next_credit_grant_at)
  WHERE next_credit_grant_at IS NOT NULL;

-- Track one-time vs legacy subscription on subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_model text DEFAULT 'recurring';

COMMENT ON COLUMN public.subscriptions.billing_model IS
  'recurring = PayPal Billing Subscription (legacy); one_time = local entitlement only';
