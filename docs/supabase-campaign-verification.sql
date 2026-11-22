-- VERIFICATION — READ ONLY (after production migration)

SELECT to_regclass('public.campaign_config') AS campaign_config,
       to_regclass('public.christmas_campaign_sessions') AS sessions;

SELECT id, reward_credits, session_seconds, active,
       starts_at, ends_at,
       (reward_credits = 25 AND session_seconds = 600) AS christmas_hard_values_ok
FROM public.campaign_config
WHERE id = 'christmas-gift-2026';

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.christmas_campaign_sessions'::regclass
  AND contype = 'u';

SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('campaign_config', 'christmas_campaign_sessions');

SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'start_christmas_campaign_session',
    'get_christmas_campaign_status',
    'claim_christmas_gift_credits'
  )
ORDER BY p.proname;

SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'start_christmas_campaign_session',
    'get_christmas_campaign_status',
    'claim_christmas_gift_credits'
  )
ORDER BY routine_name, grantee;

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'start_christmas_campaign_session',
    'get_christmas_campaign_status',
    'claim_christmas_gift_credits'
  )
  AND pg_get_function_identity_arguments(p.oid) ILIKE '%uuid%';

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.credit_ledger'::regclass
  AND contype IN ('u', 'p');
