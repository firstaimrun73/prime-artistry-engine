-- Motio2edit History pipeline completion (additive, safe, idempotent)
-- Aligns DB with history-persist.server.ts + history-retention.ts + History UI.
-- Apply via Supabase SQL editor or: supabase db push

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS retained_as_history boolean NOT NULL DEFAULT true;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS history_deleted_at timestamptz;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS storage_provider text;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS r2_object_key text;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS thumbnail_key text;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT true;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.generations.retained_as_history IS
  'False when History Save was off or user removed item from History.';
COMMENT ON COLUMN public.generations.deleted_at IS
  'When set, item is hidden from History UI; generation row may remain for job tracking.';

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS history_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS sensitive_mode boolean NOT NULL DEFAULT false;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS retained_as_history boolean NOT NULL DEFAULT true;

ALTER TABLE public.music_history
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS generations_user_retained_created_idx
  ON public.generations (user_id, retained_as_history, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS generations_user_status_created_idx
  ON public.generations (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS music_history_user_retained_created_idx
  ON public.music_history (user_id, retained_as_history, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.history_media_deletion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.generations(id) ON DELETE SET NULL,
  music_track_id uuid REFERENCES public.music_history(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_provider text,
  object_key text,
  output_url text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS history_media_deletion_queue_status_idx
  ON public.history_media_deletion_queue (status, created_at);

ALTER TABLE public.history_media_deletion_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.should_retain_as_history(
  p_user_id uuid,
  p_is_private boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean := true;
  v_sensitive boolean := false;
  v_plan text := 'free';
  v_email text := null;
BEGIN
  SELECT email, plan::text INTO v_email, v_plan
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT
    coalesce(history_enabled, true),
    coalesce(sensitive_mode, false)
  INTO v_enabled, v_sensitive
  FROM public.user_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_enabled := true;
    v_sensitive := false;
  END IF;

  IF v_enabled IS FALSE THEN
    RETURN jsonb_build_object('retain', false, 'storage_provider', null);
  END IF;

  IF v_sensitive IS TRUE AND p_is_private IS TRUE THEN
    RETURN jsonb_build_object('retain', true, 'storage_provider', 'blob');
  END IF;

  IF v_plan = 'free' THEN
    RETURN jsonb_build_object('retain', true, 'storage_provider', 'blob');
  END IF;

  RETURN jsonb_build_object('retain', true, 'storage_provider', 'r2');
END;
$$;

GRANT EXECUTE ON FUNCTION public.should_retain_as_history(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.history_user_delete(p_generation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.generations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.generations
  WHERE id = p_generation_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Generation not found';
  END IF;

  UPDATE public.generations
  SET
    retained_as_history = false,
    deleted_at = now(),
    history_deleted_at = now()
  WHERE id = p_generation_id AND user_id = v_uid;

  INSERT INTO public.history_media_deletion_queue (
    generation_id, user_id, storage_provider, object_key, output_url, status
  ) VALUES (
    p_generation_id,
    v_uid,
    v_row.storage_provider,
    v_row.r2_object_key,
    v_row.output_url,
    'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.history_user_delete(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.music_history_user_delete(p_track_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.music_history%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.music_history
  WHERE id = p_track_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Track not found';
  END IF;

  UPDATE public.music_history
  SET retained_as_history = false, deleted_at = now()
  WHERE id = p_track_id AND user_id = v_uid;

  INSERT INTO public.history_media_deletion_queue (
    music_track_id, user_id, output_url, status
  ) VALUES (
    p_track_id, v_uid, v_row.audio_url, 'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.music_history_user_delete(uuid) TO authenticated, service_role;

UPDATE public.generations
SET retained_as_history = true
WHERE retained_as_history IS DISTINCT FROM true
  AND status = 'success'
  AND output_url IS NOT NULL
  AND deleted_at IS NULL;

UPDATE public.music_history
SET retained_as_history = true
WHERE retained_as_history IS DISTINCT FROM true
  AND deleted_at IS NULL
  AND audio_url IS NOT NULL;
