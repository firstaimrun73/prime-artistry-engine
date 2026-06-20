-- =========================================================
-- user_credits table
-- =========================================================
CREATE TABLE public.user_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON public.user_credits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.user_credits FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- generation_history table
-- =========================================================
CREATE TABLE public.generation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  prompt text,
  input_path text,
  output_path text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_history TO authenticated;
GRANT ALL ON public.generation_history TO service_role;

ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own generation history"
  ON public.generation_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_generation_history_user ON public.generation_history (user_id, created_at DESC);

-- =========================================================
-- Seed user_credits for new users + backfill existing
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 50)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

INSERT INTO public.user_credits (user_id, credits)
SELECT id, credits FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================
-- Storage policies for private "uploads" bucket (per-user folder)
-- =========================================================
CREATE POLICY "Users can read own uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================================================
-- Storage policies for private "outputs" bucket (per-user folder)
-- =========================================================
CREATE POLICY "Users can read own outputs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own outputs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own outputs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own outputs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);