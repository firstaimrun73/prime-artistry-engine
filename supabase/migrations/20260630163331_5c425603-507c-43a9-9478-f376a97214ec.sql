-- 1) profiles: ensure column-scoped UPDATE only (idempotent)
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

-- 2) feedback: owner-scoped SELECT only; no public access
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
GRANT SELECT ON public.feedback TO authenticated;
REVOKE ALL ON public.feedback FROM anon;

-- 3) webhook_events: explicit deny-all for client roles (service_role bypasses RLS)
DROP POLICY IF EXISTS "No client access to webhook events" ON public.webhook_events;
CREATE POLICY "No client access to webhook events"
  ON public.webhook_events FOR ALL
  TO authenticated, anon
  USING (false) WITH CHECK (false);
REVOKE ALL ON public.webhook_events FROM authenticated, anon;

-- 4) SECURITY DEFINER credit functions: revoke from signed-in users, run via service_role only
DROP FUNCTION IF EXISTS public.deduct_credits(integer, text);
DROP FUNCTION IF EXISTS public.refund_credits(uuid);

CREATE OR REPLACE FUNCTION public.deduct_credits(_amount integer, _gen_type text, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := _user_id;
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
$function$;

CREATE OR REPLACE FUNCTION public.refund_credits(_transaction_id uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := _user_id;
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
$function$;

REVOKE ALL ON FUNCTION public.deduct_credits(integer, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credits(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(integer, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, uuid) TO service_role;