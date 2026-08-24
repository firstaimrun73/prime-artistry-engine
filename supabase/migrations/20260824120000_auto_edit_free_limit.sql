-- Auto Edit: free-plan one-time usage counter (server-enforced).
-- Master Studio internal plan id remains "business".

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_edit_used_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.auto_edit_used_count IS
  'Successful Auto Edit jobs completed while on free plan. Free users are limited to 1.';

-- Optional index for admin analytics (lightweight).
CREATE INDEX IF NOT EXISTS idx_profiles_auto_edit_used
  ON public.profiles (auto_edit_used_count)
  WHERE plan = 'free' AND auto_edit_used_count > 0;
