-- Permanent Maluto AI analysis records (structured stages).
-- Additive; does not train models or store image blobs (URLs only).

CREATE TABLE IF NOT EXISTS public.maluto_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_url text,
  output_url text,
  stage1 jsonb,
  stage2 jsonb,
  stage3 jsonb,
  restoration_prompt text,
  confidence real,
  quality text,
  credits_charged integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'complete',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maluto_analyses_user_created_idx
  ON public.maluto_analyses (user_id, created_at DESC);

ALTER TABLE public.maluto_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own maluto analyses" ON public.maluto_analyses;
CREATE POLICY "Users can view own maluto analyses"
  ON public.maluto_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.maluto_analyses TO authenticated;
GRANT ALL ON public.maluto_analyses TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.maluto_analyses FROM authenticated, anon;
