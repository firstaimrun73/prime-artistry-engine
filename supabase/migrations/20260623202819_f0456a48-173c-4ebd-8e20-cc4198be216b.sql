-- Fix 1: Prevent self-escalation of plan/credits on profiles.
-- Remove broad column UPDATE privileges and grant UPDATE only on safe, user-editable columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Fix 2: Lock down user_credits writes to trusted backend (service_role) only.
REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM anon;
GRANT ALL ON public.user_credits TO service_role;