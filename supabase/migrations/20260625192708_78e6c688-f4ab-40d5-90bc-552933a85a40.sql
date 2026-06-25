-- FIX 1: Grant a fixed, one-time 60-credit signup bonus securely (server-side, idempotent).

-- The credit_ledger FK to payment_transactions blocks non-payment grants (e.g. signup bonus).
-- Remove the FK but KEEP the unique constraint on transaction_id (idempotency guard).
ALTER TABLE public.credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_transaction_id_fkey;

-- Recreate the new-user handler so each new account gets the profile + 60 credits + an
-- idempotent ledger entry. Unique transaction_id ('FREE-SIGNUP-<uid>') prevents double grants.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    60
  )
  ON CONFLICT (id) DO NOTHING;

  -- One-time signup bonus ledger entry (idempotent via unique transaction_id).
  INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
  VALUES (NEW.id, 'FREE-SIGNUP-' || NEW.id, 60, 'free_signup_bonus')
  ON CONFLICT (transaction_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Keep the credits mirror table in sync (also 60 on signup).
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 60)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- FIX 1.6: Backfill existing users who have 0 credits and never received a signup bonus.
INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
SELECT p.id, 'FREE-SIGNUP-' || p.id, 60, 'free_signup_bonus'
FROM public.profiles p
WHERE p.credits = 0
  AND NOT EXISTS (
    SELECT 1 FROM public.credit_ledger cl
    WHERE cl.user_id = p.id AND cl.reason = 'free_signup_bonus'
  )
ON CONFLICT (transaction_id) DO NOTHING;

UPDATE public.profiles p
SET credits = 60, updated_at = now()
WHERE p.credits = 0
  AND EXISTS (
    SELECT 1 FROM public.credit_ledger cl
    WHERE cl.user_id = p.id AND cl.reason = 'free_signup_bonus'
  );

UPDATE public.user_credits uc
SET credits = 60, updated_at = now()
WHERE uc.credits = 0
  AND EXISTS (
    SELECT 1 FROM public.credit_ledger cl
    WHERE cl.user_id = uc.user_id AND cl.reason = 'free_signup_bonus'
  );