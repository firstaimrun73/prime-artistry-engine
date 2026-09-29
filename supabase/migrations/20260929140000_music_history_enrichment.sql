-- Music History enrichment for professional Music Studio pipeline
-- Additive, idempotent — does not break existing rows.

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS generation_id uuid REFERENCES public.generations(id) ON DELETE SET NULL;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS mode text;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS quality_tier text;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS model_id text;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS credits_charged integer;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS provider_cost_usd numeric;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS source_type text;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS original_audio_removed boolean;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS storage_provider text;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS object_key text;

CREATE INDEX IF NOT EXISTS music_history_generation_id_idx
  ON public.music_history (generation_id)
  WHERE generation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS music_history_user_mode_created_idx
  ON public.music_history (user_id, mode, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.music_history.generation_id IS
  'Links music_history row to generations.id for the same successful job.';
COMMENT ON COLUMN public.music_history.original_audio_removed IS
  'True when Video→Music used replace mode and final media has new soundtrack only.';
