
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('debit', 'refund', 'purchase', 'signup')),
  generation_type text,
  balance_after integer NOT NULL,
  refunded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit transactions"
ON public.credit_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_credit_transactions_user ON public.credit_transactions (user_id, created_at DESC);

-- Atomically charge the signed-in user. Prevents negative balances and
-- duplicate/oversized deductions. Returns { transaction_id, credits }.
CREATE OR REPLACE FUNCTION public.deduct_credits(_amount integer, _gen_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new integer;
  _tx uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  UPDATE public.profiles
     SET credits = credits - _amount, updated_at = now()
   WHERE id = _uid AND credits >= _amount
   RETURNING credits INTO _new;

  IF _new IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, kind, generation_type, balance_after)
  VALUES (_uid, -_amount, 'debit', _gen_type, _new)
  RETURNING id INTO _tx;

  RETURN jsonb_build_object('transaction_id', _tx, 'credits', _new);
END;
$$;

-- Refund a specific prior debit owned by the signed-in user, exactly once.
CREATE OR REPLACE FUNCTION public.refund_credits(_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _amount integer;
  _gen_type text;
  _new integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  UPDATE public.credit_transactions
     SET refunded = true
   WHERE id = _transaction_id
     AND user_id = _uid
     AND kind = 'debit'
     AND refunded = false
   RETURNING -amount, generation_type INTO _amount, _gen_type;

  IF _amount IS NULL THEN
    -- Nothing to refund (already refunded or not found). Idempotent no-op.
    RETURN jsonb_build_object('refunded', false);
  END IF;

  UPDATE public.profiles
     SET credits = credits + _amount, updated_at = now()
   WHERE id = _uid
   RETURNING credits INTO _new;

  INSERT INTO public.credit_transactions (user_id, amount, kind, generation_type, balance_after)
  VALUES (_uid, _amount, 'refund', _gen_type, _new);

  RETURN jsonb_build_object('refunded', true, 'credits', _new);
END;
$$;

-- Backend-only plan/credit assignment for checkout.
CREATE OR REPLACE FUNCTION public.set_plan_credits(_plan plan_type, _credits integer, _currency text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  UPDATE public.profiles
     SET plan = _plan, credits = _credits, currency = _currency, updated_at = now()
   WHERE id = _uid
   RETURNING credits INTO _new;

  INSERT INTO public.credit_transactions (user_id, amount, kind, generation_type, balance_after)
  VALUES (_uid, _credits, 'purchase', NULL, _new);

  RETURN _new;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_credits(integer, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.refund_credits(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_plan_credits(plan_type, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.deduct_credits(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_plan_credits(plan_type, integer, text) TO authenticated;
