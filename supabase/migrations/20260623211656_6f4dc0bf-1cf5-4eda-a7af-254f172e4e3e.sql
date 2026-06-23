-- 1) profiles: ensure authenticated cannot update privileged columns (credits/plan/currency/email)
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) user_credits: no direct client writes; only service_role / SECURITY DEFINER paths
REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM anon;
GRANT ALL ON public.user_credits TO service_role;

-- 3) SECURITY DEFINER functions: revoke broad EXECUTE, grant only where needed.
-- Trigger functions must NOT be directly callable by clients.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Credit RPCs are called by the signed-in user (scoped internally via auth.uid()).
-- Remove the implicit PUBLIC/anon grant and grant EXECUTE only to authenticated + service_role.
REVOKE ALL ON FUNCTION public.deduct_credits(integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refund_credits(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_plan_credits(plan_type, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_credits(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_plan_credits(plan_type, integer, text) TO authenticated, service_role;