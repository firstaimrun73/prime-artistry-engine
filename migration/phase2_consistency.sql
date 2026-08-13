-- ============================================================================
-- Motio2edit Phase 2 consistency — run in Supabase SQL Editor
-- Safe to re-run. Does not drop data. Does not rename existing plans.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Add `lite` to plan_type enum (idempotent on Postgres 15+)
--    App code and checkout already use plan id "lite". Generated types and
--    migration/schema.sql historically omitted it.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'plan_type'
      AND e.enumlabel = 'lite'
  ) THEN
    ALTER TYPE public.plan_type ADD VALUE 'lite';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Free signup credits: authoritative value = 40 (matches FREE_SIGNUP_CREDITS)
--    Replaces handle_new_user body only. Does not create a second trigger.
--    Existing users are NOT modified.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    40
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
  VALUES (NEW.id, 'FREE-SIGNUP-' || NEW.id, 40, 'free_signup_bonus')
  ON CONFLICT (transaction_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Verify trigger still points at handle_new_user (do not recreate if present).
-- Expected: on_auth_user_created AFTER INSERT ON auth.users

-- ----------------------------------------------------------------------------
-- Optional verification queries (read-only)
-- ----------------------------------------------------------------------------
-- SELECT e.enumlabel FROM pg_enum e
--   JOIN pg_type t ON t.oid = e.enumtypid
--   JOIN pg_namespace n ON n.oid = t.typnamespace
--  WHERE n.nspname = 'public' AND t.typname = 'plan_type'
--  ORDER BY e.enumsortorder;
--
-- SELECT pg_get_functiondef('public.handle_new_user'::regproc);
