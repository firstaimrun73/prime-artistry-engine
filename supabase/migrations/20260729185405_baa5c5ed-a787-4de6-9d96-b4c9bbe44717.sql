-- Refund requests
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  refund_amount numeric,
  currency text,
  paypal_refund_id text,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own refund requests"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own refund requests"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_pending_unique
  ON public.refund_requests (payment_transaction_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS refund_requests_user_idx ON public.refund_requests (user_id, requested_at DESC);

CREATE TRIGGER update_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subscription cancellation support
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- PayPal refund bookkeeping on transactions
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS paypal_capture_id text,
  ADD COLUMN IF NOT EXISTS paypal_refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- Audit log
CREATE TABLE IF NOT EXISTS public.billing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor text,
  action text NOT NULL,
  target_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.billing_audit_log TO authenticated;
GRANT ALL ON public.billing_audit_log TO service_role;

ALTER TABLE public.billing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own billing audit entries"
  ON public.billing_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);