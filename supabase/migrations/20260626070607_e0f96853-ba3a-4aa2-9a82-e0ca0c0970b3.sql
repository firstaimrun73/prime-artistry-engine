CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  category TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL,
  screenshot_url TEXT,
  page_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
GRANT SELECT ON public.feedback TO anon;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Public testimonials: anyone may read only high-rated entries.
CREATE POLICY "Public can read high-rated feedback"
ON public.feedback FOR SELECT
TO anon, authenticated
USING (rating >= 4);

CREATE INDEX idx_feedback_rating_created ON public.feedback (rating, created_at DESC);
CREATE INDEX idx_feedback_user_created ON public.feedback (user_id, created_at DESC);