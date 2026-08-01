CREATE TABLE public.music_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_title text NOT NULL,
  prompt text,
  genre text,
  mood text,
  bpm integer,
  duration integer,
  audio_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_history TO authenticated;
GRANT ALL ON public.music_history TO service_role;

ALTER TABLE public.music_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own music history"
ON public.music_history FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX music_history_user_created_idx ON public.music_history (user_id, created_at DESC);

CREATE TRIGGER update_music_history_updated_at
BEFORE UPDATE ON public.music_history
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();