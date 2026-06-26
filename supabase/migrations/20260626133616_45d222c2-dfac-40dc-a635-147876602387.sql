-- ============================================================
-- 1. Function search_path (SUPA_function_search_path_mutable)
--    Set a fixed search_path on the email-queue helpers.
-- ============================================================
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;

-- ============================================================
-- 2. Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated
--    (SUPA_anon_* and SUPA_authenticated_security_definer_function_executable)
--    Keep deduct_credits/refund_credits callable by authenticated users.
-- ============================================================

-- Trigger / backend-only functions: no client execute needed.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;

-- Payment crediting: service_role only.
REVOKE EXECUTE ON FUNCTION public.apply_payment_credits(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_credits(uuid, text, integer, text) TO service_role;

-- Email queue helpers: service_role / cron only.
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;

-- Credit deduct/refund: required by authenticated users (act as auth.uid()).
REVOKE EXECUTE ON FUNCTION public.deduct_credits(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refund_credits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_credits(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid) TO authenticated, service_role;

-- ============================================================
-- 3. feedback & webhook_events: keep locked to service_role only
--    (feedback_no_select_policy, webhook_events_no_user_policy)
--    RLS enabled + no client grants + no client policies = fail-closed.
-- ============================================================
REVOKE ALL ON TABLE public.feedback FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;
GRANT ALL ON TABLE public.webhook_events TO service_role;

-- ============================================================
-- 4. profiles: prevent privilege escalation via sensitive columns
--    (profiles_unrestricted_update)
--    Defense-in-depth trigger blocks changes to credits/plan/currency/email
--    by anyone other than service_role, regardless of column grants.
-- ============================================================

-- Re-assert column-level UPDATE grants (non-sensitive columns only).
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow privileged/service contexts to change anything.
  IF current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.credits IS DISTINCT FROM OLD.credits
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Updating sensitive profile fields is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();