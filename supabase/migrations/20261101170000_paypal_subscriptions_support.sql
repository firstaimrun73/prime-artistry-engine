-- PayPal Subscriptions support (surgical, additive only)
-- Does not alter existing one-time payment behaviour.

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.payment_transactions.metadata IS
  'Optional payment metadata (kind, plan, paypal_subscription_id, sale_id, etc.)';

-- Ensure subscription period + provider columns exist (idempotent)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text;

-- Helpful index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_sub_id
  ON public.subscriptions (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_tx_gateway_order
  ON public.payment_transactions (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;
