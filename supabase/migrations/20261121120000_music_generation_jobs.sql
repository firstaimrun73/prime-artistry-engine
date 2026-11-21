-- Durable Music generation idempotency + reservation tracking.
-- Additive only; does not alter existing credit RPCs or plans.

CREATE TABLE IF NOT EXISTS public.music_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  reservation_tx_id uuid,
  credits_charged integer NOT NULL DEFAULT 0,
  result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT music_generation_jobs_user_key UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS music_generation_jobs_user_created_idx
  ON public.music_generation_jobs (user_id, created_at DESC);

ALTER TABLE public.music_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Clients may read their own job rows (status / cached result). Writes are service_role only.
DROP POLICY IF EXISTS "Users can view own music jobs" ON public.music_generation_jobs;
CREATE POLICY "Users can view own music jobs"
  ON public.music_generation_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.music_generation_jobs TO authenticated;
GRANT ALL ON public.music_generation_jobs TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.music_generation_jobs FROM authenticated, anon;
