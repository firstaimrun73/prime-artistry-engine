-- Christmas Gift Campaign 2026 + seasonal campaign_config
-- HARD RULES: auth.uid() only; Christmas ALWAYS 25 credits / 600 seconds;
-- start/status/claim enforce active + starts_at + ends_at;
-- ledger unique transaction_id; search_path pg_catalog, public.

CREATE TABLE IF NOT EXISTS public.campaign_config (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  label_short text NOT NULL,
  headline text NOT NULL,
  body text NOT NULL,
  reward_credits integer NOT NULL DEFAULT 0 CHECK (reward_credits >= 0),
  session_seconds integer NOT NULL DEFAULT 0 CHECK (session_seconds >= 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  eligible_countries text[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_config_window CHECK (ends_at > starts_at)
);

ALTER TABLE public.campaign_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read campaign_config" ON public.campaign_config;
CREATE POLICY "Authenticated read campaign_config" ON public.campaign_config FOR SELECT TO authenticated USING (active = true);
GRANT SELECT ON public.campaign_config TO authenticated;
GRANT ALL ON public.campaign_config TO service_role;

INSERT INTO public.campaign_config (
  id, display_name, label_short, headline, body,
  reward_credits, session_seconds, starts_at, ends_at, active
) VALUES (
  'christmas-gift-2026',
  'Christmas Gift',
  'Christmas Gift',
  'Stay, Explore & Get Free Credits!',
  'Explore Motio2edit for 10 minutes, then claim 25 credits — enough for one Standard image generation.',
  25, 600,
  '2026-11-20T00:00:00Z',
  '2027-01-07T00:00:00Z',
  true
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  label_short = EXCLUDED.label_short,
  headline = EXCLUDED.headline,
  body = EXCLUDED.body,
  reward_credits = 25,
  session_seconds = 600,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  active = EXCLUDED.active,
  updated_at = now();

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
CREATE INDEX IF NOT EXISTS idx_christmas_sessions_user ON public.christmas_campaign_sessions (user_id);
ALTER TABLE public.christmas_campaign_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own christmas session" ON public.christmas_campaign_sessions;
CREATE POLICY "Users can view own christmas session" ON public.christmas_campaign_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.start_christmas_campaign_session(_campaign_id text DEFAULT 'christmas-gift-2026')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.christmas_campaign_sessions%ROWTYPE;
  _cfg public.campaign_config%ROWTYPE;
  _reward integer; _required integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO _cfg FROM public.campaign_config
   WHERE id = _campaign_id AND active = true AND now() >= starts_at AND now() < ends_at;
  IF _cfg.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_inactive', 'message', 'This campaign is not active right now.');
  END IF;
  IF _campaign_id = 'christmas-gift-2026' THEN _reward := 25; _required := 600;
  ELSE _reward := _cfg.reward_credits; _required := _cfg.session_seconds; END IF;
  INSERT INTO public.christmas_campaign_sessions (user_id, campaign_id, started_at)
  VALUES (_uid, _campaign_id, now()) ON CONFLICT (user_id, campaign_id) DO NOTHING RETURNING * INTO _row;
  IF _row.id IS NULL THEN
    SELECT * INTO _row FROM public.christmas_campaign_sessions WHERE user_id = _uid AND campaign_id = _campaign_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'sessionId', _row.id, 'startedAt', _row.started_at, 'claimedAt', _row.claimed_at,
    'creditsGranted', _row.credits_granted, 'alreadyClaimed', (_row.claimed_at IS NOT NULL),
    'rewardCredits', _reward, 'sessionSeconds', _required);
END; $function$;
REVOKE ALL ON FUNCTION public.start_christmas_campaign_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_christmas_campaign_session(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_christmas_gift_credits(_campaign_id text DEFAULT 'christmas-gift-2026')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.christmas_campaign_sessions%ROWTYPE;
  _cfg public.campaign_config%ROWTYPE;
  _elapsed_seconds numeric; _tx_id text; _inserted uuid; _new_credits integer;
  _reward integer; _required_seconds integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO _cfg FROM public.campaign_config
   WHERE id = _campaign_id AND active = true AND now() >= starts_at AND now() < ends_at;
  IF _cfg.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_inactive', 'message', 'This campaign is not active right now.');
  END IF;
  IF _campaign_id = 'christmas-gift-2026' THEN _reward := 25; _required_seconds := 600;
  ELSE _reward := COALESCE(_cfg.reward_credits, 0); _required_seconds := COALESCE(_cfg.session_seconds, 0); END IF;
  IF _reward <= 0 OR _required_seconds <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'campaign_misconfigured', 'message', 'Campaign reward is not available.');
  END IF;
  SELECT * INTO _row FROM public.christmas_campaign_sessions
   WHERE user_id = _uid AND campaign_id = _campaign_id FOR UPDATE;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_session', 'message', 'Start the campaign first.');
  END IF;
  IF _row.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed', 'message', 'You already claimed this gift.',
      'creditsGranted', _row.credits_granted, 'claimedAt', _row.claimed_at);
  END IF;
  _elapsed_seconds := EXTRACT(EPOCH FROM (now() - _row.started_at));
  IF _elapsed_seconds < _required_seconds THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_early',
      'message', format('Keep exploring for %s more seconds.', ceil(_required_seconds - _elapsed_seconds)::int),
      'elapsedSeconds', floor(_elapsed_seconds)::int, 'requiredSeconds', _required_seconds,
      'remainingSeconds', ceil(_required_seconds - _elapsed_seconds)::int);
  END IF;
  _tx_id := 'CAMPAIGN-' || _campaign_id || '-' || _uid::text;
  INSERT INTO public.credit_ledger (user_id, transaction_id, credits_added, reason)
  VALUES (_uid, _tx_id, _reward, 'campaign_' || _campaign_id)
  ON CONFLICT (transaction_id) DO NOTHING RETURNING id INTO _inserted;
  IF _inserted IS NULL THEN
    UPDATE public.christmas_campaign_sessions SET claimed_at = COALESCE(claimed_at, now()),
      credits_granted = COALESCE(credits_granted, _reward), updated_at = now() WHERE id = _row.id;
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed', 'message', 'You already claimed this gift.', 'creditsGranted', _reward);
  END IF;
  UPDATE public.profiles SET credits = credits + _reward, updated_at = now()
   WHERE id = _uid RETURNING credits INTO _new_credits;
  IF _new_credits IS NULL THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
  UPDATE public.christmas_campaign_sessions SET claimed_at = now(), credits_granted = _reward, updated_at = now() WHERE id = _row.id;
  RETURN jsonb_build_object('ok', true, 'creditsGranted', _reward, 'newBalance', _new_credits,
    'message', format('%s credits added to your account.', _reward));
END; $function$;
REVOKE ALL ON FUNCTION public.claim_christmas_gift_credits(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_christmas_gift_credits(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_christmas_campaign_status(_campaign_id text DEFAULT 'christmas-gift-2026')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public' AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.christmas_campaign_sessions%ROWTYPE;
  _cfg public.campaign_config%ROWTYPE;
  _elapsed integer; _required integer; _reward integer; _window_active boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'auth_required'); END IF;
  SELECT * INTO _cfg FROM public.campaign_config WHERE id = _campaign_id;
  _window_active := (_cfg.id IS NOT NULL AND _cfg.active = true AND now() >= _cfg.starts_at AND now() < _cfg.ends_at);
  IF _campaign_id = 'christmas-gift-2026' THEN _required := 600; _reward := 25;
  ELSE _required := COALESCE(_cfg.session_seconds, 0); _reward := COALESCE(_cfg.reward_credits, 0); END IF;
  SELECT * INTO _row FROM public.christmas_campaign_sessions WHERE user_id = _uid AND campaign_id = _campaign_id;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'hasSession', false, 'claimed', false, 'campaignActive', _window_active,
      'rewardCredits', _reward, 'sessionSeconds', _required);
  END IF;
  _elapsed := floor(EXTRACT(EPOCH FROM (now() - _row.started_at)))::int;
  RETURN jsonb_build_object('ok', true, 'hasSession', true, 'startedAt', _row.started_at,
    'claimed', (_row.claimed_at IS NOT NULL), 'claimedAt', _row.claimed_at, 'creditsGranted', _row.credits_granted,
    'elapsedSeconds', _elapsed, 'requiredSeconds', _required, 'remainingSeconds', GREATEST(0, _required - _elapsed),
    'eligible', (_row.claimed_at IS NULL AND _elapsed >= _required AND _window_active),
    'rewardCredits', _reward, 'campaignActive', _window_active);
END; $function$;
REVOKE ALL ON FUNCTION public.get_christmas_campaign_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_christmas_campaign_status(text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.start_christmas_campaign_session(uuid, text);
DROP FUNCTION IF EXISTS public.claim_christmas_gift_credits(uuid, text);
DROP FUNCTION IF EXISTS public.get_christmas_campaign_status(uuid, text);
