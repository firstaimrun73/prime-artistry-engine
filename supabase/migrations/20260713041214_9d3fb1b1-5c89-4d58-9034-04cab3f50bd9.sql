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
    40
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
  VALUES (NEW.id, 'FREE-SIGNUP-' || NEW.id, 40, 'free_signup_bonus')
  ON CONFLICT (transaction_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 40)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;