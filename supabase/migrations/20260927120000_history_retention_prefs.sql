-- REQUIRES SUPABASE APPLY (not applied by GitHub-only deploy)
-- History Save preference + soft-retention scaffolding for Motio2edit.
--
-- Apply in Supabase SQL editor or via supabase db push after review.
-- GitHub TypeScript already reads these columns when present and falls back safely when absent.

-- 1) Preference columns on user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS history_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS sensitive_mode boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_settings.history_enabled IS
  'When false, successful generations must not be retained as History media.';
COMMENT ON COLUMN public.user_settings.sensitive_mode IS
  'When true, treat request as private — do not retain as normal History.';

-- 2) Optional explicit retention flags on generations (preferred over metadata-only)
-- Soft-hide currently uses generations.metadata.history_hidden in app code.
-- These columns enable stronger server-side retention/storage routing later.
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS retained_as_history boolean NOT NULL DEFAULT true;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS history_deleted_at timestamptz;

COMMENT ON COLUMN public.generations.retained_as_history IS
  'False when user removed item from History or History Save was off at completion.';
COMMENT ON COLUMN public.generations.history_deleted_at IS
  'When set, item is hidden from History UI; generation/job row may remain.';

-- 3) Index for History list queries
CREATE INDEX IF NOT EXISTS generations_user_retained_created_idx
  ON public.generations (user_id, retained_as_history, created_at DESC);

-- NOTE (storage / retention policy — NOT created here):
-- - Free private media: Vercel Blob store motio2edit-user-history
-- - Paid private media: Cloudflare R2 bucket motio2edit-user-media
-- - Public samples: R2 bucket motio2edit-media
-- - Free retention ~6 hours; paid plan-configurable; inactive paid cleanup after 30 days
-- Implement upload routing + cleanup cron in server code + env:
--   CLOUDFLARE_ACCOUNT_ID
--   CLOUDFLARE_R2_USER_ACCESS_KEY_ID
--   CLOUDFLARE_R2_USER_SECRET_ACCESS_KEY
--   CLOUDFLARE_R2_USER_BUCKET_NAME
-- Never expose R2 secrets as NEXT_PUBLIC_*.
