-- Access Assistance: revoke audit columns + protect complimentary profile fields.

ALTER TABLE public.free_access_applications
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS revoked_by uuid NULL;

-- Defense-in-depth: clients must not change complimentary entitlements.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.credits IS DISTINCT FROM OLD.credits
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.complimentary_expires_at IS DISTINCT FROM OLD.complimentary_expires_at
     OR NEW.complimentary_tools IS DISTINCT FROM OLD.complimentary_tools THEN
    RAISE EXCEPTION 'Updating sensitive profile fields is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;
