-- Christmas Gift Campaign 2026: server-verified 10-min session + one-time 25 credits
-- Separate from sponsor-unlock (watermark) and from payment top-ups.
-- Idempotent via unique (user_id, campaign_id) and credit_ledger.transaction_id.

CREATE TABLE IF NOT EXISTS public.christmas_campaign_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id text NOT NULL DEFAULT 'christmas-gift-2026',
  started_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  credits_granted integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_christmas_sessions_user
  ON public.christmas_campaign_sessions (user_id);

ALTER TABLE public.christmas_campaign_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own session (for timer UI); writes only via SECURITY DEFINER RPCs.
CREATE POLICY "Users can view own christmas session"
  ON public.christmas_campaign_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Atomic start: insert or return existing session start time.
CREATE OR REPLACE FUNCTION public.start_christmas_campaign_session(
  _user_id uuid,
  _campaign_id text DEFAULT 'christmas-gift-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.christmas_campaign_sessions%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  INSERT INTO public.christmas_campaign_sessions (user_id, campaign_id, started_at)
  VALUES (_user_id, _campaign_id, now())
  ON CONFLICT (user_id, campaign_id) DO NOTHING
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    SELECT * INTO _row
      FROM public.christmas_campaign_sessions
     WHERE user_id = _user_id AND campaign_id = _campaign_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'sessionId', _row.id,
    'startedAt', _row.started_at,
    'claimedAt', _row.claimed_at,
    'creditsGranted', _row.credits_granted,
    'alreadyClaimed', (_row.claimed_at IS NOT NULL)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.start_christmas_campaign_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_christmas_campaign_session(uuid, text) TO authenticated, service_role;

-- Claim after >= 10 minutes; grants exactly 25 credits once.
CREATE OR REPLACE FUNCTION public.claim_christmas_gift_credits(
  _user_id uuid,
  _campaign_id text DEFAULT 'christmas-gift-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.christmas_campaign_sessions%ROWTYPE;
  _elapsed_seconds numeric;
  _tx_id text;
  _inserted uuid;
  _new_credits integer;
  _required_seconds integer := 600; -- 10 minutes
  _reward integer := 25;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO _row
    FROM public.christmas_campaign_sessions
   WHERE user_id = _user_id AND campaign_id = _campaign_id
   FOR UPDATE;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_session', 'message', 'Start the campaign first.');
  END IF;

  IF _row.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'already_claimed',
      'message', 'You already claimed this Christmas gift.',
      'creditsGranted', _row.credits_granted,
      'claimedAt', _row.claimed_at
    );
  END IF;

  _elapsed_seconds := EXTRACT(EPOCH FROM (now() - _row.started_at));
  IF _elapsed_seconds < _required_seconds THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'too_early',
      'message', format('Keep exploring for %s more seconds.', ceil(_required_seconds - _elapsed_seconds)::int),
      'elapsedSeconds', floor(_elapsed_seconds)::int,
      'requiredSeconds', _required_seconds,
      'remainingSeconds', ceil(_required_seconds - _elapsed_seconds)::int
    );
  END IF;

  -- Unique ledger key prevents multi-tab / retry double grants
  _tx_id := 'CHRISTMAS-GIFT-2026-' || _user_id::text;

  INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
  VALUES (_user_id, _tx_id, _reward, 'christmas_gift_2026')
  ON CONFLICT (transaction_id) DO NOTHING
  RETURNING id INTO _inserted;

  IF _inserted IS NULL THEN
    -- Ledger already has the row; mark session claimed if not yet
    UPDATE public.christmas_campaign_sessions
       SET claimed_at = COALESCE(claimed_at, now()),
           credits_granted = COALESCE(credits_granted, _reward),
           updated_at = now()
     WHERE id = _row.id;
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'already_claimed',
      'message', 'You already claimed this Christmas gift.',
      'creditsGranted', _reward
    );
  END IF;

  UPDATE public.profiles
     SET credits = credits + _reward, updated_at = now()
   WHERE id = _user_id
   RETURNING credits INTO _new_credits;

  UPDATE public.christmas_campaign_sessions
     SET claimed_at = now(),
         credits_granted = _reward,
         updated_at = now()
   WHERE id = _row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'creditsGranted', _reward,
    'newBalance', _new_credits,
    'message', 'Merry Christmas! 25 credits added to your account.'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_christmas_gift_credits(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_christmas_gift_credits(uuid, text) TO authenticated, service_role;

-- Status helper for UI timer (no side effects)
CREATE OR REPLACE FUNCTION public.get_christmas_campaign_status(
  _user_id uuid,
  _campaign_id text DEFAULT 'christmas-gift-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.christmas_campaign_sessions%ROWTYPE;
  _elapsed integer;
  _required integer := 600;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'auth_required');
  END IF;

  SELECT * INTO _row
    FROM public.christmas_campaign_sessions
   WHERE user_id = _user_id AND campaign_id = _campaign_id;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'hasSession', false, 'claimed', false);
  END IF;

  _elapsed := floor(EXTRACT(EPOCH FROM (now() - _row.started_at)))::int;

  RETURN jsonb_build_object(
    'ok', true,
    'hasSession', true,
    'startedAt', _row.started_at,
    'claimed', (_row.claimed_at IS NOT NULL),
    'claimedAt', _row.claimed_at,
    'creditsGranted', _row.credits_granted,
    'elapsedSeconds', _elapsed,
    'requiredSeconds', _required,
    'remainingSeconds', GREATEST(0, _required - _elapsed),
    'eligible', (_row.claimed_at IS NULL AND _elapsed >= _required)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_christmas_campaign_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_christmas_campaign_status(uuid, text) TO authenticated, service_role;
