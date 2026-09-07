-- Auto Edit and generateMedia insert a metadata JSON object.
-- Original generations table had no metadata column → inserts failed silently
-- (error only console.error'd), so successful jobs never appeared in History.

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.generations.metadata IS
  'Optional job metadata (experience, quality, credits_charged, circle_operation, etc.)';
