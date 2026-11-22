-- =============================================================================
-- PREFLIGHT — READ ONLY
-- Run in Supabase SQL Editor against the VERIFIED production project
-- (must match Vercel SUPABASE_URL project ref — do not assume from docs).
-- =============================================================================

SELECT current_database() AS database,
       current_user AS role,
       now() AS server_now_utc;

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%campaign%'
    OR table_name ILIKE '%christmas%'
    OR table_name IN ('credit_ledger', 'profiles', 'credit_transactions', 'credit_audit_log')
  )
ORDER BY table_name;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'campaign_config'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'christmas_campaign_sessions'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'credit_ledger'
ORDER BY ordinal_position;

SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.credit_ledger'::regclass;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('id', 'credits', 'plan', 'updated_at');

SELECT n.nspname AS schema,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       p.proconfig AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%christmas%'
    OR p.proname ILIKE '%campaign%'
    OR p.proname IN ('deduct_credits', 'apply_payment_credits', 'refund_credits')
  )
ORDER BY p.proname;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'campaign_config',
    'christmas_campaign_sessions',
    'credit_ledger',
    'profiles'
  );

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('campaign_config', 'christmas_campaign_sessions', 'credit_ledger', 'profiles')
ORDER BY tablename, policyname;

SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'start_christmas_campaign_session',
    'get_christmas_campaign_status',
    'claim_christmas_gift_credits'
  )
ORDER BY routine_name, grantee;

SELECT id, reward_credits, session_seconds, starts_at, ends_at, active
FROM public.campaign_config
WHERE id = 'christmas-gift-2026';

SELECT COUNT(*) AS session_rows
FROM public.christmas_campaign_sessions;
