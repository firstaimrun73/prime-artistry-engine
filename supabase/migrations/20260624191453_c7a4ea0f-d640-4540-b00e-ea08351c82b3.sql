
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method    TEXT NOT NULL CHECK (payment_method IN ('razorpay','nowpayments')),
  amount            NUMERIC(12,2) NOT NULL,
  currency          TEXT NOT NULL,
  credits_purchased INTEGER NOT NULL DEFAULT 0,
  transaction_id    TEXT UNIQUE,
  gateway_order_id  TEXT,
  payment_status    TEXT NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending','processing','completed','failed','underpaid','overpaid','expired')),
  gateway_response  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON public.payment_transactions(transaction_id);

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway      TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  payload      JSONB NOT NULL,
  processed    BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gateway, event_id)
);
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL REFERENCES public.payment_transactions(transaction_id),
  credits_added  INTEGER NOT NULL,
  reason         TEXT NOT NULL DEFAULT 'payment',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transaction_id)
);
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credit ledger"
  ON public.credit_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Idempotently grant purchased credits for a completed payment.
CREATE OR REPLACE FUNCTION public.apply_payment_credits(
  _user_id uuid, _transaction_id text, _credits integer, _reason text DEFAULT 'payment'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted uuid;
  _new integer;
BEGIN
  INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
  VALUES (_user_id, _transaction_id, _credits, _reason)
  ON CONFLICT (transaction_id) DO NOTHING
  RETURNING id INTO _inserted;

  IF _inserted IS NULL THEN
    RETURN jsonb_build_object('credited', false, 'alreadyDone', true);
  END IF;

  UPDATE public.payment_transactions
     SET payment_status = 'completed', updated_at = now()
   WHERE transaction_id = _transaction_id;

  UPDATE public.profiles
     SET credits = credits + _credits, updated_at = now()
   WHERE id = _user_id
   RETURNING credits INTO _new;

  RETURN jsonb_build_object('credited', true, 'alreadyDone', false, 'credits', _new);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_payment_credits(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_credits(uuid, text, integer, text) TO service_role;
