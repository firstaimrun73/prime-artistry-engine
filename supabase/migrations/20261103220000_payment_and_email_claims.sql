-- Additive: concurrent payment processing claims + expiration email claims.
-- Does not alter legacy PayPal recurring subscription behaviour.
-- DO NOT apply to production without explicit approval.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expiration_email_claimed_at timestamptz;

COMMENT ON COLUMN public.profiles.expiration_email_claimed_at IS
  'Claim lock for sending plan-expired email; cleared only conceptually by sent_at success';

CREATE INDEX IF NOT EXISTS idx_profiles_expiry_email_pending
  ON public.profiles (plan_expires_at)
  WHERE plan_expires_at IS NOT NULL AND expiration_email_sent_at IS NULL;

-- Atomic claim helper for payment verification (pending -> processing)
CREATE OR REPLACE FUNCTION public.claim_payment_transaction(
  _transaction_id text,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tx public.payment_transactions%ROWTYPE;
BEGIN
  SELECT * INTO _tx
    FROM public.payment_transactions
   WHERE transaction_id = _transaction_id
     AND user_id = _user_id
   FOR UPDATE;

  IF _tx.transaction_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _tx.payment_status = 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed', 'tx', to_jsonb(_tx));
  END IF;

  IF _tx.payment_status = 'processing' THEN
    -- Another worker holds the claim; reject concurrent verification
    RETURN jsonb_build_object('ok', false, 'reason', 'in_progress', 'tx', to_jsonb(_tx));
  END IF;

  IF _tx.payment_status IS DISTINCT FROM 'pending' AND _tx.payment_status IS DISTINCT FROM 'failed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', _tx.payment_status);
  END IF;

  UPDATE public.payment_transactions
     SET payment_status = 'processing', updated_at = now()
   WHERE transaction_id = _transaction_id
     AND user_id = _user_id
     AND payment_status IN ('pending', 'failed')
   RETURNING * INTO _tx;

  IF _tx.transaction_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'claim_lost');
  END IF;

  RETURN jsonb_build_object('ok', true, 'tx', to_jsonb(_tx));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_payment_transaction(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_transaction(text, uuid) TO service_role;

-- Harden credit application with row lock
CREATE OR REPLACE FUNCTION public.apply_payment_credits(
  _user_id uuid,
  _transaction_id text,
  _credits integer,
  _reason text DEFAULT 'payment'::text
)
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
  SELECT * INTO _tx
    FROM public.payment_transactions
   WHERE transaction_id = _transaction_id
     AND user_id = _user_id
   FOR UPDATE;

  IF _tx.transaction_id IS NULL THEN
    RAISE EXCEPTION 'NO_PAYMENT_TRANSACTION';
  END IF;

  IF _credits IS NULL OR _credits <> _tx.credits_purchased THEN
    RAISE EXCEPTION 'CREDIT_AMOUNT_MISMATCH';
  END IF;

  INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
  VALUES (_user_id, _transaction_id, _tx.credits_purchased, _reason)
  ON CONFLICT (transaction_id) DO NOTHING
  RETURNING id INTO _inserted;

  IF _inserted IS NULL THEN
    -- Ensure status is completed for already-credited txs
    UPDATE public.payment_transactions
       SET payment_status = 'completed', updated_at = now()
     WHERE transaction_id = _transaction_id
       AND payment_status IS DISTINCT FROM 'completed';
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

REVOKE EXECUTE ON FUNCTION public.apply_payment_credits(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_credits(uuid, text, integer, text) TO service_role;
