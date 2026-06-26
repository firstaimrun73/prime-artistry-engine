-- 1. feedback: remove public/anon readability of user_email & user_name
DROP POLICY IF EXISTS "Public can read high-rated feedback" ON public.feedback;
REVOKE SELECT ON public.feedback FROM anon;

-- 2. profiles: restrict updatable columns to display_name and avatar_url only
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

-- 3. credit_audit_log: allow users to read their own records
GRANT SELECT ON public.credit_audit_log TO authenticated;
DROP POLICY IF EXISTS "Users can view own credit audit log" ON public.credit_audit_log;
CREATE POLICY "Users can view own credit audit log"
  ON public.credit_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. payment_attempts: allow users to read their own records
GRANT SELECT ON public.payment_attempts TO authenticated;
DROP POLICY IF EXISTS "Users can view own payment attempts" ON public.payment_attempts;
CREATE POLICY "Users can view own payment attempts"
  ON public.payment_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. webhook_events: ensure no client access (service_role only)
REVOKE ALL ON public.webhook_events FROM anon, authenticated;

-- 6. Revoke EXECUTE on sensitive SECURITY DEFINER functions from client roles
REVOKE EXECUTE ON FUNCTION public.apply_payment_credits(uuid, text, integer, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_credits() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;