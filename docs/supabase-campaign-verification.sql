-- VERIFICATION after migration
SELECT id, reward_credits, session_seconds,
  (reward_credits=25 AND session_seconds=600) AS ok
FROM public.campaign_config WHERE id='christmas-gift-2026';
SELECT p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'start_christmas_campaign_session','get_christmas_campaign_status','claim_christmas_gift_credits');
SELECT routine_name, grantee FROM information_schema.routine_privileges
WHERE routine_schema='public' AND routine_name LIKE '%christmas%';
