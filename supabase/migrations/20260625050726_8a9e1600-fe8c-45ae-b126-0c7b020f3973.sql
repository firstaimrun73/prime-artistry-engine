
-- ── FIX 1: No free credits on signup ──
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 0;
ALTER TABLE public.user_credits ALTER COLUMN credits SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- ── FIX 2/3: Remove the unauthenticated self-grant path ──
-- set_plan_credits let any authenticated user grant themselves plan credits
-- with no payment. Drop it entirely; plans are credited only via verified webhooks.
DROP FUNCTION IF EXISTS public.set_plan_credits(plan_type, integer, text);

-- ── FIX 6: Audit log for every credit addition ──
CREATE TABLE public.credit_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_id text NOT NULL,
  payment_method text,
  amount_paid numeric(12,2),
  currency text,
  credits_added integer NOT NULL,
  reason text NOT NULL DEFAULT 'payment',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.credit_audit_log TO service_role;
ALTER TABLE public.credit_audit_log ENABLE ROW LEVEL SECURITY;
-- No authenticated/anon policies: backend (service_role) only.

-- ── FIX 5: Rate-limit log for payment attempts ──
CREATE TABLE public.payment_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  payment_method text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_attempts TO service_role;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payment_attempts_user_time ON public.payment_attempts (user_id, created_at);

-- ── FIX 2/3/6: Harden credit application ──
-- Credits are added ONLY when a matching payment_transactions row exists.
-- Idempotent via credit_ledger unique transaction_id. Writes an audit row.
CREATE OR REPLACE FUNCTION public.apply_payment_credits(_user_id uuid, _transaction_id text, _credits integer, _reason text DEFAULT 'payment'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _inserted uuid;
  _new integer;
  _tx public.payment_transactions%ROWTYPE;
BEGIN
  -- Require a real payment transaction. No transaction => block.
  SELECT * INTO _tx
    FROM public.payment_transactions
   WHERE transaction_id = _transaction_id
     AND user_id = _user_id;

  IF _tx.transaction_id IS NULL THEN
    RAISE EXCEPTION 'NO_PAYMENT_TRANSACTION';
  END IF;

  -- Credits must match the recorded purchase; never trust caller-supplied amount.
  IF _credits IS NULL OR _credits <> _tx.credits_purchased THEN
    RAISE EXCEPTION 'CREDIT_AMOUNT_MISMATCH';
  END IF;

  INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
  VALUES (_user_id, _transaction_id, _tx.credits_purchased, _reason)
  ON CONFLICT (transaction_id) DO NOTHING
  RETURNING id INTO _inserted;

  IF _inserted IS NULL THEN
    RETURN jsonb_build_object('credited', false, 'alreadyDone', true);
  END IF;

  UPDATE public.payment_transactions
     SET payment_status = 'completed', updated_at = now()
   WHERE transaction_id = _transaction_id;

  UPDATE public.profiles
     SET credits = credits + _tx.credits_purchased, updated_at = now()
   WHERE id = _user_id
   RETURNING credits INTO _new;

  INSERT INTO public.credit_audit_log
    (user_id, transaction_id, payment_method, amount_paid, currency, credits_added, reason)
  VALUES
    (_user_id, _transaction_id, _tx.payment_method, _tx.amount, _tx.currency, _tx.credits_purchased, _reason);

  RETURN jsonb_build_object('credited', true, 'alreadyDone', false, 'credits', _new);
END;
$function$;
