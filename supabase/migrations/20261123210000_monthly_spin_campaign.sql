-- Monthly Credit Spin — one claim per user per UTC calendar month
-- Winner policy (enforced in server functions, not only SQL):
--   - At most 1 winner per prize level per 100,000 spins in the period
--   - Zero-credit outcomes are valid and common
--   - No guaranteed 25-credit consolation
-- Apply only after preflight on the verified production project.

CREATE TABLE IF NOT EXISTS public.monthly_spin_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  campaign_id text NOT NULL DEFAULT 'monthly-spin-v1',
  prize_id text NOT NULL,
  credits_won integer NOT NULL DEFAULT 0 CHECK (credits_won >= 0 AND credits_won <= 1000),
  transaction_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_key),
  UNIQUE (transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_spin_period ON public.monthly_spin_claims (period_key);
CREATE INDEX IF NOT EXISTS idx_monthly_spin_user ON public.monthly_spin_claims (user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_spin_period_prize ON public.monthly_spin_claims (period_key, prize_id);

ALTER TABLE public.monthly_spin_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own monthly spin" ON public.monthly_spin_claims;
CREATE POLICY "Users read own monthly spin"
  ON public.monthly_spin_claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.monthly_spin_claims FROM authenticated, anon;
GRANT SELECT ON public.monthly_spin_claims TO authenticated;
GRANT ALL ON public.monthly_spin_claims TO service_role;
