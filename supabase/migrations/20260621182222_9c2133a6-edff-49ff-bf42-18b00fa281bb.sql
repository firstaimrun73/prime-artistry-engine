-- payments: remove user self-insert
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;

-- subscriptions: restrict to SELECT only
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- usage_tracking: remove user self-insert
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking;
REVOKE INSERT, UPDATE, DELETE ON public.usage_tracking FROM authenticated;

-- user_credits: ensure users cannot write their balance
REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM authenticated;