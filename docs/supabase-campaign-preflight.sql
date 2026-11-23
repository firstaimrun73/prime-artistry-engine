-- PREFLIGHT READ ONLY — run on VERIFIED production project matching Vercel SUPABASE_URL
SELECT current_database(), current_user, now();
SELECT table_name FROM information_schema.tables WHERE table_schema='public'
  AND (table_name ILIKE '%campaign%' OR table_name ILIKE '%christmas%'
       OR table_name IN ('credit_ledger','profiles'));
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name='credit_ledger';
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.credit_ledger'::regclass;
SELECT p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND (p.proname ILIKE '%christmas%' OR p.proname ILIKE '%campaign%'
  OR p.proname IN ('deduct_credits','apply_payment_credits'));
